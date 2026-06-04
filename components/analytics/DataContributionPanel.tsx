"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  getContributions,
  getContributionById,
  approveContribution,
  rejectContribution,
  type ContributionRow,
} from "@/lib/contributions/actions";

// --- Helpers ---

const TYPE_LABELS: Record<string, string> = { hospital: "Hospital", shelter: "Shelter", incident: "Incident" };
const TYPE_COLORS: Record<string, string> = { hospital: "bg-teal-500/15 text-teal-400", shelter: "bg-amber-500/15 text-amber-400", incident: "bg-red-500/15 text-red-400" };
const STATUS_COLORS: Record<string, string> = { pending: "bg-yellow-500/15 text-yellow-400", verified: "bg-emerald-500/15 text-emerald-400", rejected: "bg-red-500/15 text-red-400" };

const confidenceColor = (s: number) =>
  s >= 0.8 ? "text-emerald-400" : s >= 0.6 ? "text-amber-400" : "text-slate-500";

// --- Review Drawer ---

const ReviewDrawer = ({ id, onClose }: { id: string; onClose: () => void }) => {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, unknown> | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [msg, setMsg] = useState("");

  const { data: contrib, isLoading } = useQuery({
    queryKey: ["contribution", id], queryFn: () => getContributionById(id), enabled: !!id,
  });

  const approveMut = useMutation({
    mutationFn: () => approveContribution(id, notes || undefined, editing ? editData ?? undefined : undefined),
    onSuccess: (res) => { setMsg(res.success ?? res.error ?? ""); if (res.success) { queryClient.invalidateQueries({ queryKey: ["contributions"] }); setTimeout(onClose, 1200); } },
  });

  const rejectMut = useMutation({
    mutationFn: () => rejectContribution(id, rejectReason, notes || undefined),
    onSuccess: (res) => { setMsg(res.success ?? res.error ?? ""); if (res.success) { queryClient.invalidateQueries({ queryKey: ["contributions"] }); setTimeout(onClose, 1200); } },
  });

  if (isLoading) return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="bg-black/40 flex-1" onClick={onClose} />
      <div className="w-full max-w-lg border-l border-slate-800 bg-slate-950 p-6 shadow-2xl overflow-y-auto">
        <div className="mt-8 space-y-4 animate-pulse">
          <div className="h-6 w-2/3 rounded bg-slate-800" />
          <div className="h-4 w-1/2 rounded bg-slate-800" />
          <div className="h-20 w-full rounded bg-slate-800" />
        </div>
      </div>
    </div>
  );

  if (!contrib) return null;

  const d = contrib.data ?? {};
  const isPending = contrib.status === "pending";

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="bg-black/40 flex-1" onClick={onClose} />
      <div className="w-full max-w-lg border-l border-slate-800 bg-slate-950 p-6 shadow-2xl overflow-y-auto">
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-500 hover:text-slate-300 text-lg">&times;</button>

        <div className="mt-4 space-y-5">
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${TYPE_COLORS[contrib.contribution_type]}`}>{TYPE_LABELS[contrib.contribution_type]}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[contrib.status]}`}>{contrib.status}</span>
            {contrib.confidence_score > 0 && (
              <span className={`text-[10px] font-mono ${confidenceColor(contrib.confidence_score)}`}>
                {(contrib.confidence_score * 100).toFixed(0)}% confidence
              </span>
            )}
          </div>

          <h2 className="text-lg font-semibold text-slate-100">{contrib.title}</h2>

          {contrib.duplicate_warning && (
            <div className="rounded-xl border border-amber-700/50 bg-amber-500/10 p-3 text-xs text-amber-300">
              ⚠ {contrib.duplicate_warning}
            </div>
          )}

          {contrib.description && <p className="text-sm text-slate-300">{contrib.description}</p>}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-xs text-slate-500">Location</span><p className="text-slate-200">{contrib.location}</p></div>
            <div><span className="text-xs text-slate-500">City / State</span><p className="text-slate-200">{contrib.city}, {contrib.state}</p></div>
            {(contrib.latitude != null && contrib.longitude != null) && (
              <div className="col-span-2"><span className="text-xs text-slate-500">Coordinates</span><p className="font-mono text-xs text-slate-400">{contrib.latitude.toFixed(4)}, {contrib.longitude.toFixed(4)}</p></div>
            )}
            <div><span className="text-xs text-slate-500">Submitted by</span><p className="text-slate-400">{contrib.submitter_name ?? "Anonymous"}</p></div>
            <div><span className="text-xs text-slate-500">Submitted</span><p className="text-slate-400">{new Date(contrib.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p></div>
          </div>

          {/* Data fields */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Data Fields</h4>
            {editing ? (
              <textarea
                value={JSON.stringify(editData ?? d, null, 2)}
                onChange={(e) => { try { setEditData(JSON.parse(e.target.value)); } catch { /* ignore */ } }}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/80 p-3 text-xs font-mono text-slate-200 outline-none focus:border-teal-600 min-h-[120px]"
              />
            ) : (
              <pre className="rounded-xl bg-slate-900/60 p-3 text-xs font-mono text-slate-400 overflow-x-auto">{JSON.stringify(d, null, 2)}</pre>
            )}
          </div>

          {contrib.media_urls?.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Media ({contrib.media_urls.length})</h4>
              <div className="flex flex-wrap gap-2">
                {contrib.media_urls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs text-teal-400 transition hover:border-teal-600">
                    Media #{i + 1}
                  </a>
                ))}
              </div>
            </div>
          )}

          {contrib.rejection_reason && (
            <div className="rounded-xl border border-red-800/50 bg-red-500/10 p-3">
              <p className="text-xs font-medium text-red-400">Rejection Reason</p>
              <p className="mt-1 text-sm text-slate-300">{contrib.rejection_reason}</p>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-slate-500">Reviewer Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add notes..." className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/80 p-3 text-sm text-slate-200 outline-none focus:border-teal-600 min-h-[60px] placeholder-slate-500" />
          </div>

          {msg && (
            <div className={`rounded-xl p-3 text-sm ${msg.startsWith("Fail") ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}>{msg}</div>
          )}

          {isPending && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
              <button onClick={() => setEditing((e) => !e)} className="rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-600">{editing ? "Preview" : "Edit Data"}</button>
              <button onClick={() => approveMut.mutate()} disabled={approveMut.isPending} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50">
                {approveMut.isPending ? "Approving..." : "Approve"}
              </button>
              <button onClick={() => setRejectOpen(true)} className="rounded-xl border border-red-700 bg-red-500/10 px-4 py-2 text-xs font-medium text-red-400 transition hover:bg-red-500/20">Reject</button>
            </div>
          )}
        </div>

        {/* Reject modal */}
        {rejectOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
              <h3 className="text-sm font-semibold text-slate-200">Reject Contribution</h3>
              <p className="mt-1 text-xs text-slate-500">Provide a reason for rejection (required).</p>
              <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for rejection..." className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-900/80 p-3 text-sm text-slate-200 outline-none focus:border-red-600 min-h-[80px] placeholder-slate-500" />
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => { setRejectOpen(false); setRejectReason(""); }} className="rounded-xl border border-slate-700 px-4 py-2 text-xs text-slate-400">Cancel</button>
                <button onClick={() => rejectMut.mutate()} disabled={rejectMut.isPending || rejectReason.trim().length < 5} className="rounded-xl bg-red-600 px-4 py-2 text-xs font-medium text-white disabled:opacity-50">
                  {rejectMut.isPending ? "Rejecting..." : "Confirm Reject"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Contribution Card ---

const ContributionCard = ({ c, onClick }: { c: ContributionRow; onClick: () => void }) => (
  <div onClick={onClick} className="cursor-pointer rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 backdrop-blur-sm transition hover:border-slate-600 hover:bg-slate-900/80">
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TYPE_COLORS[c.contribution_type]}`}>{TYPE_LABELS[c.contribution_type]}</span>
        {c.confidence_score > 0 && (
          <span className={`text-[10px] font-mono ${confidenceColor(c.confidence_score)}`}>{(c.confidence_score * 100).toFixed(0)}%</span>
        )}
      </div>
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[c.status]}`}>{c.status}</span>
    </div>

    <h3 className="mt-2 text-sm font-semibold text-slate-200">{c.title}</h3>
    {c.description && <p className="mt-1 text-xs text-slate-500 line-clamp-2">{c.description}</p>}

    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-500">
      <span>{c.city}, {c.state}</span>
      <span>{new Date(c.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
      {c.submitter_name && <span>by {c.submitter_name}</span>}
    </div>

    {c.duplicate_warning && (
      <div className="mt-2 rounded-lg border border-amber-700/40 bg-amber-500/10 px-2.5 py-1 text-[10px] text-amber-300">⚠ {c.duplicate_warning}</div>
    )}

    {c.media_urls?.length > 0 && (
      <div className="mt-2 flex gap-1">
        {c.media_urls.map((_, i) => <span key={i} className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] text-slate-500">📷 #{i + 1}</span>)}
      </div>
    )}

    {c.status === "rejected" && c.rejection_reason && (
      <div className="mt-2 rounded-lg bg-red-500/10 px-2.5 py-1 text-[10px] text-red-400">{c.rejection_reason}</div>
    )}
  </div>
);

// --- Main Panel ---

export const DataContributionPanel = () => {
  const [tab, setTab] = useState<"pending" | "verified" | "rejected">("pending");
  const [drawerId, setDrawerId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["contributions", tab], queryFn: () => getContributions(tab), staleTime: 30000,
  });

  const items = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">Data Contributions</h2>
        <p className="mt-1 text-sm text-slate-500">Review, verify, and manage community-submitted data for hospitals, shelters, and incidents.</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/50 p-1">
        {(["pending", "verified", "rejected"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium capitalize transition ${
            tab === t ? "bg-teal-500/15 text-teal-300 shadow-sm" : "text-slate-400 hover:text-slate-200"
          }`}>
            {t} ({items.length})
          </button>
        ))}
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-900/60" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="text-center">
            <p className="text-sm font-medium text-slate-400">No {tab} contributions</p>
            <p className="mt-1 text-xs text-slate-600">
              {tab === "pending" ? "New submissions will appear here for review." :
               tab === "verified" ? "Approved contributions will appear here." :
               "Rejected contributions will appear here."}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <ContributionCard key={c.id} c={c} onClick={() => setDrawerId(c.id)} />
          ))}
        </div>
      )}

      {/* Drawer */}
      {drawerId && <ReviewDrawer id={drawerId} onClose={() => setDrawerId(null)} />}
    </div>
  );
};
