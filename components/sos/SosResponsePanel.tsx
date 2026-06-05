"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

import {
  getAllSosRequests,
  assignTeamToSosRequest,
  updateSosRequestStatus,
  getSosRequestAssignments,
  type SosRequestWithProfile,
  type SosAssignment,
} from "@/lib/sos/actions";

const RESOURCE_LABELS: Record<string, string> = {
  rescue_team: "Personnel Count",
  ambulance_team: "Ambulances",
  fire_response: "Fire Trucks",
};

// ─── Priority computation ───────────────────────────────────────────

type Priority = "critical" | "high" | "medium" | "low";

const PRIORITY_ORDER: Record<Priority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const PRIORITY_STYLES: Record<Priority, string> = {
  critical: "border-red-500/50 bg-red-500/10 shadow-red-500/10",
  high: "border-orange-500/40 bg-orange-500/5 shadow-orange-500/5",
  medium: "border-yellow-500/30 bg-yellow-500/5",
  low: "border-slate-600/30 bg-slate-800/30",
};

const PRIORITY_BADGE: Record<Priority, string> = {
  critical: "bg-red-600 text-white",
  high: "bg-orange-600 text-white",
  medium: "bg-yellow-600 text-black",
  low: "bg-slate-600 text-slate-200",
};

const SEVERITY_WEIGHT: Record<string, number> = {
  critical: 100,
  high: 50,
  moderate: 20,
  low: 0,
};

function computePriority(r: SosRequestWithProfile): Priority {
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

// ─── Helpers ────────────────────────────────────────────────────────

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

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  acknowledged: "Acknowledged",
  in_progress: "In Progress",
  rescued: "Rescued",
  closed: "Closed",
  cancelled: "Cancelled",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-400",
  acknowledged: "bg-blue-500/15 text-blue-400",
  in_progress: "bg-orange-500/15 text-orange-400",
  rescued: "bg-emerald-500/15 text-emerald-400",
  closed: "bg-slate-500/15 text-slate-400",
  cancelled: "bg-red-500/15 text-red-400",
};

// ─── Assign Modal ───────────────────────────────────────────────────

const TEAM_OPTIONS = [
  { value: "rescue_team", label: "Rescue Team" },
  { value: "ambulance_team", label: "Ambulance Team" },
  { value: "fire_response", label: "Fire Response" },
];

const AssignModal = ({
  request,
  existingTeams,
  onClose,
}: {
  request: SosRequestWithProfile;
  existingTeams: string[];
  onClose: () => void;
}) => {
  const queryClient = useQueryClient();
  const availableTeams = TEAM_OPTIONS.filter((t) => !existingTeams.includes(t.value));
  const [teamType, setTeamType] = useState(availableTeams[0]?.value ?? "");
  const [eta, setEta] = useState("");
  const [resourceCount, setResourceCount] = useState("1");

  const assignMut = useMutation({
    mutationFn: () =>
      assignTeamToSosRequest(
        request.id,
        teamType,
        eta ? parseInt(eta) : undefined,
        resourceCount ? parseInt(resourceCount) : 1,
      ),
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ["sos-requests"] });
        queryClient.invalidateQueries({ queryKey: ["sos-assignments"] });
        onClose();
      }
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-700/50 bg-slate-900 p-6 shadow-2xl">
        <h3 className="text-sm font-semibold text-slate-100">
          Assign Team — {request.ticket_number}
        </h3>
        <p className="mt-1 text-xs text-slate-500">{request.address || "No address"}</p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Team Type</label>
            <select
              value={teamType}
              onChange={(e) => setTeamType(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-slate-200 outline-none focus:border-teal-600"
            >
              {availableTeams.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            {existingTeams.length > 0 && (
              <p className="mt-1 text-[10px] text-slate-500">
                Already assigned: {existingTeams.map((t) => TEAM_OPTIONS.find((o) => o.value === t)?.label || t).join(", ")}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">
              {RESOURCE_LABELS[teamType] || "Resource Count"}
            </label>
            <input
              type="number"
              min="1"
              value={resourceCount}
              onChange={(e) => setResourceCount(e.target.value)}
              placeholder="e.g. 5"
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-slate-200 outline-none focus:border-teal-600 placeholder-slate-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">
              ETA (minutes, optional)
            </label>
            <input
              type="number"
              value={eta}
              onChange={(e) => setEta(e.target.value)}
              placeholder="e.g. 15"
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-slate-200 outline-none focus:border-teal-600 placeholder-slate-500"
            />
          </div>

          {assignMut.data?.error && (
            <div className="rounded-xl bg-red-500/10 p-3 text-xs text-red-400">
              {assignMut.data.error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-700 px-4 py-2 text-xs text-slate-400"
            >
              Cancel
            </button>
            <button
              onClick={() => assignMut.mutate()}
              disabled={assignMut.isPending}
              className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-teal-500 disabled:opacity-50"
            >
              {assignMut.isPending ? "Assigning..." : "Assign Team"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Detail Modal ───────────────────────────────────────────────────

const TEAM_LABELS: Record<string, string> = {
  rescue_team: "Rescue Team",
  ambulance_team: "Ambulance Team",
  fire_response: "Fire Response",
};

const DetailModal = ({
  request,
  onClose,
  onAssign,
}: {
  request: SosRequestWithProfile;
  onClose: () => void;
  onAssign: (existingTeams: string[]) => void;
}) => {
  const { data: assignments } = useQuery({
    queryKey: ["sos-assignments", request.id],
    queryFn: () => getSosRequestAssignments(request.id),
  });

  const queryClient = useQueryClient();
  const assignedTeams = (assignments?.data ?? []).map((a) => a.assigned_team);
  const assignedList = assignments?.data ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-700/50 bg-slate-900/95 p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-slate-100">{request.ticket_number}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[request.status]}`}>
                {STATUS_LABELS[request.status] || request.status}
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${PRIORITY_BADGE[computePriority(request)]}`}>
                {computePriority(request).toUpperCase()}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {EMERGENCY_LABELS[request.emergency_type] || request.emergency_type}
              {request.severity ? ` · ${request.severity}` : ""}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-lg">&times;</button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 text-sm">
          <div>
            <span className="text-xs text-slate-500">Address</span>
            <p className="text-slate-200">{request.address || "N/A"}</p>
          </div>
          <div>
            <span className="text-xs text-slate-500">People Affected</span>
            <p className="text-slate-200">
              {request.adults_count || 0} adults, {request.children_count || 0} children,
              {request.elderly_count || 0} elderly
              {request.injured_count ? `, ${request.injured_count} injured` : ""}
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-500">Contact</span>
            <p className="text-slate-200">{request.phone_number || "N/A"}</p>
          </div>
          <div>
            <span className="text-xs text-slate-500">Submitted By</span>
            <p className="text-slate-200">{request.profiles?.full_name || "Unknown"}</p>
          </div>
          <div>
            <span className="text-xs text-slate-500">Submitted At</span>
            <p className="text-slate-400">{new Date(request.created_at).toLocaleString("en-IN")}</p>
          </div>
          {request.alternate_contact && (
            <div>
              <span className="text-xs text-slate-500">Alternate Contact</span>
              <p className="text-slate-200">{request.alternate_contact}</p>
            </div>
          )}
        </div>

        {request.description && (
          <div className="mt-4">
            <span className="text-xs text-slate-500">Description</span>
            <p className="mt-1 text-sm text-slate-300">{request.description}</p>
          </div>
        )}

        {request.immediate_needs && (request.immediate_needs as string[]).length > 0 && (
          <div className="mt-4">
            <span className="text-xs text-slate-500">Immediate Needs</span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {(request.immediate_needs as string[]).map((need, i) => (
                <span key={i} className="rounded-lg bg-slate-800 px-2 py-1 text-[10px] text-slate-300">{need}</span>
              ))}
            </div>
          </div>
        )}

        {/* Assigned Teams */}
        <div className="mt-5 border-t border-slate-800 pt-4">
          <span className="text-xs font-medium text-slate-400">Assigned Teams</span>
          {assignedList.length === 0 ? (
            <p className="mt-2 text-xs text-slate-600">No teams assigned yet.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {assignedList.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-xl border border-slate-700/50 bg-slate-800/40 px-3 py-2"
                >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-200">
                        {TEAM_LABELS[a.assigned_team] || a.assigned_team}
                      </span>
                      {a.resource_count > 1 && (
                        <span className="text-[10px] text-slate-500">{a.resource_count}x</span>
                      )}
                      {a.eta && (
                        <span className="text-[10px] text-slate-500">ETA {a.eta}min</span>
                      )}
                    </div>
                  <span className="text-[10px] text-slate-500">
                    {new Date(a.dispatch_time).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-800 pt-4">
          <button
            onClick={() => onAssign(assignedTeams)}
            className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-medium text-white transition hover:bg-teal-500"
          >
            {assignedTeams.length === 0 ? "Assign Team" : "Assign Another Team"}
          </button>
          {request.status !== "closed" && request.status !== "cancelled" && (
            <>
              {request.status !== "rescued" && (
                <button
                  onClick={async () => {
                    const nextStatus =
                      request.status === "pending"
                        ? "acknowledged"
                        : request.status === "acknowledged"
                          ? "in_progress"
                          : "rescued";
                    await updateSosRequestStatus(request.id, nextStatus);
                    queryClient.invalidateQueries({ queryKey: ["sos-requests"] });
                    queryClient.invalidateQueries({ queryKey: ["sos-assignments"] });
                    onClose();
                  }}
                  className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-600"
                >
                  Mark {request.status === "pending" ? "Acknowledged" : request.status === "acknowledged" ? "In Progress" : "Rescued"}
                </button>
              )}
              <button
                onClick={async () => {
                  await updateSosRequestStatus(request.id, "closed");
                  queryClient.invalidateQueries({ queryKey: ["sos-requests"] });
                  queryClient.invalidateQueries({ queryKey: ["sos-assignments"] });
                  onClose();
                }}
                className="rounded-xl border border-red-700/50 bg-red-500/10 px-4 py-2 text-xs font-medium text-red-400 transition hover:bg-red-500/20"
              >
                Close Request
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── SOS Request Card ───────────────────────────────────────────────

const SosRequestCard = ({
  request,
  onSelect,
}: {
  request: SosRequestWithProfile;
  onSelect: () => void;
}) => {
  const priority = computePriority(request);
  const totalPeople =
    (request.adults_count || 0) +
    (request.children_count || 0) +
    (request.elderly_count || 0);

  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer rounded-2xl border p-4 backdrop-blur-sm transition hover:brightness-110 ${PRIORITY_STYLES[priority]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate text-xs font-mono font-semibold text-slate-300">
            {request.ticket_number}
          </span>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${PRIORITY_BADGE[priority]}`}>
            {priority.toUpperCase()}
          </span>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[request.status]}`}>
          {STATUS_LABELS[request.status] || request.status}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-2 text-xs">
        <span className="rounded-md bg-slate-800/80 px-1.5 py-0.5 text-slate-400">
          {EMERGENCY_LABELS[request.emergency_type] || request.emergency_type}
        </span>
        {request.severity && (
          <span className="capitalize text-slate-500">{request.severity}</span>
        )}
      </div>

      <p className="mt-2 text-xs text-slate-400 truncate">
        {request.address || "No address"}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500">
        <span>{totalPeople} people</span>
        {request.injured_count > 0 && <span className="text-red-400">{request.injured_count} injured</span>}
        <span>{new Date(request.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
      </div>
    </div>
  );
};

// ─── Main Panel ─────────────────────────────────────────────────────

export const SosResponsePanel = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [detailRequest, setDetailRequest] = useState<SosRequestWithProfile | null>(null);
  const [assignRequest, setAssignRequest] = useState<SosRequestWithProfile | null>(null);
  const [assignExistingTeams, setAssignExistingTeams] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["sos-requests", statusFilter],
    queryFn: () =>
      getAllSosRequests(
        statusFilter !== "all" ? { status: statusFilter } : undefined,
      ),
    refetchInterval: 15000,
  });

  const requests = data?.data ?? [];

  const sorted = useMemo(
    () =>
      [...requests].sort((a, b) => {
        const pa = PRIORITY_ORDER[computePriority(a)];
        const pb = PRIORITY_ORDER[computePriority(b)];
        if (pa !== pb) return pa - pb;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }),
    [requests],
  );

  useEffect(() => {
    const client = createClient();
    const channel = client
      .channel("sos-response-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sos_requests" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["sos-requests"] });
        },
      )
      .subscribe();

    return () => { client.removeChannel(channel); };
  }, [queryClient]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">SOS Response Management</h2>
          <p className="mt-1 text-sm text-slate-500">
            Monitor, prioritize, and dispatch teams to incoming SOS requests.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
            <span className="text-xs font-medium text-red-400">
              {requests.filter((r) => r.status === "pending").length} pending
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-medium text-emerald-400">
              {requests.filter((r) => r.status === "rescued" || r.status === "closed").length} resolved
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-300 outline-none focus:border-teal-600"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="in_progress">In Progress</option>
          <option value="rescued">Rescued</option>
          <option value="closed">Closed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-900/60" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="text-center">
            <p className="text-sm font-medium text-slate-400">No SOS requests found</p>
            <p className="mt-1 text-xs text-slate-600">
              {statusFilter !== "all"
                ? "No requests match the selected status."
                : "All requests have been resolved."}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map((r) => (
            <SosRequestCard
              key={r.id}
              request={r}
              onSelect={() => setDetailRequest(r)}
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {detailRequest && (
        <DetailModal
          request={detailRequest}
          onClose={() => { setDetailRequest(null); queryClient.invalidateQueries({ queryKey: ["sos-requests"] }); }}
          onAssign={(existingTeams) => { setAssignExistingTeams(existingTeams); setAssignRequest(detailRequest); setDetailRequest(null); }}
        />
      )}

      {/* Assign Modal */}
      {assignRequest && (
        <AssignModal
          request={assignRequest}
          existingTeams={assignExistingTeams}
          onClose={() => { setAssignRequest(null); queryClient.invalidateQueries({ queryKey: ["sos-requests"] }); }}
        />
      )}
    </div>
  );
};
