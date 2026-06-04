"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  submitRescueReport,
  getMyRescueReports,
  getActiveRescueReports,
  updateRescueReport,
  type RescueReportRow,
  type RescueReportType,
  type RescueReportForm,
  type RescueReportStatus,
} from "@/lib/rescue/actions";
import { getStates, getCitiesByState } from "@/lib/facilities/actions";

const REPORT_TYPE_LABELS: Record<RescueReportType, string> = {
  rescue_operation: "Rescue Operation",
  casualty_evacuation: "Casualty Evacuation",
  search_operation: "Search Operation",
  resource_requirement: "Resource Requirement",
};

const REPORT_ICONS: Record<RescueReportType, string> = {
  rescue_operation: "\uD83D\uDE91",
  casualty_evacuation: "\uD83D\uDE8C",
  search_operation: "\uD83D\uDD0D",
  resource_requirement: "\uD83C\uDF93",
};

const STATUS_STYLES: Record<RescueReportStatus, string> = {
  active: "bg-emerald-500/15 text-emerald-400",
  completed: "bg-slate-500/15 text-slate-400",
  cancelled: "bg-red-500/15 text-red-400",
};

const emptyForm = (): RescueReportForm => ({
  report_type: "rescue_operation",
  title: "",
  description: "",
  location: "",
  state: "",
  city: "",
  data: {},
});

const NewReportForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<RescueReportForm>(emptyForm());

  const { data: states = [] } = useQuery({
    queryKey: ["states"], queryFn: getStates, staleTime: 86400000,
  });

  const selectedState = states.find((st) => st.name === form.state);
  const { data: cities = [] } = useQuery({
    queryKey: ["cities", selectedState?.id],
    queryFn: () => getCitiesByState(selectedState!.id),
    enabled: !!selectedState, staleTime: 86400000,
  });

  const submitMut = useMutation({
    mutationFn: () => submitRescueReport(form),
    onSuccess: (res) => {
      if (res.id) { setForm(emptyForm()); queryClient.invalidateQueries({ queryKey: ["rescue-reports"] }); onSuccess(); }
    },
  });

  const updateField = <K extends keyof RescueReportForm>(key: K, value: RescueReportForm[K]) => setForm((prev) => ({ ...prev, [key]: value }));
  const handleStateChange = (stateName: string) => { updateField("state", stateName); updateField("city", ""); };

  const dataField = (key: string, label: string, type: "text" | "number" = "text") => (
    <div key={key}>
      <label className="mb-1 block text-xs font-medium text-slate-400">{label}</label>
      <input type={type} value={(form.data?.[key] as string) ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, data: { ...prev.data, [key]: type === "number" ? Number(e.target.value) : e.target.value } }))} className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 outline-none focus:border-teal-600 placeholder-slate-500" />
    </div>
  );

  const selectField = (key: string, label: string, options: { value: string; label: string }[]) => (
    <div key={key}>
      <label className="mb-1 block text-xs font-medium text-slate-400">{label}</label>
      <select value={(form.data?.[key] as string) ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, data: { ...prev.data, [key]: e.target.value } }))} className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 outline-none focus:border-teal-600">
        <option value="">Select {label}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  const field = (key: keyof RescueReportForm, label: string, placeholder = "", type: "text" | "textarea" = "text") => (
    <div key={key}>
      <label className="mb-1 block text-xs font-medium text-slate-400">{label}</label>
      {type === "textarea" ? (
        <textarea value={(form[key] as string) ?? ""} onChange={(e) => updateField(key, e.target.value as RescueReportForm[typeof key])} placeholder={placeholder} className="w-full rounded-xl border border-slate-700 bg-slate-900/80 p-3 text-sm text-slate-200 outline-none focus:border-teal-600 min-h-[80px] placeholder-slate-500" />
      ) : (
        <input type={type} value={(form[key] as string) ?? ""} onChange={(e) => updateField(key, e.target.value as RescueReportForm[typeof key])} placeholder={placeholder} className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 outline-none focus:border-teal-600 placeholder-slate-500" />
      )}
    </div>
  );

  const typeSpecificFields = () => {
    const t = form.report_type;
    if (t === "rescue_operation") return (
      <>{selectField("severity", "Severity", [{value:"low",label:"Low"},{value:"medium",label:"Medium"},{value:"high",label:"High"},{value:"critical",label:"Critical"}])}
        {selectField("rescue_status", "Status", [{value:"searching",label:"Searching"},{value:"extracting",label:"Extracting"},{value:"evacuating",label:"Evacuating"},{value:"completed",label:"Completed"}])}
        {dataField("people_rescued", "People Rescued", "number")}
        {dataField("people_trapped", "People Trapped", "number")}</>
    );
    if (t === "casualty_evacuation") return (
      <>{dataField("injured_count", "Injured Count", "number")}
        {dataField("critical_count", "Critical Count", "number")}
        {dataField("deceased_count", "Deceased Count", "number")}
        {dataField("destination", "Evacuation Destination")}</>
    );
    if (t === "search_operation") return (
      <>{selectField("search_area_type", "Area Type", [{value:"building",label:"Building"},{value:"rubble",label:"Rubble"},{value:"water",label:"Water Body"},{value:"forest",label:"Forest"},{value:"urban",label:"Urban"}])}
        {dataField("search_radius_m", "Search Radius (m)", "number")}
        {dataField("team_members", "Team Members", "number")}
        {dataField("k9_units", "K9 Units", "number")}</>
    );
    if (t === "resource_requirement") return (
      <>{dataField("manpower", "Manpower Required", "number")}
        {dataField("heavy_equipment", "Heavy Equipment Needed")}
        {dataField("medical_supplies", "Medical Supplies Needed")}
        {dataField("vehicles", "Vehicles Required", "number")}</>
    );
    return null;
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-400">Report Type</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.keys(REPORT_TYPE_LABELS) as RescueReportType[]).map((t) => (
            <button key={t} type="button" onClick={() => updateField("report_type", t)} className={`rounded-xl border px-3 py-2.5 text-center text-xs font-medium transition ${form.report_type === t ? "border-teal-600 bg-teal-500/15 text-teal-300" : "border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-600"}`}>
              <span className="block text-base">{REPORT_ICONS[t]}</span>
              <span className="mt-1 block">{REPORT_TYPE_LABELS[t]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {field("title", "Title", "e.g. Building collapse rescue - Sector 12")}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">State</label>
          <select value={form.state} onChange={(e) => handleStateChange(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 outline-none focus:border-teal-600">
            <option value="">Select state</option>
            {states.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">City</label>
          <select value={form.city} onChange={(e) => updateField("city", e.target.value)} disabled={!form.state} className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 outline-none focus:border-teal-600 disabled:opacity-50">
            <option value="">Select city</option>
            {cities.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        {field("location", "Location Detail", "e.g. Near Railway Station")}
      </div>

      {field("description", "Description", "Describe the situation...", "textarea")}

      <div className="grid gap-4 sm:grid-cols-2">{typeSpecificFields()}</div>

      {submitMut.data?.error && (
        <div className="rounded-xl bg-red-500/10 p-3 text-sm text-red-400">{submitMut.data.error}</div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={() => setForm(emptyForm())} className="rounded-xl border border-slate-700 px-4 py-2 text-xs text-slate-400">Reset</button>
        <button type="button" onClick={() => submitMut.mutate()} disabled={submitMut.isPending || !form.title || !form.location || !form.state || !form.city} className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-medium text-white transition hover:bg-teal-500 disabled:opacity-50">
          {submitMut.isPending ? "Submitting..." : "Submit Report"}
        </button>
      </div>
    </div>
  );
};

const ReportCard = ({ r, onSelect, onStatusChange }: { r: RescueReportRow; onSelect: (r: RescueReportRow) => void; onStatusChange: (id: string, status: RescueReportStatus) => void }) => (
  <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 backdrop-blur-sm transition hover:border-slate-600">
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="text-lg leading-none">{REPORT_ICONS[r.report_type]}</span>
        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400">{REPORT_TYPE_LABELS[r.report_type]}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[r.status]}`}>{r.status}</span>
      </div>
      <span className="text-[10px] text-slate-500">{new Date(r.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
    </div>
    <h3 className="mt-2 cursor-pointer text-sm font-semibold text-slate-200" onClick={() => onSelect(r)}>{r.title}</h3>
    {r.description && <p className="mt-1 text-xs text-slate-500 line-clamp-2">{r.description}</p>}
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-500">
      <span>{r.city}, {r.state}</span>
      {r.location && <span>{r.location}</span>}
    </div>
    {r.status === "active" && (
      <div className="mt-3 flex gap-2">
        <button onClick={() => onStatusChange(r.id, "completed")} className="rounded-lg bg-emerald-600/20 px-2.5 py-1 text-[10px] font-medium text-emerald-400 transition hover:bg-emerald-600/30">Mark Complete</button>
        <button onClick={() => onStatusChange(r.id, "cancelled")} className="rounded-lg bg-red-500/10 px-2.5 py-1 text-[10px] font-medium text-red-400 transition hover:bg-red-500/20">Cancel</button>
      </div>
    )}
  </div>
);

const EditDrawer = ({ report, onClose }: { report: RescueReportRow | null; onClose: () => void }) => {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(report?.title ?? "");
  const [desc, setDesc] = useState(report?.description ?? "");
  const [msg, setMsg] = useState("");

  const updateMut = useMutation({
    mutationFn: () => updateRescueReport(report!.id, { title, description: desc || undefined }),
    onSuccess: (res) => {
      setMsg(res.success ?? res.error ?? "");
      if (res.success) { queryClient.invalidateQueries({ queryKey: ["rescue-reports"] }); setTimeout(onClose, 1000); }
    },
  });

  if (!report) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="bg-black/40 flex-1" onClick={onClose} />
      <div className="w-full max-w-lg border-l border-slate-800 bg-slate-950 p-6 shadow-2xl overflow-y-auto">
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-500 hover:text-slate-300 text-lg">&times;</button>
        <div className="mt-4 space-y-5">
          <div className="flex items-center gap-2">
            <span className="text-lg">{REPORT_ICONS[report.report_type]}</span>
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">{REPORT_TYPE_LABELS[report.report_type]}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[report.status]}`}>{report.status}</span>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={report.status !== "active"} className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 outline-none focus:border-teal-600 disabled:opacity-50" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Description</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} disabled={report.status !== "active"} className="w-full rounded-xl border border-slate-700 bg-slate-900/80 p-3 text-sm text-slate-200 outline-none focus:border-teal-600 min-h-[100px] disabled:opacity-50" />
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-xs text-slate-500">Location</span><p className="text-slate-300">{report.location}</p></div>
            <div><span className="text-xs text-slate-500">City / State</span><p className="text-slate-300">{report.city}, {report.state}</p></div>
            <div><span className="text-xs text-slate-500">Submitted</span><p className="text-slate-400">{new Date(report.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p></div>
            <div><span className="text-xs text-slate-500">Updated</span><p className="text-slate-400">{new Date(report.updated_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p></div>
          </div>
          {report.data && Object.keys(report.data).length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Report Data</h4>
              <pre className="rounded-xl bg-slate-900/60 p-3 text-xs font-mono text-slate-400 overflow-x-auto">{JSON.stringify(report.data, null, 2)}</pre>
            </div>
          )}
          {msg && (
            <div className={`rounded-xl p-3 text-sm ${msg.startsWith("Fail") ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}>{msg}</div>
          )}
          {report.status === "active" && (
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button onClick={() => updateMut.mutate()} disabled={updateMut.isPending || !title} className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-medium text-white transition hover:bg-teal-500 disabled:opacity-50">
                {updateMut.isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const RescueOpsPanel = () => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"active" | "new" | "all">("active");
  const [editReport, setEditReport] = useState<RescueReportRow | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: activeData, isLoading: activeLoading } = useQuery({
    queryKey: ["rescue-reports", "active"], queryFn: () => getActiveRescueReports(), refetchInterval: 15000,
  });

  const { data: allData, isLoading: allLoading } = useQuery({
    queryKey: ["rescue-reports", "all", typeFilter], queryFn: () => getMyRescueReports(typeFilter !== "all" ? typeFilter as RescueReportType : undefined),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: RescueReportStatus }) => updateRescueReport(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rescue-reports"] }),
  });

  const activeReports = activeData?.data ?? [];
  const allReports = allData?.data ?? [];
  const filteredAll = statusFilter === "all" ? allReports : allReports.filter((r) => r.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Rescue Operations</h2>
          <p className="mt-1 text-sm text-slate-500">Report rescue operations, casualty evacuations, search operations, and resource needs.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-emerald-400">Active: {activeReports.length}</span>
        </div>
      </div>

      <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/50 p-1">
        {([
          { id: "active" as const, label: `Active (${activeReports.length})` },
          { id: "new" as const, label: "New Report" },
          { id: "all" as const, label: "All Reports" },
        ]).map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${tab === t.id ? "bg-teal-500/15 text-teal-300 shadow-sm" : "text-slate-400 hover:text-slate-200"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "active" && (
        activeLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-900/60" />)}
          </div>
        ) : activeReports.length === 0 ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <div className="text-center">
              <p className="text-sm font-medium text-slate-400">No active cases</p>
              <p className="mt-1 text-xs text-slate-600">Submit a rescue operation report to get started.</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {activeReports.map((r) => (
              <ReportCard key={r.id} r={r} onSelect={setEditReport} onStatusChange={(id, s) => statusMut.mutate({ id, status: s })} />
            ))}
          </div>
        )
      )}

      {tab === "new" && <NewReportForm onSuccess={() => setTab("active")} />}

      {tab === "all" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-300 outline-none focus:border-teal-600">
              <option value="all">All Types</option>
              {(Object.keys(REPORT_TYPE_LABELS) as RescueReportType[]).map((t) => <option key={t} value={t}>{REPORT_TYPE_LABELS[t]}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-300 outline-none focus:border-teal-600">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <span className="ml-auto text-xs text-slate-500">{filteredAll.length} report(s)</span>
          </div>
          {allLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-900/60" />)}
            </div>
          ) : filteredAll.length === 0 ? (
            <div className="flex min-h-[20vh] items-center justify-center">
              <p className="text-sm text-slate-500">No reports match your filters.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredAll.map((r) => (
                <ReportCard key={r.id} r={r} onSelect={setEditReport} onStatusChange={(id, s) => statusMut.mutate({ id, status: s })} />
              ))}
            </div>
          )}
        </div>
      )}

      {editReport && <EditDrawer report={editReport} onClose={() => setEditReport(null)} />}
    </div>
  );
};
