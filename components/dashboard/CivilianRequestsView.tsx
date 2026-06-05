"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { getMyRequests, getRequestById, updateSosRequest, cancelSosRequest } from "@/lib/sos/actions";
import type { SosRequestRow } from "@/lib/sos/actions";

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

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  acknowledged: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  in_progress: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  rescued: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  closed: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  cancelled: "bg-red-500/15 text-red-400 border-red-500/30",
};

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  moderate: "bg-amber-400",
  low: "bg-green-500",
};

const EDITABLE_FIELDS = ["emergency_type", "severity", "adults_count", "children_count", "elderly_count", "injured_count", "address", "description", "immediate_needs"] as const;
const EMERGENCY_TYPES = [
  { value: "medical", label: "Medical", emoji: "🆘" },
  { value: "fire", label: "Fire", emoji: "🔥" },
  { value: "flood", label: "Flood", emoji: "🌊" },
  { value: "earthquake", label: "Earthquake", emoji: "🏚️" },
  { value: "cyclone", label: "Cyclone", emoji: "🌀" },
  { value: "landslide", label: "Landslide", emoji: "⛰️" },
  { value: "structural_collapse", label: "Collapse", emoji: "🏗️" },
  { value: "road_accident", label: "Accident", emoji: "🚗" },
  { value: "missing_person", label: "Missing", emoji: "🔍" },
  { value: "other", label: "Other", emoji: "❗" },
] as const;

const SEVERITY_OPTIONS = [
  { value: "critical", label: "Critical", color: "bg-red-600" },
  { value: "high", label: "High", color: "bg-orange-500" },
  { value: "moderate", label: "Moderate", color: "bg-amber-500" },
  { value: "low", label: "Low", color: "bg-green-600" },
] as const;

const IMMEDIATE_NEEDS_OPTIONS = [
  { value: "water", label: "Water", emoji: "🥤" },
  { value: "food", label: "Food", emoji: "🍲" },
  { value: "medical", label: "Medical", emoji: "🏥" },
  { value: "shelter", label: "Shelter", emoji: "🛖" },
  { value: "rescue", label: "Rescue", emoji: "🚁" },
  { value: "light", label: "Light", emoji: "🔦" },
  { value: "communication", label: "Communication", emoji: "📡" },
  { value: "transport", label: "Transport", emoji: "🚗" },
  { value: "power", label: "Power", emoji: "🔌" },
  { value: "ice", label: "Ice/Cooling", emoji: "🧊" },
  { value: "clothing", label: "Clothing", emoji: "👕" },
  { value: "fire_equipment", label: "Fire Equipment", emoji: "🔥" },
] as const;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

type Props = {
  onSelectRequest: (id: string) => void;
  onBack: () => void;
};

export function CivilianRequestsView({ onSelectRequest, onBack }: Props) {
  const { data: requests, isLoading, error } = useQuery({
    queryKey: ["my-requests"],
    queryFn: async () => {
      const res = await getMyRequests();
      return res.data ?? [];
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <h2 className="text-base font-semibold text-slate-100">My Requests</h2>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-800/40" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-800/40 bg-red-900/10 p-4 text-center">
          <p className="text-sm text-red-400">Failed to load requests</p>
        </div>
      )}

      {!isLoading && !error && requests?.length === 0 && (
        <div className="rounded-xl border border-slate-800/40 bg-slate-900/20 p-8 text-center">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-sm text-slate-400 font-semibold">No SOS requests yet</p>
          <p className="text-xs text-slate-500 mt-1">When you send an SOS, it will appear here.</p>
        </div>
      )}

      {!isLoading && !error && requests && requests.length > 0 && (
        <div className="space-y-3">
          {requests.map((req) => {
            const emoji = EMERGENCY_MAP[req.emergency_type]?.emoji ?? "❗";
            return (
              <button
                key={req.id}
                type="button"
                onClick={() => onSelectRequest(req.id)}
                className="w-full text-left rounded-xl border border-slate-800/60 bg-slate-900/40 p-4 transition hover:bg-slate-800/40 hover:border-slate-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl shrink-0">{emoji}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-200 truncate">{req.ticket_number}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{timeAgo(req.created_at)}</p>
                    </div>
                  </div>
                  <span className={cn("shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold", STATUS_STYLES[req.status])}>
                    {req.status.replace(/_/g, " ")}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                  <span className={cn("inline-block h-2 w-2 rounded-full", SEVERITY_STYLES[req.severity] ?? "bg-slate-500")} />
                  <span className="capitalize">{req.severity}</span>
                  <span>{req.adults_count + req.children_count + req.elderly_count + req.injured_count} people</span>
                  {req.address && <span className="truncate hidden sm:inline">{req.address}</span>}
                </div>

                {req.description && (
                  <p className="mt-2 text-xs text-slate-500 line-clamp-1">{req.description}</p>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function CivilianRequestDetail({ requestId, onBack }: { requestId: string; onBack: () => void }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatedFields, setUpdatedFields] = useState<Record<string, any>>({});

  const { data: full, isLoading, error } = useQuery({
    queryKey: ["request-detail", requestId],
    queryFn: async () => {
      const res = await getRequestById(requestId);
      return res.data;
    },
  });

  const req = full as SosRequestRow | undefined;

  const handleEditToggle = () => {
    if (!editing && req) {
      setUpdatedFields({
        emergency_type: req.emergency_type,
        severity: req.severity,
        adults_count: req.adults_count,
        children_count: req.children_count,
        elderly_count: req.elderly_count,
        injured_count: req.injured_count,
        address: req.address ?? "",
        description: req.description ?? "",
        immediate_needs: req.immediate_needs ?? [],
      });
    }
    setEditing(!editing);
  };

  const handleSave = async () => {
    setSaving(true);
    await updateSosRequest(requestId, updatedFields as any);
    setSaving(false);
    setEditing(false);
    queryClient.invalidateQueries({ queryKey: ["request-detail", requestId] });
    queryClient.invalidateQueries({ queryKey: ["my-requests"] });
  };

  const handleCancel = async () => {
    setCancelling(true);
    await cancelSosRequest(requestId);
    setCancelling(false);
    queryClient.invalidateQueries({ queryKey: ["request-detail", requestId] });
    queryClient.invalidateQueries({ queryKey: ["my-requests"] });
    onBack();
  };

  const isPending = req?.status === "pending";

  if (isLoading) {
    return <div className="flex items-center justify-center py-16"><span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-teal-400 border-t-transparent" /></div>;
  }

  if (error || !req) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-red-400">Request not found</p>
        <button type="button" onClick={onBack} className="mt-3 text-xs text-teal-400 hover:text-teal-300">← Back</button>
      </div>
    );
  }

  const totalPeople = req.adults_count + req.children_count + req.elderly_count + req.injured_count;
  const emoji = EMERGENCY_MAP[req.emergency_type]?.emoji ?? "❗";

  function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
    return (
      <div className="flex items-center justify-between rounded-lg bg-slate-800/40 px-3 py-2">
        <span className="text-xs text-slate-400">{label}</span>
        <span className="text-xs font-semibold text-slate-200">{value ?? "—"}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <div>
            <h2 className="text-base font-semibold text-slate-100">{req.ticket_number}</h2>
            <p className="text-xs text-slate-500">{timeAgo(req.created_at)}</p>
          </div>
        </div>
        <span className={cn("rounded-full border px-2.5 py-0.5 text-[10px] font-semibold", STATUS_STYLES[req.status])}>
          {req.status.replace(/_/g, " ")}
        </span>
      </div>

      <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4">
        <div className="space-y-2">
          <DetailRow label="Emergency Type" value={`${emoji} ${EMERGENCY_MAP[req.emergency_type]?.label ?? req.emergency_type}`} />
          <DetailRow label="Severity" value={req.severity} />
          <DetailRow label="Total People" value={`${totalPeople} (${req.adults_count} adults, ${req.children_count} children, ${req.elderly_count} elderly, ${req.injured_count} injured)`} />
          <DetailRow label="Location" value={req.address ? `${req.latitude}, ${req.longitude} — ${req.address}` : `${req.latitude}, ${req.longitude}`} />
          <DetailRow label="Phone" value={req.phone_number} />
          <DetailRow label="Alternate Contact" value={req.alternate_contact} />
          <DetailRow label="Created" value={new Date(req.created_at).toLocaleString()} />
          {req.updated_at && <DetailRow label="Updated" value={new Date(req.updated_at).toLocaleString()} />}
        </div>
      </div>

      {req.description && (
        <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Description</h3>
          <p className="text-sm text-slate-300">{req.description}</p>
        </div>
      )}

      {req.immediate_needs && req.immediate_needs.length > 0 && (
        <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Immediate Needs</h3>
          <div className="flex flex-wrap gap-2">
            {(req.immediate_needs as string[]).map((need) => {
              const meta = IMMEDIATE_NEEDS_OPTIONS.find((o) => o.value === need);
              return (
                <span key={need} className="px-3 py-1.5 rounded-lg bg-red-600/15 text-red-300 text-xs font-semibold">
                  {meta ? `${meta.emoji} ${meta.label}` : need}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {isPending && (
        <div className="flex gap-3">
          <button type="button" onClick={handleEditToggle}
            className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-300 text-sm font-bold transition hover:bg-slate-800">
            {editing ? "Cancel Edit" : "Edit"}
          </button>
          <button type="button" onClick={handleCancel} disabled={cancelling}
            className="flex-1 py-3 rounded-xl bg-red-600/80 text-white text-sm font-bold transition hover:bg-red-600 disabled:opacity-50">
            {cancelling ? "Cancelling..." : "Cancel Request"}
          </button>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-200 mb-4">Edit Request</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Emergency Type</label>
                <select value={updatedFields.emergency_type ?? ""} onChange={(e) => setUpdatedFields((f) => ({ ...f, emergency_type: e.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-200">
                  {EMERGENCY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Severity</label>
                <select value={updatedFields.severity ?? ""} onChange={(e) => setUpdatedFields((f) => ({ ...f, severity: e.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-200">
                  {SEVERITY_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {["adults_count", "children_count", "elderly_count", "injured_count"].map((field) => (
                  <div key={field}>
                    <label className="text-xs font-semibold text-slate-400 block mb-1 capitalize">{field.replace(/_/g, " ")}</label>
                    <input type="number" min="0" value={updatedFields[field] ?? 0} onChange={(e) => setUpdatedFields((f) => ({ ...f, [field]: parseInt(e.target.value) || 0 }))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-200" />
                  </div>
                ))}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Address</label>
                <input type="text" value={updatedFields.address ?? ""} onChange={(e) => setUpdatedFields((f) => ({ ...f, address: e.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-200" />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Description</label>
                <textarea rows={3} value={updatedFields.description ?? ""} onChange={(e) => setUpdatedFields((f) => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-200" />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Immediate Needs</label>
                <div className="flex flex-wrap gap-2">
                  {IMMEDIATE_NEEDS_OPTIONS.map((need) => {
                    const selected = (updatedFields.immediate_needs ?? []).includes(need.value);
                    return (
                      <button key={need.value} type="button" onClick={() => setUpdatedFields((f) => ({
                        ...f,
                        immediate_needs: selected ? f.immediate_needs.filter((n: string) => n !== need.value) : [...(f.immediate_needs ?? []), need.value],
                      }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${selected ? "bg-red-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>
                        {need.emoji} {need.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditing(false)} className="flex-1 py-2.5 rounded-lg border border-slate-600 text-slate-300 text-xs font-bold hover:bg-slate-800">Cancel</button>
                <button type="button" onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-lg bg-teal-600 text-white text-xs font-bold hover:bg-teal-500 disabled:opacity-50">
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
