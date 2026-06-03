"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/lib/sos/roles";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/sos/roles";

type SosEmergencyCenterProps = {
  appRole: AppRole;
};

const SOS_CARDS = [
  {
    href: "/sos/create",
    icon: "🆘",
    title: "New SOS",
    label: "New SOS",
    description: "Submit a new emergency request",
  },
  {
    href: "/sos/my-requests",
    icon: "📋",
    title: "My Requests",
    label: "My Requests",
    description: "View your submitted requests",
  },
] as const;

export function SosEmergencyCenter({ appRole }: SosEmergencyCenterProps) {
  const roleLabel = ROLE_LABELS[appRole];
  const roleColor = ROLE_COLORS[appRole];

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="dashboard-panel rounded-2xl border border-slate-800/60 overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-100 tracking-tight">
                SOS Emergency Center
              </h2>
              <p className="mt-1.5 text-sm text-slate-400 leading-relaxed max-w-lg">
                Access SOS request forms and view emergency requests based on your role.
              </p>
            </div>
          </div>

          <div
            className="mb-5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider"
            style={{
              color: roleColor,
              backgroundColor: `${roleColor}18`,
              border: `1px solid ${roleColor}40`,
            }}
          >
            {roleLabel} Menu
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SOS_CARDS.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className={cn(
                  "group relative rounded-xl border border-slate-700/50 p-5 sm:p-6",
                  "bg-slate-800/20 backdrop-blur-sm",
                  "transition-all duration-200 ease-out",
                  "hover:border-red-500/50 hover:bg-slate-800/40 hover:shadow-lg hover:shadow-red-500/5",
                  "active:scale-[0.98] active:border-red-500/70",
                  "focus-visible:outline-2 focus-visible:outline-red-500 focus-visible:outline-offset-2",
                )}
              >
                <div className="flex items-start gap-4">
                  <span
                    className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-800/60 border border-slate-700/50 shrink-0 text-2xl
                      transition-transform duration-200 group-hover:scale-110 group-hover:bg-red-900/20 group-hover:border-red-500/30"
                    aria-hidden="true"
                  >
                    {card.icon}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-slate-100 group-hover:text-white transition-colors">
                      {card.title}
                    </h3>
                    <p className="mt-0.5 text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                      {card.description}
                    </p>
                  </div>
                </div>

                <div
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-600 group-hover:text-red-400 transition-all duration-200 group-hover:translate-x-0.5"
                  aria-hidden="true"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 12L10 8L6 4" />
                  </svg>
                </div>
              </Link>
            ))}
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
