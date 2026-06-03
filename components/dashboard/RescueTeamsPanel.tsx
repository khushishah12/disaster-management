"use client";

import { useEffect, useState, useTransition } from "react";

import { ROLE_LABELS, type AppRole } from "@/lib/sos/roles";
import {
  completeRescueTask,
  deleteRescueTeamMember,
  getRescueTeamsPage,
  saveRescueTeamMember,
} from "@/lib/rescue-teams/actions";
import { RESCUE_TEAM_PAGE_SIZE, type DisasterRow, type RescueTaskStatus, type RescueTeamMemberRow, type RescueTeamsPageResult } from "@/lib/rescue-teams/types";

type RescueTeamsPanelProps = {
  appRole: AppRole;
};

type MemberFormState = {
  id?: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  base_location: string;
  skills: string;
  notes: string;
  assigned_disaster_id: string;
  task_status: RescueTaskStatus;
  priority: string;
};

const STATUS_OPTIONS: Array<{ value: RescueTaskStatus | "all"; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

const TASK_STATUS_LABELS: Record<RescueTaskStatus, string> = {
  pending: "Pending",
  assigned: "Assigned",
  in_progress: "In progress",
  completed: "Completed",
};

const TASK_STATUS_CLASSES: Record<RescueTaskStatus, string> = {
  pending: "border-slate-700 bg-slate-800/80 text-slate-300",
  assigned: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  in_progress: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  completed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
};

const DISASTER_STATUS_CLASSES: Record<DisasterRow["response_status"], string> = {
  active: "border-red-500/30 bg-red-500/10 text-red-200",
  monitoring: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  resolved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
};

const PRIORITY_LABELS: Record<string, string> = {
  "1": "Priority 1",
  "2": "Priority 2",
  "3": "Priority 3",
};

function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Kolkata",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function emptyForm(): MemberFormState {
  return {
    name: "",
    role: "",
    phone: "",
    email: "",
    base_location: "",
    skills: "",
    notes: "",
    assigned_disaster_id: "",
    task_status: "pending",
    priority: "2",
  };
}

function getAssignmentLabel(member: RescueTeamMemberRow) {
  if (!member.assigned_disaster) {
    return "Unassigned";
  }

  return `${member.assigned_disaster.title} · ${member.assigned_disaster.location}`;
}

function buildFormState(member?: RescueTeamMemberRow | null): MemberFormState {
  if (!member) return emptyForm();

  return {
    id: member.id,
    name: member.name,
    role: member.role,
    phone: member.phone ?? "",
    email: member.email ?? "",
    base_location: member.base_location ?? "",
    skills: member.skills.join(", "),
    notes: member.notes ?? "",
    assigned_disaster_id: member.assigned_disaster_id ?? "",
    task_status: member.task_status,
    priority: String(member.priority ?? 2),
  };
}

export function RescueTeamsPanel({ appRole }: RescueTeamsPanelProps) {
  const canManage = appRole === "coordinator";
  const [pageData, setPageData] = useState<RescueTeamsPageResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RescueTaskStatus | "all">("all");
  const [disasterFilter, setDisasterFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [refreshTick, setRefreshTick] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<MemberFormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [formNotice, setFormNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError(null);

      const result = await getRescueTeamsPage({
        page,
        pageSize: RESCUE_TEAM_PAGE_SIZE,
        search: query,
        status: statusFilter,
        disasterId: disasterFilter,
      });

      if (cancelled) return;

      if (result.error) {
        setError(result.error);
        setPageData(null);
      } else {
        setPageData(result);
        const totalPages = Math.max(1, Math.ceil(result.totalCount / result.pageSize));
        if (page > totalPages) {
          setPage(totalPages);
        }
      }

      setLoading(false);
    }, 200);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [page, query, statusFilter, disasterFilter, refreshTick]);

  const disasters = pageData?.disasters ?? [];
  const members = pageData?.members ?? [];
  const totalPages = Math.max(1, Math.ceil((pageData?.totalCount ?? 0) / RESCUE_TEAM_PAGE_SIZE));
  const totalCount = pageData?.totalCount ?? 0;
  const pageStart = totalCount === 0 ? 0 : (page - 1) * RESCUE_TEAM_PAGE_SIZE + 1;
  const pageEnd = totalCount === 0 ? 0 : Math.min(page * RESCUE_TEAM_PAGE_SIZE, totalCount);

  const pageStats = {
    completed: members.filter((member) => member.task_status === "completed").length,
    unassigned: members.filter((member) => !member.assigned_disaster_id).length,
    active: members.filter((member) => member.task_status !== "completed").length,
  };

  function openCreateModal() {
    setForm(buildFormState(null));
    setFormError(null);
    setFormNotice(null);
    setModalOpen(true);
  }

  function openEditModal(member: RescueTeamMemberRow) {
    setForm(buildFormState(member));
    setFormError(null);
    setFormNotice(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setFormError(null);
    setFormNotice(null);
  }

  function refresh() {
    setRefreshTick((value) => value + 1);
  }

  function updateField<K extends keyof MemberFormState>(key: K, value: MemberFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function selectDisaster(member: RescueTeamMemberRow) {
    openEditModal(member);
  }

  async function submitForm() {
    setFormError(null);
    setFormNotice(null);

    if (!canManage) {
      setFormError("Only disaster coordinators can add or edit team members.");
      return;
    }

    const parsedPriority = Number.parseInt(form.priority, 10);
    const skills = form.skills
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);

    startTransition(async () => {
      const result = await saveRescueTeamMember({
        id: form.id,
        name: form.name,
        role: form.role,
        phone: form.phone,
        email: form.email,
        base_location: form.base_location,
        skills,
        notes: form.notes,
        assigned_disaster_id: form.assigned_disaster_id || null,
        task_status: form.task_status,
        priority: Number.isNaN(parsedPriority) ? 2 : parsedPriority,
      });

      if (result.error) {
        setFormError(result.error);
        return;
      }

      setFormNotice(result.success ?? "Saved successfully.");
      refresh();
      closeModal();
    });
  }

  async function removeMember(memberId: string) {
    if (!canManage) {
      setError("Only disaster coordinators can delete team members.");
      return;
    }

    const confirmDelete = window.confirm("Delete this rescue team member?");
    if (!confirmDelete) return;

    startTransition(async () => {
      const result = await deleteRescueTeamMember(memberId);
      if (result.error) {
        setError(result.error);
        return;
      }

      refresh();
    });
  }

  async function markComplete(memberId: string) {
    if (!canManage) {
      setError("Only disaster coordinators can update completion status.");
      return;
    }

    startTransition(async () => {
      const result = await completeRescueTask(memberId);
      if (result.error) {
        setError(result.error);
        return;
      }

      refresh();
    });
  }

  return (
    <section className="mx-auto w-full max-w-7xl">
      <div className="overflow-hidden rounded-3xl border border-slate-800/70 bg-slate-950/80 shadow-2xl shadow-black/20">
        <div className="border-b border-slate-800/70 bg-gradient-to-r from-teal-500/10 via-slate-950 to-slate-950 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-teal-400/90">
                Rescue coordination
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-50">
                Rescue Team Members
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Manage responders, assign them to a disaster, and keep their task
                status up to date. The table is paginated at 10 rows per page for
                faster loading.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={refresh}
                className="rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
              >
                Refresh
              </button>
              {canManage && (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="rounded-xl border border-teal-500/40 bg-teal-500/15 px-4 py-2 text-sm font-semibold text-teal-200 transition hover:border-teal-400/60 hover:bg-teal-500/20"
                >
                  Add member
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-b border-slate-800/70 bg-slate-950/50 px-5 py-5 sm:px-6 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
              Total members
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-50">
              {totalCount.toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
              Active on page
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-50">
              {pageStats.active}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
              Completed on page
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-50">
              {pageStats.completed}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
              Unassigned on page
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-50">
              {pageStats.unassigned}
            </p>
          </div>
        </div>

        <div className="border-b border-slate-800/70 px-5 py-4 sm:px-6">
          <div className="grid gap-3 lg:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Search
              </span>
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Search by name, role, phone, email, or base"
                className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-teal-500/60"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Task status
              </span>
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value as RescueTaskStatus | "all");
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-teal-500/60"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Disaster assignment
              </span>
              <select
                value={disasterFilter}
                onChange={(event) => {
                  setDisasterFilter(event.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-teal-500/60"
              >
                <option value="all">All disasters</option>
                <option value="">Unassigned only</option>
                {disasters.map((disaster) => (
                  <option key={disaster.id} value={disaster.id}>
                    {disaster.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="px-5 py-5 sm:px-6">
          {error && (
            <div className="mb-4 rounded-2xl border border-red-800/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {formNotice && (
            <div className="mb-4 rounded-2xl border border-emerald-800/60 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">
              {formNotice}
            </div>
          )}

          {loading ? (
            <div className="flex min-h-[18rem] items-center justify-center rounded-2xl border border-slate-800/70 bg-slate-900/50">
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-teal-400" />
                Loading rescue team members...
              </div>
            </div>
          ) : members.length === 0 ? (
            <div className="rounded-2xl border border-slate-800/70 bg-slate-900/50 px-6 py-16 text-center">
              <h3 className="text-lg font-semibold text-slate-100">No members found</h3>
              <p className="mt-2 text-sm text-slate-500">
                Try a different filter or add a responder to the team.
              </p>
              {canManage && (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="mt-5 rounded-xl border border-teal-500/40 bg-teal-500/15 px-4 py-2 text-sm font-semibold text-teal-200 transition hover:border-teal-400/60 hover:bg-teal-500/20"
                >
                  Add first member
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-col gap-2 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <p>
                  Showing <span className="font-semibold text-slate-300">{pageStart}</span>
                  {" "}
                  to <span className="font-semibold text-slate-300">{pageEnd}</span>
                  {" "}
                  of <span className="font-semibold text-slate-300">{totalCount}</span> records
                </p>
                <p>
                  Managed by{" "}
                  <span className="font-semibold text-slate-300">
                    {ROLE_LABELS[appRole]}
                  </span>
                </p>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-800/70">
                <table className="min-w-full divide-y divide-slate-800/70 text-left text-sm">
                  <thead className="bg-slate-900/90">
                    <tr>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Member
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Assignment
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Task
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Priority
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Updated
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 bg-slate-950/40">
                    {members.map((member) => (
                      <tr key={member.id} className="transition hover:bg-slate-900/40">
                        <td className="px-4 py-4 align-top">
                          <div className="max-w-[18rem]">
                            <p className="font-semibold text-slate-100">{member.name}</p>
                            <p className="mt-1 text-xs text-slate-500">{member.role}</p>
                            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                              {member.phone ? <span>{member.phone}</span> : null}
                              {member.email ? <span>{member.email}</span> : null}
                              {member.base_location ? <span>{member.base_location}</span> : null}
                            </div>
                            {member.skills.length > 0 ? (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {member.skills.slice(0, 3).map((skill) => (
                                  <span
                                    key={skill}
                                    className="rounded-full border border-slate-700 bg-slate-900/80 px-2 py-0.5 text-[10px] text-slate-400"
                                  >
                                    {skill}
                                  </span>
                                ))}
                                {member.skills.length > 3 ? (
                                  <span className="rounded-full border border-slate-700 bg-slate-900/80 px-2 py-0.5 text-[10px] text-slate-500">
                                    +{member.skills.length - 3} more
                                  </span>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div className="max-w-[20rem]">
                            <p className="font-medium text-slate-200">
                              {getAssignmentLabel(member)}
                            </p>
                            {member.assigned_disaster ? (
                              <div className="mt-2 flex items-center gap-2">
                                <span
                                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${DISASTER_STATUS_CLASSES[member.assigned_disaster.response_status]}`}
                                >
                                  {member.assigned_disaster.response_status}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {member.assigned_disaster.disaster_type}
                                </span>
                              </div>
                            ) : (
                              <p className="mt-1 text-xs text-slate-500">Awaiting assignment.</p>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div className="flex flex-col gap-2">
                            <span
                              className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${TASK_STATUS_CLASSES[member.task_status]}`}
                            >
                              {TASK_STATUS_LABELS[member.task_status]}
                            </span>
                            <p className="text-xs text-slate-500">
                              {member.task_status === "completed" && member.completed_at
                                ? `Completed ${formatDateTime(member.completed_at)}`
                                : "Task still active"}
                            </p>
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <span className="inline-flex rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-xs font-semibold text-slate-200">
                            {PRIORITY_LABELS[String(member.priority)] ?? `Priority ${member.priority}`}
                          </span>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <p className="text-xs text-slate-400">{formatDateTime(member.updated_at)}</p>
                          <p className="mt-1 text-[11px] text-slate-600">
                            Created {formatDateTime(member.created_at)}
                          </p>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div className="flex flex-wrap justify-end gap-2">
                            {canManage && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => selectDisaster(member)}
                                  disabled={isPending}
                                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-teal-500/50 hover:text-teal-200 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Edit / Assign
                                </button>
                                {member.task_status !== "completed" ? (
                                  <button
                                    type="button"
                                    onClick={() => markComplete(member.id)}
                                    disabled={isPending}
                                    className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:border-emerald-400/60 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    Mark complete
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => removeMember(member.id)}
                                  disabled={isPending}
                                  className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-200 transition hover:border-red-400/60 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                            {!canManage && (
                              <span className="text-xs text-slate-500">
                                View only
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 flex flex-col gap-3 border-t border-slate-800/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Page <span className="font-semibold text-slate-300">{page}</span> of{" "}
                  <span className="font-semibold text-slate-300">{totalPages}</span>
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page <= 1 || loading}
                    className="rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={page >= totalPages || loading}
                    className="rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {modalOpen && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-8 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl shadow-black/40">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-5 sm:px-6">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-teal-400/90">
                  {form.id ? "Edit member" : "Add member"}
                </p>
                <h3 className="mt-1 text-xl font-semibold text-slate-50">
                  {form.id ? "Update rescue team member" : "Create a new rescue team member"}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
              >
                Close
              </button>
            </div>

            <div className="grid gap-4 px-5 py-5 sm:px-6 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Full name
                </span>
                <input
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-teal-500/60"
                  placeholder="Aarav Patil"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Role
                </span>
                <input
                  value={form.role}
                  onChange={(event) => updateField("role", event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-teal-500/60"
                  placeholder="Search & Rescue Lead"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Phone
                </span>
                <input
                  value={form.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-teal-500/60"
                  placeholder="+91-9000000001"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Email
                </span>
                <input
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-teal-500/60"
                  placeholder="member@example.com"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Base location
                </span>
                <input
                  value={form.base_location}
                  onChange={(event) => updateField("base_location", event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-teal-500/60"
                  placeholder="Mumbai"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Priority
                </span>
                <select
                  value={form.priority}
                  onChange={(event) => updateField("priority", event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-teal-500/60"
                >
                  <option value="1">Priority 1 - urgent</option>
                  <option value="2">Priority 2 - standard</option>
                  <option value="3">Priority 3 - support</option>
                </select>
              </label>

              <label className="block md:col-span-2">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Disaster assignment
                </span>
                <select
                  value={form.assigned_disaster_id}
                  onChange={(event) => updateField("assigned_disaster_id", event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-teal-500/60"
                >
                  <option value="">Unassigned</option>
                  {disasters.map((disaster) => (
                    <option key={disaster.id} value={disaster.id}>
                      {disaster.title} - {disaster.location}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Task status
                </span>
                <select
                  value={form.task_status}
                  onChange={(event) => updateField("task_status", event.target.value as RescueTaskStatus)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-teal-500/60"
                >
                  <option value="pending">Pending</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In progress</option>
                  <option value="completed">Completed</option>
                </select>
              </label>

              <label className="block md:col-span-2">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Skills
                </span>
                <input
                  value={form.skills}
                  onChange={(event) => updateField("skills", event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-teal-500/60"
                  placeholder="rope rescue, first aid, driver"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Notes
                </span>
                <textarea
                  value={form.notes}
                  onChange={(event) => updateField("notes", event.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-teal-500/60"
                  placeholder="Shift handoff, gear requirements, or readiness notes."
                />
              </label>
            </div>

            {formError ? (
              <div className="mx-5 mb-4 rounded-2xl border border-red-800/60 bg-red-950/40 px-4 py-3 text-sm text-red-200 sm:mx-6">
                {formError}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 border-t border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-xs text-slate-500">
                Use this form to create a responder, edit existing details, or assign
                them to a different disaster.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void submitForm();
                  }}
                  disabled={isPending}
                  className="rounded-xl border border-teal-500/40 bg-teal-500/15 px-4 py-2 text-sm font-semibold text-teal-200 transition hover:border-teal-400/60 hover:bg-teal-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? "Saving..." : form.id ? "Update member" : "Create member"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
