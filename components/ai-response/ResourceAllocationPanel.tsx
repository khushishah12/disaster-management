"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { getResourceAllocationByDisaster } from "@/lib/sos/actions";
import { Skeleton } from "@/components/ui/Skeleton";

const TEAM_LABELS: Record<string, string> = {
  rescue_team: "Rescue",
  ambulance_team: "Ambulance",
  fire_response: "Fire",
};

export function ResourceAllocationPanel() {
  const { data: liveData, isLoading } = useQuery({
    queryKey: ["resource-allocation-live"],
    queryFn: getResourceAllocationByDisaster,
    refetchInterval: 30000,
  });

  const liveStats = useMemo(() => {
    if (!liveData?.data) return null;
    const all = liveData.data;
    const totalResources = all.reduce((s, d) => s + d.total_resources, 0);
    const totalAssignments = all.reduce((s, d) => s + d.total_assignments, 0);
    return { totalResources, totalAssignments, byDisaster: all };
  }, [liveData]);

  return (
    <div className="space-y-3">
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
    </div>
  );
}
