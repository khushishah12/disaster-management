"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { getMyHospitalReports, getActiveHospitalReports, getHospitalFacilitiesByProfile } from "@/lib/hospital/actions";

const REPORT_TYPE_META: Record<string, { label: string; icon: string }> = {
  bed_availability: { label: "Bed Availability", icon: "🛏️" },
  resource_shortage: { label: "Resource Shortage", icon: "⚠️" },
  patient_intake: { label: "Patient Intake", icon: "🏥" },
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  completed: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  cancelled: "bg-red-500/15 text-red-400 border-red-500/30",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

type ViewState = "dashboard" | "all-reports" | "all-facilities";

type HospitalCoordinatorDashboardProps = {
  profile: { full_name: string; city: string | null; state: string | null; phone: string | null } | null;
};

export function HospitalCoordinatorDashboard({ profile }: HospitalCoordinatorDashboardProps) {
  const [view, setView] = useState<ViewState>("dashboard");

  const { data: activeReports = [] } = useQuery({
    queryKey: ["hospital-active-reports"],
    queryFn: async () => {
      const res = await getActiveHospitalReports();
      return res.data ?? [];
    },
    refetchInterval: 30000,
  });

  const { data: allReports = [] } = useQuery({
    queryKey: ["hospital-all-reports"],
    queryFn: async () => {
      const res = await getMyHospitalReports();
      return res.data ?? [];
    },
    staleTime: 60 * 1000,
  });

  const { data: facilities = [] } = useQuery({
    queryKey: ["hospital-facilities"],
    queryFn: async () => {
      const res = await getHospitalFacilitiesByProfile();
      return res ?? [];
    },
    staleTime: 120 * 1000,
  });

  // --- All Reports view ---
  if (view === "all-reports") {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setView("dashboard")}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <h2 className="text-base font-semibold text-slate-100">All Hospital Reports ({allReports.length})</h2>
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

  // --- All Facilities view ---
  if (view === "all-facilities") {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setView("dashboard")}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <h2 className="text-base font-semibold text-slate-100">My Hospitals ({facilities.length})</h2>
        </div>
        {facilities.length === 0 ? (
          <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-8 text-center">
            <p className="text-sm text-slate-500">No facilities found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {facilities.map((f) => (
              <div key={f.id} className="rounded-lg bg-slate-800/40 px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-200">{f.name}</p>
                  <span className="text-[10px] text-slate-500">{f.city}, {f.state}</span>
                </div>
                <div className="mt-1.5 grid grid-cols-4 gap-2">
                  <div className="rounded bg-slate-800/60 px-2 py-1 text-center">
                    <p className="text-[10px] text-slate-500">Total Beds</p>
                    <p className="text-xs font-bold text-slate-200">{f.total_beds ?? "—"}</p>
                  </div>
                  <div className="rounded bg-slate-800/60 px-2 py-1 text-center">
                    <p className="text-[10px] text-slate-500">Available</p>
                    <p className="text-xs font-bold text-emerald-400">{f.available_beds ?? "—"}</p>
                  </div>
                  <div className="rounded bg-slate-800/60 px-2 py-1 text-center">
                    <p className="text-[10px] text-slate-500">ICU Beds</p>
                    <p className="text-xs font-bold text-slate-200">{f.icu_beds ?? "—"}</p>
                  </div>
                  <div className="rounded bg-slate-800/60 px-2 py-1 text-center">
                    <p className="text-[10px] text-slate-500">O₂</p>
                    <p className="text-xs font-bold text-slate-200">{f.oxygen_available ? "✅" : "❌"}</p>
                  </div>
                </div>
              </div>
            ))}
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
            <p className="mt-0.5 text-xs text-slate-500">Hospital Coordinator Dashboard</p>
          </div>
          <span className="rounded-full border border-pink-500/30 bg-pink-500/10 px-3 py-1 text-[11px] font-semibold text-pink-300">Hospital Coordinator</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Active Reports</p>
          <p className="mt-1 text-2xl font-bold text-pink-400">{activeReports.length}</p>
        </div>
        <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Hospitals</p>
          <p className="mt-1 text-2xl font-bold text-sky-400">{facilities.length}</p>
        </div>
        <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total Reports</p>
          <p className="mt-1 text-2xl font-bold text-slate-300">{allReports.length}</p>
        </div>
        <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">City</p>
          <p className="mt-1 text-sm font-semibold text-slate-300 truncate">{profile?.city || "—"}</p>
        </div>
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
            <p className="mt-1 text-xs text-slate-600">Submit bed availability, resource, or intake reports</p>
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

      {/* My Facilities */}
      <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">My Hospitals</h3>
          <button type="button" onClick={() => setView("all-facilities")}
            className="text-[10px] text-teal-400 hover:text-teal-300">View all ({facilities.length}) →</button>
        </div>
        {facilities.length === 0 ? (
          <div className="rounded-lg bg-slate-800/30 px-4 py-6 text-center">
            <p className="text-sm text-slate-500">No hospitals found</p>
            <p className="mt-1 text-xs text-slate-600">Add your hospital facilities to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {facilities.slice(0, 5).map((f) => (
              <div key={f.id} className="rounded-lg bg-slate-800/40 px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-200">{f.name}</p>
                  <span className="text-[10px] text-slate-500">{f.total_beds ?? "?"} beds</span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-[10px] text-slate-500">
                  <span>Available: <strong className="text-emerald-400">{f.available_beds ?? "—"}</strong></span>
                  <span>ICU: <strong className="text-sky-400">{f.icu_beds ?? "—"}</strong></span>
                  <span>O₂: {f.oxygen_available ? "✅" : "❌"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setView("all-reports")}
            className="rounded-lg bg-slate-800/40 px-3 py-3 text-center transition hover:bg-slate-800/60">
            <p className="text-lg mb-1">📊</p>
            <p className="text-xs font-semibold text-slate-300">Hospital Reports</p>
            <p className="text-[10px] text-slate-500 mt-0.5">View all submitted hospital reports</p>
          </button>
          <button type="button" onClick={() => setView("all-facilities")}
            className="rounded-lg bg-slate-800/40 px-3 py-3 text-center transition hover:bg-slate-800/60">
            <p className="text-lg mb-1">🏥</p>
            <p className="text-xs font-semibold text-slate-300">My Hospitals</p>
            <p className="text-[10px] text-slate-500 mt-0.5">View and manage hospital facilities</p>
          </button>
        </div>
      </div>
    </div>
  );
}
