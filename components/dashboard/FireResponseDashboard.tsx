"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { getMyTeamAssignments } from "@/lib/sos/actions";
import { getActiveFireReports, getMyFireReports } from "@/lib/fire/actions";

const EMERGENCY_ICONS: Record<string, string> = {
  medical: "🆘", fire: "🔥", flood: "🌊", earthquake: "🏚️",
  cyclone: "🌀", landslide: "⛰️", structural_collapse: "🏗️",
  road_accident: "🚗", missing_person: "🔍", other: "⚠️",
};

const REPORT_TYPE_META: Record<string, { label: string; icon: string }> = {
  fire_incident: { label: "Fire Incident", icon: "🔥" },
  hazard_escalation: { label: "Hazard", icon: "⚠️" },
  resource_requirement: { label: "Resource", icon: "📦" },
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  acknowledged: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  in_progress: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  rescued: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  closed: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  cancelled: "bg-red-500/15 text-red-400 border-red-500/30",
  active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  completed: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

const SEVERITY_DOT: Record<string, string> = {
  critical: "bg-red-500", high: "bg-orange-500", moderate: "bg-amber-400", low: "bg-green-500",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

type ViewState = "dashboard" | "detail" | "all-assignments" | "all-reports";

type FireResponseDashboardProps = {
  profile: { full_name: string; city: string | null; state: string | null; phone: string | null } | null;
};

function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-800/40 px-3 py-2">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-xs font-semibold text-slate-200">{value ?? "—"}</span>
    </div>
  );
}

export function FireResponseDashboard({ profile }: FireResponseDashboardProps) {
  const [view, setView] = useState<ViewState>("dashboard");
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data: assignments = [] } = useQuery({
    queryKey: ["fire-team-assignments"],
    queryFn: async () => {
      const res = await getMyTeamAssignments();
      return res.data ?? [];
    },
    refetchInterval: 15000,
  });

  const { data: activeReports = [] } = useQuery({
    queryKey: ["fire-active-reports"],
    queryFn: async () => {
      const res = await getActiveFireReports();
      return res.data ?? [];
    },
    refetchInterval: 30000,
  });

  const { data: allReports = [] } = useQuery({
    queryKey: ["fire-all-reports"],
    queryFn: async () => {
      const res = await getMyFireReports();
      return res.data ?? [];
    },
    staleTime: 60 * 1000,
  });

  const activeAssignments = assignments.filter((a) =>
    ["acknowledged", "in_progress"].includes(a.status),
  );

  const detailAssignment = detailId ? assignments.find((a) => a.id === detailId) : null;

  // --- Detail view ---
  if (view === "detail" && detailAssignment) {
    const a = detailAssignment;
    const totalPeople = a.adults_count + a.children_count + a.elderly_count + a.injured_count;
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => { setView("dashboard"); setDetailId(null); }}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <div>
            <h2 className="text-base font-semibold text-slate-100">{a.ticket_number}</h2>
            <p className="text-xs text-slate-500">{timeAgo(a.created_at)}</p>
          </div>
          <span className={cn("ml-auto shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold", STATUS_STYLES[a.status])}>
            {a.status.replace(/_/g, " ")}
          </span>
        </div>
        <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4">
          <div className="space-y-2">
            <DetailRow label="Emergency Type" value={`${EMERGENCY_ICONS[a.emergency_type] || "⚠️"} ${a.emergency_type.replace(/_/g, " ")}`} />
            <DetailRow label="Severity" value={a.severity} />
            <DetailRow label="Total People" value={`${totalPeople} (${a.adults_count} adults, ${a.children_count} children, ${a.elderly_count} elderly, ${a.injured_count} injured)`} />
            <DetailRow label="Location" value={a.address ? `${a.latitude}, ${a.longitude} — ${a.address}` : `${a.latitude}, ${a.longitude}`} />
            <DetailRow label="Phone" value={a.phone_number} />
            <DetailRow label="Resource Count" value={a.rescue_assignments[0]?.resource_count ?? 1} />
            <DetailRow label="Created" value={new Date(a.created_at).toLocaleString()} />
          </div>
        </div>
        {a.description && (
          <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Description</h3>
            <p className="text-sm text-slate-300">{a.description}</p>
          </div>
        )}
        {a.immediate_needs && a.immediate_needs.length > 0 && (
          <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Immediate Needs</h3>
            <div className="flex flex-wrap gap-2">
              {(a.immediate_needs as string[]).map((need) => (
                <span key={need} className="rounded-lg bg-red-600/15 px-3 py-1.5 text-xs font-semibold text-red-300">{need}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- All Assignments view ---
  if (view === "all-assignments") {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setView("dashboard")}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <h2 className="text-base font-semibold text-slate-100">All SOS Assignments ({assignments.length})</h2>
        </div>
        {assignments.length === 0 ? (
          <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-8 text-center">
            <p className="text-sm text-slate-500">No assignments yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {assignments.map((a) => (
              <button key={a.id} type="button" onClick={() => { setDetailId(a.id); setView("detail"); }}
                className="flex w-full items-center justify-between rounded-lg bg-slate-800/40 px-3 py-2.5 text-left transition hover:bg-slate-800/60">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg shrink-0">{EMERGENCY_ICONS[a.emergency_type] || "⚠️"}</span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-slate-200">{a.ticket_number}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <span className={cn("inline-block h-1.5 w-1.5 rounded-full", SEVERITY_DOT[a.severity] ?? "bg-slate-500")} />
                      <span className="capitalize">{a.severity}</span>
                      <span>{a.adults_count + a.children_count + a.elderly_count + a.injured_count} people</span>
                    </div>
                  </div>
                </div>
                <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold", STATUS_STYLES[a.status])}>
                  {a.status.replace(/_/g, " ")}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- All Reports view ---
  if (view === "all-reports") {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setView("dashboard")}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <h2 className="text-base font-semibold text-slate-100">All Fire Reports ({allReports.length})</h2>
        </div>
        {allReports.length === 0 ? (
          <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-8 text-center">
            <p className="text-sm text-slate-500">No reports submitted yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {allReports.map((r) => {
              const meta = REPORT_TYPE_META[r.report_type] ?? { label: r.report_type, icon: "📋" };
              return (
                <div key={r.id} className="flex items-center justify-between rounded-lg bg-slate-800/40 px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base shrink-0">{meta.icon}</span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-slate-200">{r.title}</p>
                      <p className="text-[10px] text-slate-500">{meta.label} · {r.location} · {timeAgo(r.created_at)}</p>
                    </div>
                  </div>
                  <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold", STATUS_STYLES[r.status] ?? STATUS_STYLES.active)}>
                    {r.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // --- Dashboard view ---
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-slate-100">
              Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">Fire Response Dashboard</p>
          </div>
          <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-[11px] font-semibold text-orange-300">Fire Response</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Active SOS</p>
          <p className="mt-1 text-2xl font-bold text-orange-400">{activeAssignments.length}</p>
        </div>
        <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Reports</p>
          <p className="mt-1 text-2xl font-bold text-emerald-400">{activeReports.length}</p>
        </div>
        <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total SOS</p>
          <p className="mt-1 text-2xl font-bold text-slate-300">{assignments.length}</p>
        </div>
        <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Location</p>
          <p className="mt-1 text-sm font-semibold text-slate-300 truncate">{profile?.city || "—"}</p>
        </div>
      </div>

      {/* Active SOS Assignments */}
      <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active SOS Assignments</h3>
          <button type="button" onClick={() => setView("all-assignments")}
            className="text-[10px] text-teal-400 hover:text-teal-300">View all ({assignments.length}) →</button>
        </div>
        {activeAssignments.length === 0 ? (
          <div className="rounded-lg bg-slate-800/30 px-4 py-6 text-center">
            <p className="text-sm text-slate-500">No active assignments</p>
            <p className="mt-1 text-xs text-slate-600">New SOS assignments will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeAssignments.map((a) => (
              <button key={a.id} type="button" onClick={() => { setDetailId(a.id); setView("detail"); }}
                className="flex w-full items-center justify-between rounded-lg bg-slate-800/40 px-3 py-2.5 text-left transition hover:bg-slate-800/60">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg shrink-0">{EMERGENCY_ICONS[a.emergency_type] || "⚠️"}</span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-slate-200">{a.ticket_number}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <span className={cn("inline-block h-1.5 w-1.5 rounded-full", SEVERITY_DOT[a.severity] ?? "bg-slate-500")} />
                      <span className="capitalize">{a.severity}</span>
                      <span>{a.adults_count + a.children_count + a.elderly_count + a.injured_count} people</span>
                    </div>
                  </div>
                </div>
                <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold", STATUS_STYLES[a.status])}>
                  {a.status.replace(/_/g, " ")}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Active Reports */}
      <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Reports</h3>
          <button type="button" onClick={() => setView("all-reports")}
            className="text-[10px] text-teal-400 hover:text-teal-300">View all ({allReports.length}) →</button>
        </div>
        {activeReports.length === 0 ? (
          <div className="rounded-lg bg-slate-800/30 px-4 py-6 text-center">
            <p className="text-sm text-slate-500">No active reports</p>
            <p className="mt-1 text-xs text-slate-600">Submit field reports to track incidents</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeReports.slice(0, 5).map((r) => {
              const meta = REPORT_TYPE_META[r.report_type] ?? { label: r.report_type, icon: "📋" };
              return (
                <div key={r.id} className="flex items-center justify-between rounded-lg bg-slate-800/40 px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base shrink-0">{meta.icon}</span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-slate-200">{r.title}</p>
                      <p className="text-[10px] text-slate-500">{meta.label} · {r.location} · {timeAgo(r.created_at)}</p>
                    </div>
                  </div>
                  <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold", STATUS_STYLES[r.status] ?? STATUS_STYLES.active)}>
                    {r.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setView("all-assignments")}
            className="rounded-lg bg-slate-800/40 px-3 py-3 text-center transition hover:bg-slate-800/60">
            <p className="text-lg mb-1">📋</p>
            <p className="text-xs font-semibold text-slate-300">SOS Assignments</p>
            <p className="text-[10px] text-slate-500 mt-0.5">View and respond to SOS tasks</p>
          </button>
          <button type="button" onClick={() => setView("all-reports")}
            className="rounded-lg bg-slate-800/40 px-3 py-3 text-center transition hover:bg-slate-800/60">
            <p className="text-lg mb-1">🔥</p>
            <p className="text-xs font-semibold text-slate-300">Fire Reports</p>
            <p className="text-[10px] text-slate-500 mt-0.5">View all submitted fire reports</p>
          </button>
        </div>
      </div>
    </div>
  );
}
