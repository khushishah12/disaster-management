"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/lib/sos/roles";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/sos/roles";
import { CivilianSosForm } from "@/components/dashboard/CivilianSosForm";
import { CivilianRequestsView, CivilianRequestDetail } from "@/components/dashboard/CivilianRequestsView";
import { EmergencyProfileEditor } from "@/components/dashboard/EmergencyProfileEditor";

type SosEmergencyCenterProps = {
  appRole: AppRole;
};

export function SosEmergencyCenter({ appRole }: SosEmergencyCenterProps) {
  const [view, setView] = useState<"menu" | "create" | "requests" | "detail" | "profile">("menu");
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [sosTicket, setSosTicket] = useState<string | null>(null);

  const roleLabel = ROLE_LABELS[appRole];
  const roleColor = ROLE_COLORS[appRole];

  if (view === "create") {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex items-center gap-3 mb-4">
          <button type="button" onClick={() => { setView("menu"); setSosTicket(null); }} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <h2 className="text-base font-semibold text-slate-100">New Emergency Request</h2>
        </div>
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-4 sm:p-6">
          {sosTicket ? (
            <div className="text-center py-6">
              <div className="text-4xl mb-3">✅</div>
              <h3 className="text-lg font-bold text-emerald-400">SOS Sent Successfully!</h3>
              <p className="mt-1 text-sm text-slate-400">Help has been notified. Stay safe.</p>
              <div className="mt-4 inline-block rounded-lg border border-emerald-800/40 bg-emerald-900/20 px-6 py-3">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Your Ticket Number</p>
                <p className="text-xl font-mono font-bold text-emerald-300 tracking-tight mt-1">{sosTicket}</p>
              </div>
              <div className="mt-6 flex gap-3 justify-center">
                <button type="button" onClick={() => { setView("menu"); setSosTicket(null); }}
                  className="px-6 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-sm font-bold hover:bg-slate-800">Back to Menu</button>
                <button type="button" onClick={() => { setView("requests"); setSosTicket(null); }}
                  className="px-6 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-500">Track My Request</button>
              </div>
            </div>
          ) : (
            <CivilianSosForm onSuccess={(ticket) => setSosTicket(ticket)} onCancel={() => setView("menu")} />
          )}
        </div>
      </div>
    );
  }

  if (view === "requests") {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-4 sm:p-6">
          <CivilianRequestsView
            onSelectRequest={(id) => { setSelectedRequestId(id); setView("detail"); }}
            onBack={() => setView("menu")}
          />
        </div>
      </div>
    );
  }

  if (view === "detail" && selectedRequestId) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-4 sm:p-6">
          <CivilianRequestDetail
            requestId={selectedRequestId}
            onBack={() => setView("requests")}
          />
        </div>
      </div>
    );
  }

  if (view === "profile") {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex items-center gap-3 mb-4">
          <button type="button" onClick={() => setView("menu")} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <h2 className="text-base font-semibold text-slate-100">Emergency Profile</h2>
        </div>
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-4 sm:p-6">
          <EmergencyProfileEditor onDone={() => setView("menu")} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="dashboard-panel rounded-2xl border border-slate-800/60 overflow-hidden">
        <div className="p-6 sm:p-8">
          <h2 className="text-xl font-bold text-slate-100 tracking-tight mb-1">
            SOS Emergency Center
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed max-w-lg mb-5">
            Access SOS request forms and view emergency requests based on your role.
          </p>

          <div
            className="mb-6 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider"
            style={{
              color: roleColor,
              backgroundColor: `${roleColor}18`,
              border: `1px solid ${roleColor}40`,
            }}
          >
            {roleLabel} Menu
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setView("create")}
              className={cn(
                "group relative rounded-xl border border-slate-700/50 p-5 sm:p-6 text-left",
                "bg-slate-800/20 backdrop-blur-sm",
                "transition-all duration-200 ease-out",
                "hover:border-red-500/50 hover:bg-slate-800/40 hover:shadow-lg hover:shadow-red-500/5",
                "active:scale-[0.98]",
              )}
            >
              <div className="flex items-start gap-4">
                <span className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-800/60 border border-slate-700/50 shrink-0 text-2xl transition-transform duration-200 group-hover:scale-110 group-hover:bg-red-900/20 group-hover:border-red-500/30" aria-hidden="true">🆘</span>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-100 group-hover:text-white transition-colors">New SOS</h3>
                  <p className="mt-0.5 text-sm text-slate-400 group-hover:text-slate-300 transition-colors">Submit a new emergency request</p>
                </div>
              </div>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-600 group-hover:text-red-400 transition-all duration-200 group-hover:translate-x-0.5" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 12L10 8L6 4" /></svg>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setView("requests")}
              className={cn(
                "group relative rounded-xl border border-slate-700/50 p-5 sm:p-6 text-left",
                "bg-slate-800/20 backdrop-blur-sm",
                "transition-all duration-200 ease-out",
                "hover:border-red-500/50 hover:bg-slate-800/40 hover:shadow-lg hover:shadow-red-500/5",
                "active:scale-[0.98]",
              )}
            >
              <div className="flex items-start gap-4">
                <span className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-800/60 border border-slate-700/50 shrink-0 text-2xl transition-transform duration-200 group-hover:scale-110 group-hover:bg-red-900/20 group-hover:border-red-500/30" aria-hidden="true">📋</span>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-100 group-hover:text-white transition-colors">My Requests</h3>
                  <p className="mt-0.5 text-sm text-slate-400 group-hover:text-slate-300 transition-colors">View your submitted requests</p>
                </div>
              </div>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-600 group-hover:text-red-400 transition-all duration-200 group-hover:translate-x-0.5" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 12L10 8L6 4" /></svg>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setView("profile")}
              className={cn(
                "group relative rounded-xl border border-slate-700/50 p-5 sm:p-6 text-left",
                "bg-slate-800/20 backdrop-blur-sm",
                "transition-all duration-200 ease-out",
                "hover:border-red-500/50 hover:bg-slate-800/40 hover:shadow-lg hover:shadow-red-500/5",
                "active:scale-[0.98]",
              )}
            >
              <div className="flex items-start gap-4">
                <span className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-800/60 border border-slate-700/50 shrink-0 text-2xl transition-transform duration-200 group-hover:scale-110 group-hover:bg-red-900/20 group-hover:border-red-500/30" aria-hidden="true">👤</span>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-100 group-hover:text-white transition-colors">Emergency Profile</h3>
                  <p className="mt-0.5 text-sm text-slate-400 group-hover:text-slate-300 transition-colors">Manage your medical info &amp; contacts</p>
                </div>
              </div>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-600 group-hover:text-red-400 transition-all duration-200 group-hover:translate-x-0.5" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 12L10 8L6 4" /></svg>
              </div>
            </button>
          </div>
        </div>

        <div className="border-t border-slate-800/60 px-6 sm:px-8 py-3 bg-slate-900/30">
          <p className="text-[11px] text-slate-500">
            Emergency requests are prioritized by severity and sent to available responders.
          </p>
        </div>
      </div>
    </div>
  );
}
