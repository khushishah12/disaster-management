"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { calculateResources, type ResourceInputs, type ResourceAllocation } from "@/lib/resources/calculator";
import { getResourceAllocationByDisaster, type ResourceAllocationStats } from "@/lib/sos/actions";
import { Skeleton } from "@/components/ui/Skeleton";

const PRIORITY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  CRITICAL: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/40" },
  HIGH: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/40" },
  MEDIUM: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/40" },
  LOW: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/40" },
};

const TEAM_LABELS: Record<string, string> = {
  rescue_team: "Rescue",
  ambulance_team: "Ambulance",
  fire_response: "Fire",
};

type ResourceCard = {
  label: string;
  value: number;
  icon: string;
  color: string;
};

type ResourceAllocationPanelProps = {
  inputs: ResourceInputs;
};

function AnimatedCard({ card, index }: { card: ResourceCard; index: number }) {
  return (
    <div
      className={cn(
        "animate-in fade-in slide-in-from-bottom-2 rounded-lg border border-slate-800/60 bg-slate-900/40 p-3 transition-all duration-500 hover:border-slate-700/60",
      )}
      style={{ animationDelay: `${index * 100}ms`, animationFillMode: "both" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{card.icon}</span>
          <span className="text-xs font-medium text-slate-400">{card.label}</span>
        </div>
        <span
          className={cn(
            "tabular-nums text-lg font-bold transition-all duration-700",
            card.color,
          )}
        >
          {card.value}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div
          className={cn("h-full rounded-full transition-all duration-1000 ease-out", card.color.replace("text-", "bg-"))}
          style={{
            width: `${Math.min((card.value / 60) * 100, 100)}%`,
            animationDelay: `${index * 150 + 300}ms`,
          }}
        />
      </div>
    </div>
  );
}

function PriorityBadge({ priority, score }: { priority: string; score: number }) {
  const s = PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.LOW;
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border p-3 transition-all",
        s.bg,
        s.border,
      )}
    >
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          Response Priority
        </p>
        <p className={cn("mt-0.5 text-lg font-bold", s.text)}>{priority}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-800">
          <div
            className={cn("h-full rounded-full transition-all duration-1000", s.text.replace("text-", "bg-"))}
            style={{ width: `${score}%` }}
          />
        </div>
        <span className={cn("text-xs font-semibold", s.text)}>{score}</span>
      </div>
    </div>
  );
}

export function ResourceAllocationPanel({ inputs }: ResourceAllocationPanelProps) {
  const allocation = useMemo(() => calculateResources(inputs), [inputs]);

  const { data: liveData, isLoading } = useQuery({
    queryKey: ["resource-allocation-live"],
    queryFn: getResourceAllocationByDisaster,
    refetchInterval: 30000,
  });

  const cards: ResourceCard[] = [
    { label: "Ambulances Needed", value: allocation.ambulances, icon: "🚑", color: "text-red-400" },
    { label: "Rescue Teams Needed", value: allocation.rescueTeams, icon: "🚁", color: "text-orange-400" },
    { label: "Shelters Needed", value: allocation.shelters, icon: "🏠", color: "text-emerald-400" },
    { label: "Medical Teams Needed", value: allocation.medicalTeams, icon: "🏥", color: "text-blue-400" },
  ];

  const liveStats = useMemo(() => {
    if (!liveData?.data) return null;
    const all = liveData.data;
    const totalResources = all.reduce((s, d) => s + d.total_resources, 0);
    const totalAssignments = all.reduce((s, d) => s + d.total_assignments, 0);
    return { totalResources, totalAssignments, byDisaster: all };
  }, [liveData]);

  return (
    <div className="space-y-3">
      <PriorityBadge priority={allocation.priority} score={allocation.priorityScore} />

      {/* Live SOS assignments */}
      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : liveStats && liveStats.totalAssignments > 0 ? (
        <div className="rounded-lg border border-teal-800/40 bg-teal-900/10 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-teal-400">
            Live Dispatch Allocation
          </p>
          <p className="mt-1 text-lg font-bold text-teal-300">
            {liveStats.totalResources}
            <span className="ml-1 text-xs font-normal text-teal-500">
              resources across {liveStats.totalAssignments} assignments
            </span>
          </p>
          <div className="mt-2 space-y-1">
            {liveStats.byDisaster.map((d) => (
              <div key={d.disaster_type} className="rounded bg-slate-900/60 px-2 py-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium capitalize text-slate-300">
                    {d.disaster_type.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs text-teal-400">{d.total_resources} resources</span>
                </div>
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {d.assigned_teams.map((t) => (
                    <span key={t.team} className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
                      {TEAM_LABELS[t.team] || t.team}: {t.resources}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-800/40 bg-slate-900/20 p-3 text-center">
          <p className="text-[10px] text-slate-500">No active SOS dispatches</p>
        </div>
      )}

      <div className="space-y-2">
        {cards.map((card, i) => (
          <AnimatedCard key={card.label} card={card} index={i} />
        ))}
      </div>
    </div>
  );
}
