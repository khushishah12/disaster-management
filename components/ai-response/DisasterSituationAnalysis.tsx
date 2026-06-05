"use client";

import { useEffect, useState } from "react";
import { useDisasterStore } from "@/lib/store/disasterStore";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const DISASTER_TYPES = ["Flood", "Fire", "Earthquake", "Cyclone", "Landslide"] as const;

const EMERGENCY_TO_DISASTER: Record<string, (typeof DISASTER_TYPES)[number]> = {
  flood: "Flood",
  fire: "Fire",
  earthquake: "Earthquake",
  cyclone: "Cyclone",
  landslide: "Landslide",
  structural_collapse: "Earthquake",
  road_accident: "Fire",
};

const SEVERITY_MAP: Record<string, number> = {
  minor: 2,
  moderate: 4,
  severe: 7,
  critical: 9,
};

const SEVERITY_LABELS = [
  "Minimal", "Low", "Moderate", "Elevated", "Substantial",
  "Severe", "Critical", "Extreme", "Catastrophic", "Apocalyptic",
];

const SEVERITY_COLORS = [
  "bg-green-500", "bg-lime-500", "bg-yellow-500", "bg-amber-500", "bg-orange-500",
  "bg-orange-600", "bg-red-500", "bg-red-600", "bg-red-700", "bg-red-900",
];

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function DisasterSituationAnalysis() {
  const { situation, setDisasterType, setSeverity, setPopulationAffected, setDescription, reset } =
    useDisasterStore();
  const [nearbyStats, setNearbyStats] = useState<{ type: string; count: number }[] | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Auto-populate from nearest SOS when coordinates change
  useEffect(() => {
    if (situation.latitude == null || situation.longitude == null) return;
    let cancelled = false;
    async function fetchNearestSos() {
      const supabase = await createClient();
      const { data } = await supabase
        .from("sos_requests")
        .select("id, emergency_type, severity, adults_count, children_count, elderly_count, injured_count, latitude, longitude")
        .in("status", ["pending", "acknowledged", "in_progress"]);
      if (cancelled || !data || data.length === 0) return;
      const lat = situation.latitude!;
      const lng = situation.longitude!;
      let nearest = data[0];
      let minDist = Infinity;
      for (const row of data) {
        if (row.latitude == null || row.longitude == null) continue;
        const d = haversineKm(lat, lng, row.latitude, row.longitude);
        if (d < minDist) { minDist = d; nearest = row; }
      }
      if (minDist > 50 || cancelled) return; // only auto-populate if within 50km
      const dType = EMERGENCY_TO_DISASTER[nearest.emergency_type];
      if (dType && dType !== situation.disasterType) setDisasterType(dType);
      const sev = SEVERITY_MAP[nearest.severity?.toLowerCase()] ?? situation.severity;
      if (sev !== situation.severity) setSeverity(sev);
      const pop = (nearest.adults_count ?? 0) + (nearest.children_count ?? 0) + (nearest.elderly_count ?? 0) + (nearest.injured_count ?? 0);
      if (pop > 0 && pop !== situation.populationAffected) setPopulationAffected(pop);
    }
    fetchNearestSos();
    return () => { cancelled = true; };
  }, [situation.latitude, situation.longitude]);

  // Fetch nearby SOS stats for live summary
  useEffect(() => {
    if (situation.latitude == null || situation.longitude == null) { setNearbyStats(null); return; }
    let cancelled = false;
    setLoadingStats(true);
    async function fetchStats() {
      const supabase = await createClient();
      const { data } = await supabase
        .from("sos_requests")
        .select("emergency_type, latitude, longitude")
        .in("status", ["pending", "acknowledged", "in_progress"]);
      if (cancelled || !data) return;
      const lat = situation.latitude!;
      const lng = situation.longitude!;
      const counts: Record<string, number> = {};
      for (const row of data) {
        if (row.latitude == null || row.longitude == null) continue;
        const d = haversineKm(lat, lng, row.latitude, row.longitude);
        if (d <= 25) { // within 25km
          const t = row.emergency_type || "other";
          counts[t] = (counts[t] ?? 0) + 1;
        }
      }
      if (!cancelled) {
        setNearbyStats(Object.entries(counts).map(([type, count]) => ({ type, count })));
        setLoadingStats(false);
      }
    }
    fetchStats();
    return () => { cancelled = true; };
  }, [situation.latitude, situation.longitude]);

  return (
    <div className="dashboard-panel rounded-xl border border-slate-800/60">
      <div className="flex items-center justify-between border-b border-slate-800/60 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-200">
          Disaster Situation Analysis
        </h3>
        {situation.disasterType && (
          <button
            type="button"
            onClick={reset}
            className="text-[11px] text-slate-500 underline transition hover:text-slate-300"
          >
            Clear
          </button>
        )}
      </div>

      <div className="space-y-4 p-4">
        {/* Live nearby stats */}
        {nearbyStats && nearbyStats.length > 0 && (
          <div className="rounded-lg border border-teal-800/40 bg-teal-900/10 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-teal-400">
              Nearby Active SOS ({nearbyStats.reduce((s, n) => s + n.count, 0)} within 25km)
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {nearbyStats.map((n) => (
                <span key={n.type} className="rounded bg-slate-800/60 px-2 py-0.5 text-[10px] capitalize text-slate-300">
                  {n.type.replace(/_/g, " ")}: {n.count}
                </span>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">
            Disaster Type
          </label>
          <select
            value={situation.disasterType}
            onChange={(e) => setDisasterType(e.target.value as typeof situation.disasterType)}
            className="w-full rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 outline-none transition focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30"
          >
            <option value="">Select type...</option>
            {DISASTER_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">
              Severity
            </label>
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                SEVERITY_COLORS[situation.severity - 1]?.replace("bg-", "text-") ?? "text-slate-400",
              )}
            >
              {situation.severity}/10 — {SEVERITY_LABELS[situation.severity - 1]}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={situation.severity}
            onChange={(e) => setSeverity(Number(e.target.value))}
            className="w-full accent-teal-500"
          />
          <div className="mt-1 flex justify-between text-[10px] text-slate-600">
            <span>1</span><span>10</span>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">
            Population Affected
          </label>
          <input
            type="number"
            min={0}
            value={situation.populationAffected}
            onChange={(e) => setPopulationAffected(Math.max(0, Number(e.target.value)))}
            placeholder="0"
            className="w-full rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 outline-none transition focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">
            Description
          </label>
          <textarea
            rows={3}
            value={situation.description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the situation..."
            className="w-full resize-none rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">
              Latitude
            </label>
            <input
              readOnly
              value={situation.latitude ?? ""}
              placeholder="Click map"
              className="w-full rounded-lg border border-slate-700/40 bg-slate-900/30 px-3 py-2 text-sm text-slate-400 outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">
              Longitude
            </label>
            <input
              readOnly
              value={situation.longitude ?? ""}
              placeholder="Click map"
              className="w-full rounded-lg border border-slate-700/40 bg-slate-900/30 px-3 py-2 text-sm text-slate-400 outline-none"
            />
          </div>
        </div>

        {situation.latitude && situation.longitude && (
          <p className="text-[10px] text-teal-500/70">
            Marker placed at {situation.latitude.toFixed(4)}, {situation.longitude.toFixed(4)}
          </p>
        )}
      </div>
    </div>
  );
}
