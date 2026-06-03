"use client";

import { useEffect, useState } from "react";
import { getMyRequests, type SosRequestRow } from "@/lib/sos/actions";
import { cn } from "@/lib/utils";

const EMERGENCY_MAP: Record<string, { emoji: string; label: string }> = {
  medical: { emoji: "🆘", label: "Medical" },
  fire: { emoji: "🔥", label: "Fire" },
  flood: { emoji: "🌊", label: "Flood" },
  earthquake: { emoji: "🏚️", label: "Earthquake" },
  cyclone: { emoji: "🌀", label: "Cyclone" },
  landslide: { emoji: "⛰️", label: "Landslide" },
  structural_collapse: { emoji: "🏗️", label: "Collapse" },
  road_accident: { emoji: "🚗", label: "Accident" },
  missing_person: { emoji: "🔍", label: "Missing" },
  other: { emoji: "❗", label: "Other" },
};

const STATUS_STYLES: Record<string, { label: string; classes: string }> = {
  pending: { label: "Pending", classes: "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600" },
  acknowledged: { label: "Acknowledged", classes: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700" },
  in_progress: { label: "In Progress", classes: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700" },
  rescued: { label: "Rescued", classes: "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700" },
  closed: { label: "Closed", classes: "bg-slate-100 text-slate-500 border-slate-300 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-600" },
  cancelled: { label: "Cancelled", classes: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700" },
};

const SEVERITY_STYLES: Record<string, { label: string; dot: string }> = {
  critical: { label: "Critical", dot: "bg-red-500" },
  high: { label: "High", dot: "bg-orange-500" },
  moderate: { label: "Moderate", dot: "bg-amber-500" },
  low: { label: "Low", dot: "bg-green-500" },
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/40 p-5 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="h-5 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded-full" />
      </div>
      <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
      <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded mb-1" />
      <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-3xl mb-4">
        📋
      </div>
      <h2 className="text-lg font-bold text-slate-600 dark:text-slate-400 mb-1">
        No SOS Requests Yet
      </h2>
      <p className="text-sm text-slate-400 dark:text-slate-500 mb-6 max-w-xs">
        If you ever need emergency help, submit an SOS request and it will appear here.
      </p>
      <a
        href="/sos/create"
        className="inline-flex py-3 px-6 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors"
      >
        🆘 Create New SOS
      </a>
    </div>
  );
}

function RequestCard({ req }: { req: SosRequestRow }) {
  const typeInfo = EMERGENCY_MAP[req.emergency_type] ?? { emoji: "❗", label: req.emergency_type };
  const statusStyle = STATUS_STYLES[req.status] ?? STATUS_STYLES.pending;
  const severityStyle = SEVERITY_STYLES[req.severity] ?? { label: req.severity, dot: "bg-slate-400" };

  const totalPeople = req.adults_count + req.children_count + req.elderly_count + req.injured_count;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/40 p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-xl shrink-0">{typeInfo.emoji}</span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate font-mono tracking-tight">
              {req.ticket_number}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              {timeAgo(req.created_at)}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border leading-5",
            statusStyle.classes,
          )}
        >
          {statusStyle.label}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
        <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <span className={cn("w-2 h-2 rounded-full", severityStyle.dot)} />
          {severityStyle.label}
        </span>
        <span className="text-xs text-slate-400 dark:text-slate-500">·</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">{typeInfo.label}</span>
        {totalPeople > 0 && (
          <>
            <span className="text-xs text-slate-400 dark:text-slate-500">·</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {totalPeople} {totalPeople === 1 ? "person" : "people"}
            </span>
          </>
        )}
      </div>

      {req.address && (
        <p className="text-xs text-slate-400 dark:text-slate-500 truncate mb-2">
          📍 {req.address}
        </p>
      )}

      {req.description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
          {req.description}
        </p>
      )}
    </div>
  );
}

export default function MyRequestsPage() {
  const [requests, setRequests] = useState<SosRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetch() {
      const { data, error } = await getMyRequests();
      if (cancelled) return;
      if (error) {
        setError(error);
      } else {
        setRequests(data ?? []);
      }
      setLoading(false);
    }
    fetch();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">📋</span>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-slate-900 dark:text-white truncate">
              My SOS Requests
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {loading ? "Loading..." : `${requests.length} request${requests.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <a
            href="/sos/create"
            className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors"
          >
            <span>🆘</span> New SOS
          </a>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-5 pb-8">
        {loading && (
          <div className="flex flex-col gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {!loading && error && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm font-semibold flex items-center gap-2">
            <span>⚠️</span>
            {error}
          </div>
        )}

        {!loading && !error && requests.length === 0 && <EmptyState />}

        {!loading && !error && requests.length > 0 && (
          <div className="flex flex-col gap-3">
            {requests.map((req) => (
              <RequestCard key={req.id} req={req} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
