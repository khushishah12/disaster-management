"use client";

import type { RouteInstruction } from "@/lib/routing/types";

const SIGN_ICONS: Record<number, string> = {
  0: "↑",
  1: "↗",
  2: "↖",
  3: "→",
  4: "←",
  5: "📍",
  6: "🚦",
  7: "⟳",
  8: "⬈",
  9: "⬉",
  10: "↩",
};

const SIGN_LABELS: Record<number, string> = {
  0: "Continue",
  1: "Turn right",
  2: "Turn left",
  3: "Keep right",
  4: "Keep left",
  5: "Arrive",
  6: "Depart",
  7: "Roundabout",
  8: "Turn sharp right",
  9: "Turn sharp left",
  10: "U-turn",
};

type Props = {
  instructions: RouteInstruction[];
  onClose: () => void;
};

export function MapRouteInstructions({ instructions, onClose }: Props) {
  return (
    <div className="pointer-events-auto absolute bottom-0 left-0 right-0 max-h-[55%] overflow-y-auto rounded-t-xl border border-slate-700/60 bg-slate-950/95 backdrop-blur-sm">
      <div className="sticky top-0 flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Directions
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-slate-500 transition hover:bg-slate-800 hover:text-slate-300"
          aria-label="Close directions"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="divide-y divide-slate-800/50 px-1 py-1">
        {instructions.map((inst, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition hover:bg-slate-800/40"
          >
            <span
              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                inst.sign === 5
                  ? "bg-emerald-500/15 text-emerald-400"
                  : inst.sign === 6
                    ? "bg-blue-500/15 text-blue-400"
                    : "bg-slate-800 text-slate-300"
              }`}
            >
              {SIGN_ICONS[inst.sign] ?? "→"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-200">{inst.text}</p>
              {inst.street_name && (
                <p className="mt-0.5 text-[10px] text-slate-500 truncate">{inst.street_name}</p>
              )}
            </div>
            <span className="shrink-0 text-[10px] text-slate-500">
              {inst.distance >= 1000
                ? `${(inst.distance / 1000).toFixed(1)} km`
                : `${inst.distance} m`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
