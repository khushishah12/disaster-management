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

  const grouped = useMemo(() => {
    if (!data) return {};
    const map: Record<string, SosWithAssignments[]> = {};
    for (const row of data) {
      const type = row.emergency_type || "other";
      if (!map[type]) map[type] = [];
      map[type].push(row);
    }
    return map;
  }, [data]);

  const totalResources = useMemo(() => {
    if (!data) return 0;
    return data.reduce((sum, row) => {
      return sum + (row.rescue_assignments ?? []).reduce((s, a) => s + (a.resource_count ?? 0), 0);
    }, 0);
  }, [data]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-6 w-48 animate-pulse rounded bg-slate-800/60" />
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-900/60" />
          ))}
        </div>
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Active SOS Requests
        </span>
        <span className="text-[10px] text-teal-400">
          {totalResources} total resources allocated
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {data.map((req) => {
          const assignments = req.rescue_assignments ?? [];
          const totalReqResources = assignments.reduce((s, a) => s + (a.resource_count ?? 0), 0);
          const teamsDeployed = assignments.filter((a) => a.responder_lat != null).length;

          return (
            <div
              key={req.id}
              className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4 transition hover:border-slate-700/60"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg">
                    {EMERGENCY_ICONS[req.emergency_type] || "⚠️"}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-mono font-semibold text-slate-200 truncate">
                      {req.ticket_number}
                    </p>
                    <p className="text-[10px] text-slate-500 capitalize">
                      {req.emergency_type.replace(/_/g, " ")}
                      {req.severity ? ` · ${req.severity}` : ""}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[9px] font-medium",
                    req.status === "in_progress"
                      ? "bg-orange-500/15 text-orange-400"
                      : req.status === "rescued"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-blue-500/15 text-blue-400",
                  )}
                >
                  {req.status.replace(/_/g, " ")}
                </span>
              </div>

              {req.address && (
                <p className="mt-2 text-[10px] text-slate-500 truncate">{req.address}</p>
              )}

              {assignments.length > 0 ? (
                <div className="mt-3 space-y-1.5">
                  {assignments.map((a, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg bg-slate-800/40 px-2.5 py-1.5"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{TEAM_ICONS[a.assigned_team] || "📋"}</span>
                        <span className="text-xs text-slate-300">
                          {TEAM_LABELS[a.assigned_team] || a.assigned_team}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-teal-400">
                          {a.resource_count}x
                        </span>
                        {a.responder_lat != null && (
                          <span className="text-[9px] text-emerald-500">en route</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-[10px] text-slate-600">No teams assigned yet.</p>
              )}

              <div className="mt-3 flex items-center justify-between border-t border-slate-800 pt-2 text-[10px] text-slate-500">
                <span>{assignments.length} team(s) · {totalReqResources} resources</span>
                {teamsDeployed > 0 && (
                  <span className="text-emerald-500">{teamsDeployed} deployed</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
