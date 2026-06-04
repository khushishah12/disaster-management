"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

import {
  getMyTeamAssignments,
  updateSosRequestStatus,
  type SosRequestWithProfile,
} from "@/lib/sos/actions";

const PRIORITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const PRIORITY_BADGE: Record<string, string> = {
  critical: "bg-red-600 text-white",
  high: "bg-orange-600 text-white",
  medium: "bg-yellow-600 text-black",
  low: "bg-slate-600 text-slate-200",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-400",
  acknowledged: "bg-blue-500/15 text-blue-400",
  in_progress: "bg-orange-500/15 text-orange-400",
  rescued: "bg-emerald-500/15 text-emerald-400",
  closed: "bg-slate-500/15 text-slate-400",
  cancelled: "bg-red-500/15 text-red-400",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  acknowledged: "Acknowledged",
  in_progress: "In Progress",
  rescued: "Rescued",
  closed: "Closed",
  cancelled: "Cancelled",
};

const EMERGENCY_LABELS: Record<string, string> = {
  medical: "Medical",
  fire: "Fire",
  flood: "Flood",
  earthquake: "Earthquake",
  cyclone: "Cyclone",
  landslide: "Landslide",
  structural_collapse: "Structural Collapse",
  road_accident: "Road Accident",
  missing_person: "Missing Person",
  other: "Other",
};

const SEVERITY_WEIGHT: Record<string, number> = {
  critical: 100,
  high: 50,
  moderate: 20,
  low: 0,
};

function computePriority(r: SosRequestWithProfile): string {
  const severity = r.severity || "low";
  const totalPeople =
    (r.adults_count || 0) +
    (r.children_count || 0) +
    (r.elderly_count || 0);
  const injured = r.injured_count || 0;
  const score =
    SEVERITY_WEIGHT[severity] +
    Math.min(totalPeople, 50) +
    injured * 10;
  if (severity === "critical" || score >= 100) return "critical";
  if (severity === "high" || score >= 50) return "high";
  if (severity === "moderate" || score >= 20) return "medium";
  return "low";
}

export const SosAssignmentsPanel = () => {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<SosRequestWithProfile | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["my-team-assignments"],
    queryFn: () => getMyTeamAssignments(),
    refetchInterval: 15000,
  });

  const assignments = data?.data ?? [];

  const filtered = useMemo(() => {
    if (statusFilter === "all") return assignments;
    return assignments.filter((r) => r.status === statusFilter);
  }, [assignments, statusFilter]);

  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        const pa = PRIORITY_ORDER[computePriority(a)] ?? 99;
        const pb = PRIORITY_ORDER[computePriority(b)] ?? 99;
        if (pa !== pb) return pa - pb;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }),
    [filtered],
  );

  useEffect(() => {
    const client = createClient();
    const channel = client
      .channel("sos-assignments-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rescue_assignments" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["my-team-assignments"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sos_requests" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["my-team-assignments"] });
        },
      )
      .subscribe();

    return () => { client.removeChannel(channel); };
  }, [queryClient]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-100">My SOS Assignments</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-900/60" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">My SOS Assignments</h2>
          <p className="mt-1 text-sm text-slate-500">
            SOS tasks assigned to your team.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-1.5 text-xs text-slate-400">
            {assignments.length} active
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-300 outline-none focus:border-teal-600"
        >
          <option value="all">All Status</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="in_progress">In Progress</option>
          <option value="rescued">Rescued</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {sorted.length === 0 ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="text-center">
            <p className="text-sm font-medium text-slate-400">No assignments yet</p>
            <p className="mt-1 text-xs text-slate-600">
              When a coordinator assigns an SOS request to your team, it will appear here.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map((r) => {
            const priority = computePriority(r);
            const totalPeople =
              (r.adults_count || 0) +
              (r.children_count || 0) +
              (r.elderly_count || 0);
            return (
              <div
                key={r.id}
                onClick={() => setSelected(selected?.id === r.id ? null : r)}
                className="cursor-pointer rounded-2xl border border-slate-700/40 bg-slate-900/60 p-4 backdrop-blur-sm transition hover:border-slate-600/60"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="truncate text-xs font-mono font-semibold text-slate-300">
                      {r.ticket_number}
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${PRIORITY_BADGE[priority]}`}>
                      {priority.toUpperCase()}
                    </span>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[r.status]}`}>
                    {STATUS_LABELS[r.status] || r.status}
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="rounded-md bg-slate-800/80 px-1.5 py-0.5 text-slate-400">
                    {EMERGENCY_LABELS[r.emergency_type] || r.emergency_type}
                  </span>
                  {r.severity && (
                    <span className="capitalize text-slate-500">{r.severity}</span>
                  )}
                </div>

                <p className="mt-2 text-xs text-slate-400 truncate">
                  {r.address || "No address"}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500">
                  <span>{totalPeople} people</span>
                  {r.injured_count > 0 && <span className="text-red-400">{r.injured_count} injured</span>}
                  <span>{new Date(r.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                </div>

                {selected?.id === r.id && (
                  <div className="mt-4 border-t border-slate-800 pt-4 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2 text-xs">
                      <div>
                        <span className="text-slate-500">Contact</span>
                        <p className="text-slate-200">{r.phone_number || "N/A"}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Submitted By</span>
                        <p className="text-slate-200">{r.profiles?.full_name || "Unknown"}</p>
                      </div>
                      {r.alternate_contact && (
                        <div>
                          <span className="text-slate-500">Alt Contact</span>
                          <p className="text-slate-200">{r.alternate_contact}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-500">People</span>
                        <p className="text-slate-200">
                          {r.adults_count || 0}A / {r.children_count || 0}C / {r.elderly_count || 0}E
                          {r.injured_count ? ` · ${r.injured_count} injured` : ""}
                        </p>
                      </div>
                    </div>

                    {r.description && (
                      <div className="text-xs">
                        <span className="text-slate-500">Description</span>
                        <p className="mt-0.5 text-slate-300">{r.description}</p>
                      </div>
                    )}

                    {r.immediate_needs && (r.immediate_needs as string[]).length > 0 && (
                      <div className="text-xs">
                        <span className="text-slate-500">Needs</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {(r.immediate_needs as string[]).map((need, i) => (
                            <span key={i} className="rounded-lg bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">{need}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {r.status !== "closed" && r.status !== "cancelled" && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {r.status === "acknowledged" && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              await updateSosRequestStatus(r.id, "in_progress");
                              queryClient.invalidateQueries({ queryKey: ["my-team-assignments"] });
                            }}
                            className="rounded-xl bg-orange-600 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-orange-500"
                          >
                            Start Response
                          </button>
                        )}
                        {r.status === "in_progress" && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              await updateSosRequestStatus(r.id, "rescued");
                              queryClient.invalidateQueries({ queryKey: ["my-team-assignments"] });
                            }}
                            className="rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-500"
                          >
                            Mark Rescued
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};