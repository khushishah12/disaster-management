"use client";

import { useState } from "react";

import { classifyRisk, computeRiskScores } from "@/lib/ai-intelligence/scoring";
import type { RiskClassification } from "@/lib/ai-intelligence/types";
import { useWeather } from "@/lib/hooks/use-weather";
import { useFacilities } from "@/lib/hooks/use-facilities";
import { useDisasterStore } from "@/lib/store/disasterStore";

type RiskItem = {
  key: string;
  label: string;
  value: number;
};

type AnalysisResult = {
  floodRisk: number;
  hospitalOverloadRisk: number;
  infrastructureDamageRisk: number;
  responseDelayRisk: number;
  classifications: Record<string, RiskClassification>;
};

const RISK_META: Record<string, { label: string; gaugeColor: string }> = {
  floodRisk: { label: "Flood Risk", gaugeColor: "#3b82f6" },
  hospitalOverloadRisk: { label: "Hospital Overload", gaugeColor: "#dc2626" },
  infrastructureDamageRisk: { label: "Infrastructure Damage", gaugeColor: "#f97316" },
  responseDelayRisk: { label: "Response Delay", gaugeColor: "#8b5cf6" },
};

const CLASSIFICATION_COLORS: Record<RiskClassification, string> = {
  Low: "#16a34a",
  Moderate: "#f59e0b",
  High: "#f97316",
  Critical: "#dc2626",
};

function RiskGauge({ value, color, label }: { value: number; color: string; label: string }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const classification = classifyRisk(value);
  const classColor = CLASSIFICATION_COLORS[classification];

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="90" height="90" viewBox="0 0 90 90" className="shrink-0">
        <circle cx="45" cy="45" r={r} fill="none" stroke="#1e293b" strokeWidth="6" />
        <circle
          cx="45"
          cy="45"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 45 45)"
          className="transition-all duration-700"
        />
        <text x="45" y="42" textAnchor="middle" className="fill-slate-200 text-lg font-bold">
          {value}
        </text>
        <text x="45" y="56" textAnchor="middle" className="fill-slate-500 text-[9px]">
          /100
        </text>
      </svg>
      <p className="text-[10px] font-medium text-slate-400 text-center leading-tight">{label}</p>
      <span
        className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
        style={{ color: classColor, backgroundColor: `${classColor}18` }}
      >
        {classification}
      </span>
    </div>
  );
}

export function AIIntelligencePanel() {
  const latitude = useDisasterStore((s) => s.situation.latitude);
  const longitude = useDisasterStore((s) => s.situation.longitude);
  const severity = useDisasterStore((s) => s.situation.severity);
  const populationAffected = useDisasterStore((s) => s.situation.populationAffected);
  const disasterType = useDisasterStore((s) => s.situation.disasterType);
  const description = useDisasterStore((s) => s.situation.description);
  const { data: weather } = useWeather(latitude, longitude);
  const { data: facilities } = useFacilities(latitude, longitude, 25000);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleAnalyze = () => {
    setLoading(true);

    const scores = computeRiskScores({
      disasterType,
      severity,
      populationAffected,
      weather: weather ?? null,
      facilities: facilities ?? null,
    });

    const data = {
      floodRisk: scores.floodRisk,
      hospitalOverloadRisk: scores.hospitalOverloadRisk,
      infrastructureDamageRisk: scores.infrastructureDamageRisk,
      responseDelayRisk: scores.responseDelayRisk,
      classifications: scores.classifications,
    };

    setResult(data);
    setLoading(false);

    fetch("/api/ai-intelligence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        disasterType,
        severity,
        populationAffected,
        description: description || null,
        weather,
        facilities,
      }),
    })
      .then((r) => r.ok && setSaved(true))
      .catch(() => {});
  };

  const hasRun = result !== null;
  const items: RiskItem[] = hasRun
    ? [
        { key: "floodRisk", label: "Flood Risk", value: result.floodRisk },
        { key: "hospitalOverloadRisk", label: "Hospital Overload", value: result.hospitalOverloadRisk },
        { key: "infrastructureDamageRisk", label: "Infrastructure Damage", value: result.infrastructureDamageRisk },
        { key: "responseDelayRisk", label: "Response Delay", value: result.responseDelayRisk },
      ]
    : [];

  return (
    <div className="space-y-3">
      <button
        onClick={handleAnalyze}
        disabled={loading}
        className="w-full rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white transition-all hover:bg-teal-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-600"
      >
        {loading ? "Analyzing..." : saved ? "Re-analyze" : "Run AI Analysis"}
      </button>

      {!hasRun && !loading && (
        <p className="text-center text-xs text-slate-500">
          Click above to generate AI-powered risk scores based on live data.
        </p>
      )}

      {hasRun && (
        <div className="grid grid-cols-2 gap-3">
          {items.map((item) => {
            const meta = RISK_META[item.key];
            return (
              <RiskGauge
                key={item.key}
                value={item.value}
                color={meta.gaugeColor}
                label={meta.label}
              />
            );
          })}
        </div>
      )}

      {saved && (
        <p className="text-center text-[10px] text-slate-600">
          Results saved to database
        </p>
      )}
    </div>
  );
}
