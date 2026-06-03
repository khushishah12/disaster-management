"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getRequestById, cancelSosRequest, updateSosRequest, type SosRequestRow, type EditableSosFields } from "@/lib/sos/actions";
import { cn } from "@/lib/utils";

const EMERGENCY_TYPES = [
  { value: "medical", emoji: "🆘", label: "Medical" },
  { value: "fire", emoji: "🔥", label: "Fire" },
  { value: "flood", emoji: "🌊", label: "Flood" },
  { value: "earthquake", emoji: "🏚️", label: "Earthquake" },
  { value: "cyclone", emoji: "🌀", label: "Cyclone" },
  { value: "landslide", emoji: "⛰️", label: "Landslide" },
  { value: "structural_collapse", emoji: "🏗️", label: "Collapse" },
  { value: "road_accident", emoji: "🚗", label: "Accident" },
  { value: "missing_person", emoji: "🔍", label: "Missing" },
  { value: "other", emoji: "❗", label: "Other" },
];

const EMERGENCY_MAP: Record<string, { emoji: string; label: string }> =
  Object.fromEntries(EMERGENCY_TYPES.map((t) => [t.value, { emoji: t.emoji, label: t.label }]));

const SEVERITIES = [
  { value: "low", label: "Low", dot: "bg-green-500" },
  { value: "moderate", label: "Moderate", dot: "bg-amber-500" },
  { value: "high", label: "High", dot: "bg-orange-500" },
  { value: "critical", label: "Critical", dot: "bg-red-500" },
];

const SEVERITY_STYLES: Record<string, { label: string; dot: string }> =
  Object.fromEntries(SEVERITIES.map((s) => [s.value, { label: s.label, dot: s.dot }]));

const STATUS_STYLES: Record<string, { label: string; classes: string }> = {
  pending: { label: "Pending", classes: "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600" },
  acknowledged: { label: "Acknowledged", classes: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700" },
  in_progress: { label: "In Progress", classes: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700" },
  rescued: { label: "Rescued", classes: "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700" },
  closed: { label: "Closed", classes: "bg-slate-100 text-slate-500 border-slate-300 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-600" },
  cancelled: { label: "Cancelled", classes: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700" },
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

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-slate-100 dark:border-slate-700/50 last:border-0">
      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0">{label}</span>
      <span className="text-sm text-slate-800 dark:text-slate-200 text-right font-medium">{children || "—"}</span>
    </div>
  );
}

export default function RequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [req, setReq] = useState<SosRequestRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelResult, setCancelResult] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditableSosFields | null>(null);
  const [saving, setSaving] = useState(false);
  const [editResult, setEditResult] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    async function fetch() {
      const { data, error } = await getRequestById(id);
      if (cancelled) return;
      if (error) setError(error);
      else setReq(data);
      setLoading(false);
    }
    fetch();
    return () => { cancelled = true; };
  }, [id]);

  const handleCancel = useCallback(async () => {
    if (!req || req.status !== "pending") return;
    setCancelling(true);
    setCancelResult(null);
    const res = await cancelSosRequest(req.id);
    if (res.success) {
      setReq({ ...req, status: "cancelled" });
      setCancelResult(res.success);
    } else {
      setCancelResult(res.error ?? "Failed to cancel.");
    }
    setCancelling(false);
  }, [req]);

  function openEdit() {
    if (!req) return;
    setEditForm({
      emergency_type: req.emergency_type,
      severity: req.severity,
      adults_count: req.adults_count,
      children_count: req.children_count,
      elderly_count: req.elderly_count,
      injured_count: req.injured_count,
      address: req.address ?? "",
      description: req.description ?? "",
      immediate_needs: req.immediate_needs ?? [],
      phone_number: req.phone_number ?? "",
      alternate_contact: req.alternate_contact ?? "",
    });
    setEditResult(null);
    setEditOpen(true);
  }

  async function handleSaveEdit() {
    if (!editForm || !req) return;
    setSaving(true);
    setEditResult(null);
    const res = await updateSosRequest(req.id, editForm);
    if (res.success) {
      // refetch
      const { data } = await getRequestById(req.id);
      if (data) setReq(data);
      setEditResult(res.success);
      setTimeout(() => { setEditOpen(false); }, 1200);
    } else {
      setEditResult(res.error ?? "Failed to update.");
    }
    setSaving(false);
  }

  function updateField<K extends keyof EditableSosFields>(key: K, value: EditableSosFields[K]) {
    if (!editForm) return;
    setEditForm({ ...editForm, [key]: value });
  }

  function toggleNeed(need: string) {
    if (!editForm) return;
    const next = editForm.immediate_needs.includes(need)
      ? editForm.immediate_needs.filter((n) => n !== need)
      : [...editForm.immediate_needs, need];
    setEditForm({ ...editForm, immediate_needs: next });
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-slate-300 dark:border-slate-600 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !req) {
    return (
      <div className="min-h-dvh bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center px-6 text-center">
        <div className="text-4xl mb-4">📋</div>
        <h2 className="text-lg font-bold text-slate-600 dark:text-slate-400 mb-1">Request Not Found</h2>
        <p className="text-sm text-slate-400 dark:text-slate-500 mb-6">{error || "This request could not be found."}</p>
        <a href="/sos/my-requests" className="py-3 px-6 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors">Back to My Requests</a>
      </div>
    );
  }

  const typeInfo = EMERGENCY_MAP[req.emergency_type] ?? { emoji: "❗", label: req.emergency_type };
  const statusStyle = STATUS_STYLES[req.status] ?? STATUS_STYLES.pending;
  const severityStyle = SEVERITY_STYLES[req.severity] ?? { label: req.severity, dot: "bg-slate-400" };
  const totalPeople = req.adults_count + req.children_count + req.elderly_count + req.injured_count;

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button type="button" onClick={() => router.back()} className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-slate-900 dark:text-white truncate font-mono tracking-tight">{req.ticket_number}</h1>
            <p className="text-xs text-slate-400 dark:text-slate-500">{timeAgo(req.created_at)}</p>
          </div>
          <span className={cn("shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border leading-5", statusStyle.classes)}>
            {statusStyle.label}
          </span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-5 pb-8">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/40 overflow-hidden">
          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-5">
              <span className="text-3xl">{typeInfo.emoji}</span>
              <div>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{typeInfo.label}</p>
                <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  <span className={cn("w-2 h-2 rounded-full", severityStyle.dot)} />
                  {severityStyle.label} severity
                </span>
              </div>
            </div>

            <div className="space-y-0">
              <DetailRow label="Status">
                <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border", statusStyle.classes)}>{statusStyle.label}</span>
              </DetailRow>
              <DetailRow label="People">{totalPeople > 0 ? `${totalPeople} total` : "None reported"}</DetailRow>
              {req.adults_count > 0 && <DetailRow label="  Adults">{req.adults_count}</DetailRow>}
              {req.children_count > 0 && <DetailRow label="  Children">{req.children_count}</DetailRow>}
              {req.elderly_count > 0 && <DetailRow label="  Elderly">{req.elderly_count}</DetailRow>}
              {req.injured_count > 0 && <DetailRow label="  Injured">{req.injured_count}</DetailRow>}
              <DetailRow label="Location">{req.latitude.toFixed(4)}, {req.longitude.toFixed(4)}</DetailRow>
              {req.address && <DetailRow label="Address">{req.address}</DetailRow>}
              <DetailRow label="Updated">{timeAgo(req.updated_at)}</DetailRow>
            </div>
          </div>
        </div>

        {req.description && (
          <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/40 p-5 sm:p-6">
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-red-500 dark:text-red-400 mb-2">Description</h3>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{req.description}</p>
          </div>
        )}

        {req.immediate_needs && req.immediate_needs.length > 0 && (
          <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/40 p-5 sm:p-6">
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-red-500 dark:text-red-400 mb-3">Immediate Needs</h3>
            <div className="flex flex-wrap gap-2">
              {req.immediate_needs.map((need) => (
                <span key={need} className="px-3 py-1 rounded-full bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-xs font-semibold border border-red-200 dark:border-red-800">{need}</span>
              ))}
            </div>
          </div>
        )}

        {req.status === "pending" && (
          <div className="mt-6 space-y-3">
            {cancelResult && (
              <div className={cn(
                "p-3 rounded-xl text-sm font-semibold flex items-center gap-2",
                cancelResult.includes("successfully") || cancelResult.includes("Successfully")
                  ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"
                  : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
              )}>
                {cancelResult.includes("successfully") || cancelResult.includes("Successfully") ? "✅" : "⚠️"} {cancelResult}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={openEdit}
                className="py-3.5 rounded-xl border-2 border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 text-sm font-extrabold transition-all hover:bg-amber-50 dark:hover:bg-amber-900/20 active:scale-[0.98]"
              >
                ✏️ Edit Request
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="py-3.5 rounded-xl border-2 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-sm font-extrabold transition-all hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                {cancelling ? "Cancelling..." : "🗑️ Cancel"}
              </button>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
              Only pending requests can be edited or cancelled.
            </p>
          </div>
        )}

        {req.status !== "pending" && (
          <div className="mt-6 flex justify-center">
            <a href="/sos/my-requests" className="py-3 px-6 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors">Back to My Requests</a>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editOpen && editForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={() => { if (!saving) setEditOpen(false); }}>
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-4 shrink-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Edit SOS Request</h2>
              <button type="button" onClick={() => { if (!saving) setEditOpen(false); }} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4 space-y-4">
              <fieldset>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Emergency Type</label>
                <select value={editForm.emergency_type} onChange={(e) => updateField("emergency_type", e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30 px-3 py-2 text-sm text-slate-900 dark:text-slate-200 focus-visible:outline-2 focus-visible:outline-red-500">
                  {EMERGENCY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
                  ))}
                </select>
              </fieldset>
              <fieldset>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Severity</label>
                <select value={editForm.severity} onChange={(e) => updateField("severity", e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30 px-3 py-2 text-sm text-slate-900 dark:text-slate-200 focus-visible:outline-2 focus-visible:outline-red-500">
                  {SEVERITIES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </fieldset>
              <div className="grid grid-cols-2 gap-3">
                {(["adults_count", "children_count", "elderly_count", "injured_count"] as const).map((field) => (
                  <fieldset key={field}>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 capitalize">{field.replace("_count", "")}</label>
                    <input type="number" min="0" value={editForm[field]} onChange={(e) => updateField(field, Math.max(0, parseInt(e.target.value) || 0))} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30 px-3 py-2 text-sm text-slate-900 dark:text-slate-200 focus-visible:outline-2 focus-visible:outline-red-500" />
                  </fieldset>
                ))}
              </div>
              <fieldset>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Address</label>
                <input type="text" value={editForm.address} onChange={(e) => updateField("address", e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30 px-3 py-2 text-sm text-slate-900 dark:text-slate-200 focus-visible:outline-2 focus-visible:outline-red-500" />
              </fieldset>
              <fieldset>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Description</label>
                <textarea value={editForm.description} onChange={(e) => updateField("description", e.target.value)} rows={3} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30 px-3 py-2 text-sm text-slate-900 dark:text-slate-200 focus-visible:outline-2 focus-visible:outline-red-500 resize-none" />
              </fieldset>
              <fieldset>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Immediate Needs</label>
                <div className="flex flex-wrap gap-2">
                  {["Medical Aid", "Rescue", "Food", "Water", "Shelter", "Fire Extinguishing", "Evacuation", "Search"].map((need) => (
                    <button
                      key={need}
                      type="button"
                      onClick={() => toggleNeed(need)}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-semibold border transition-all",
                        editForm.immediate_needs.includes(need)
                          ? "bg-red-500 text-white border-red-500"
                          : "bg-white dark:bg-slate-800/30 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-red-300"
                      )}
                    >
                      {need}
                    </button>
                  ))}
                </div>
              </fieldset>
              {editResult && (
                <div className={cn(
                  "p-3 rounded-xl text-sm font-semibold flex items-center gap-2",
                  editResult.includes("successfully")
                    ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"
                    : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
                )}>
                  {editResult.includes("successfully") ? "✅" : "⚠️"} {editResult}
                </div>
              )}
            </div>
            <div className="flex gap-3 border-t border-slate-200 dark:border-slate-800 px-5 py-4 shrink-0">
              <button type="button" onClick={() => setEditOpen(false)} disabled={saving} className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 transition hover:bg-slate-50 dark:hover:bg-slate-800">
                Cancel
              </button>
              <button type="button" onClick={handleSaveEdit} disabled={saving} className="flex-1 rounded-xl bg-amber-600 py-2.5 text-sm font-bold text-white transition hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
