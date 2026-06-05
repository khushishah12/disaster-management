"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const TEAM_ICONS: Record<string, string> = {
  ambulance_team: "🚑",
  rescue_team: "🦺",
  fire_response: "🚒",
};

const TEAM_LABELS: Record<string, string> = {
  ambulance_team: "Ambulance",
  rescue_team: "Rescue",
  fire_response: "Fire",
};

const EMERGENCY_ICONS: Record<string, string> = {
  medical: "🏥",
  fire: "🔥",
  flood: "🌊",
  earthquake: "🏚️",
  cyclone: "🌀",
  landslide: "⛰️",
  structural_collapse: "🏗️",
  road_accident: "🚗",
  missing_person: "🔍",
  other: "⚠️",
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-500",
  severe: "bg-orange-500",
  moderate: "bg-amber-500",
  minor: "bg-blue-500",
};

const STATUS_STYLES: Record<string, string> = {
  acknowledged: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  in_progress: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  rescued: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};

type SosWithAssignments = {
  id: string;
  ticket_number: string;
  emergency_type: string;
  severity: string;
  status: string;
  address: string | null;
  latitude: number;
  longitude: number;
  created_at: string;
  rescue_assignments: {
    assigned_team: string;
    resource_count: number;
    responder_lat: number | null;
    responder_lng: number | null;
  }[];
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function ResourceAllocationCards() {
  const { data, isLoading } = useQuery({
    queryKey: ["sos-resource-cards"],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("sos_requests")
        .select(`
          id,
          ticket_number,
          emergency_type,
          severity,
          status,
          address,
          latitude,
          longitude,
          created_at,
          rescue_assignments(assigned_team, resource_count, responder_lat, responder_lng)
        `)
        .in("status", ["acknowledged", "in_progress", "rescued"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SosWithAssignments[];
    },
    refetchInterval: 15000,
  });

  const totalResources = useMemo(() => {
    if (!data) return 0;
    return data.reduce((sum, row) => {
      return sum + (row.rescue_assignments ?? []).reduce((s, a) => s + (a.resource_count ?? 0), 0);
    }, 0);
  }, [data]);

  const totalDeployed = useMemo(() => {
    if (!data) return 0;
    return data.filter((r) => (r.rescue_assignments ?? []).some((a) => a.responder_lat != null)).length;
  }, [data]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="h-4 w-48 animate-pulse rounded bg-slate-800/60" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-900/60" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-slate-800/40 bg-slate-900/20 p-4 text-center">
        <p className="text-xs text-slate-500">No active SOS requests with resource allocations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-lg bg-slate-900/40 px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          SOS Requests
        </span>
        <div className="flex items-center gap-3 text-[10px] text-slate-500">
          <span>{totalResources} resources</span>
          <span className="text-emerald-500">{totalDeployed} deployed</span>
        </div>
      </div>

      <div className="space-y-2">
        {data.map((req) => {
          const assignments = req.rescue_assignments ?? [];
          const totalReqResources = assignments.reduce((s, a) => s + (a.resource_count ?? 0), 0);
          const teamsDeployed = assignments.filter((a) => a.responder_lat != null).length;
          const hasTeams = assignments.length > 0;
          const severityColor = SEVERITY_COLORS[req.severity?.toLowerCase()] ?? "bg-slate-500";

          return (
            <div
              key={req.id}
              className="relative flex items-start gap-3 rounded-xl border border-slate-800/60 bg-slate-900/40 p-3 transition hover:border-slate-700/60"
            >
              {/* Severity accent bar */}
              <div className={cn("mt-0.5 h-10 w-1 shrink-0 rounded-full", severityColor)} />

              {/* Icon */}
              <span className="mt-0.5 text-lg shrink-0">
                {EMERGENCY_ICONS[req.emergency_type] || "⚠️"}
              </span>

              {/* Content */}
              <div className="min-w-0 flex-1">
                {/* Top row: ticket + status + time */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="truncate text-xs font-semibold text-slate-200">
                      {req.ticket_number}
                    </span>
                    <span className="shrink-0 text-[9px] text-slate-600">
                      {timeAgo(req.created_at)}
                    </span>
                  </div>
                  <span className={cn(
                    "shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-medium",
                    STATUS_STYLES[req.status] ?? "bg-slate-500/15 text-slate-400",
                  )}>
                    {req.status.replace(/_/g, " ")}
                  </span>
                </div>

                {/* Type + address */}
                <p className="mt-0.5 text-[10px] text-slate-500 capitalize">
                  {req.emergency_type.replace(/_/g, " ")}
                  {req.severity ? <span className="text-slate-600"> · {req.severity}</span> : ""}
                </p>
                {req.address && (
                  <p className="mt-0.5 truncate text-[9px] text-slate-600">{req.address}</p>
                )}

                {/* Teams */}
                {hasTeams && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {assignments.map((a, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex items-center gap-1 rounded-md px-2 py-1 text-[10px]",
                          a.responder_lat != null
                            ? "bg-emerald-900/20 text-emerald-400"
                            : "bg-slate-800/60 text-slate-400",
                        )}
                      >
                        <span>{TEAM_ICONS[a.assigned_team] || "📋"}</span>
                        <span>{TEAM_LABELS[a.assigned_team] || a.assigned_team}</span>
                        <span className="font-semibold">{a.resource_count}x</span>
                        {a.responder_lat != null && (
                          <span className="text-[8px] text-emerald-500">●</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="mt-2 flex items-center gap-3 border-t border-slate-800/60 pt-1.5 text-[9px] text-slate-600">
                  <span>{assignments.length} team{assignments.length !== 1 ? "s" : ""}</span>
                  <span>{totalReqResources} resource{totalReqResources !== 1 ? "s" : ""}</span>
                  {teamsDeployed > 0 && (
                    <span className="text-emerald-500">{teamsDeployed} en route</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
