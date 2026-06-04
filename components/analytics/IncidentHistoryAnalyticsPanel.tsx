"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, PieChart, Pie, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

import {
  getIncidents, getIncidentById, getAnalyticsMetrics, getTrends, getSeverityDistribution, getTypeDistribution, getLocationDensity, getResponseTimeAnalytics, exportIncidentsCSV,
  type IncidentRow, type IncidentLogRow,
} from "@/lib/incidents/actions";

const SEVERITY_COLORS = { Critical: "#ef4444", High: "#f97316", Moderate: "#eab308", Low: "#22c55e" };
const STATUS_LABELS: Record<string, string> = { active: "Active", monitoring: "Monitoring", resolved: "Resolved", closed: "Closed" };
const SEVERITY_ORDER = ["critical", "high", "moderate", "low"];

// --- Metric Card ---
const MetricCard = ({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) => (
  <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 backdrop-blur-sm">
    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
    <p className={`mt-1 text-2xl font-bold ${color ?? "text-slate-100"}`}>{value}</p>
    {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
  </div>
);

// --- Skeleton ---
const SkeletonLine = ({ w = "100%", h = 14 }: { w?: string; h?: number }) => (
  <div className="animate-pulse rounded bg-slate-800" style={{ width: w, height: h }} />
);

// --- Side Drawer ---
const IncidentDrawer = ({ incidentId, onClose }: { incidentId: string; onClose: () => void }) => {
  const { data, isLoading } = useQuery({
    queryKey: ["incident-detail", incidentId],
    queryFn: () => getIncidentById(incidentId),
    enabled: !!incidentId,
  });

  const inc = data?.incident;
  const logs = data?.logs ?? [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg border-l border-slate-800 bg-slate-950 p-6 shadow-2xl overflow-y-auto">
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-500 hover:text-slate-300 text-lg">&times;</button>
        {isLoading ? (
          <div className="mt-8 space-y-4">
            <SkeletonLine w="60%" h={24} /><SkeletonLine w="40%" h={14} /><SkeletonLine w="80%" h={14} />
            <SkeletonLine w="100%" h={80} />
          </div>
        ) : inc ? (
          <div className="mt-4 space-y-5">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-teal-400">{inc.incident_id}</span>
              <h2 className="mt-1 text-lg font-semibold text-slate-100">{inc.title}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                inc.severity === "critical" ? "bg-red-500/15 text-red-400" :
                inc.severity === "high" ? "bg-orange-500/15 text-orange-400" :
                inc.severity === "moderate" ? "bg-yellow-500/15 text-yellow-400" :
                "bg-green-500/15 text-green-400"
              }`}>{inc.severity.toUpperCase()}</span>
              <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] text-slate-400">{inc.incident_type.replace(/_/g, " ")}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
                inc.status === "active" ? "bg-red-500/10 text-red-400" :
                inc.status === "monitoring" ? "bg-amber-500/10 text-amber-400" :
                "bg-emerald-500/10 text-emerald-400"
              }`}>{STATUS_LABELS[inc.status] ?? inc.status}</span>
            </div>
            <div className="space-y-1.5 text-sm text-slate-400">
              <p><span className="text-slate-500">Location:</span> {inc.location}</p>
              <p><span className="text-slate-500">Reported:</span> {new Date(inc.reported_at).toLocaleString()}</p>
              {inc.resolved_at && <p><span className="text-slate-500">Resolved:</span> {new Date(inc.resolved_at).toLocaleString()}</p>}
              {inc.response_time_minutes != null && <p><span className="text-slate-500">Response:</span> {inc.response_time_minutes} min</p>}
              {inc.assigned_team && <p><span className="text-slate-500">Team:</span> {inc.assigned_team}</p>}
            </div>
            {inc.description && <p className="text-sm text-slate-300 leading-relaxed">{inc.description}</p>}
            {logs.length > 0 && (
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Timeline</h3>
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div key={log.id} className="border-l-2 border-teal-600/40 pl-3">
                      <p className="text-xs font-medium text-slate-200 capitalize">{log.action.replace(/_/g, " ")}</p>
                      {log.description && <p className="text-xs text-slate-500 mt-0.5">{log.description}</p>}
                      <p className="text-[10px] text-slate-600 mt-0.5">{new Date(log.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-8 text-sm text-slate-500">Incident not found.</p>
        )}
      </div>
    </div>
  );
};

// --- Main Panel ---
export const IncidentHistoryAnalyticsPanel = () => {
  const [view, setView] = useState<"table" | "timeline">("table");
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filters, setFilters] = useState({
    dateFrom: "", dateTo: "", severity: "", type: "", location: "", status: "", search: "",
  });

  const updateFilter = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const qf = useMemo(() => {
    const f: any = { page, perPage: 15, refresh: refreshKey > 0 };
    for (const [k, v] of Object.entries(filters)) if (v) f[k] = v;
    return f;
  }, [filters, page, refreshKey]);

  const dateFilter = useMemo(() => {
    const f: any = { refresh: refreshKey > 0 };
    if (filters.dateFrom) f.dateFrom = filters.dateFrom;
    if (filters.dateTo) f.dateTo = filters.dateTo;
    return f;
  }, [filters.dateFrom, filters.dateTo, refreshKey]);

  const { data: incidentsData, isLoading: incidentsLoading } = useQuery({
    queryKey: ["incidents", refreshKey, qf], queryFn: () => getIncidents(qf), staleTime: 60000,
  });
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["incidents-metrics", refreshKey, dateFilter], queryFn: () => getAnalyticsMetrics(dateFilter), staleTime: 60000,
  });
  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ["incidents-trends", refreshKey, dateFilter], queryFn: () => getTrends(dateFilter), staleTime: 60000,
  });
  const { data: severityDist, isLoading: severityLoading } = useQuery({
    queryKey: ["incidents-severity", refreshKey, dateFilter], queryFn: () => getSeverityDistribution(dateFilter), staleTime: 60000,
  });
  const { data: typeDist, isLoading: typeLoading } = useQuery({
    queryKey: ["incidents-type", refreshKey, dateFilter], queryFn: () => getTypeDistribution(dateFilter), staleTime: 60000,
  });
  const { data: locationDensity, isLoading: locationLoading } = useQuery({
    queryKey: ["incidents-location", refreshKey, dateFilter], queryFn: () => getLocationDensity(dateFilter), staleTime: 60000,
  });
  const { data: responseTimeData, isLoading: responseLoading } = useQuery({
    queryKey: ["incidents-response", refreshKey, dateFilter], queryFn: () => getResponseTimeAnalytics(dateFilter), staleTime: 60000,
  });

  const incidents = incidentsData?.data ?? [];
  const total = incidentsData?.total ?? 0;
  const totalPages = Math.ceil(total / 15);

  const handleExport = useCallback(async () => {
    const csv = await exportIncidentsCSV(qf);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `incidents-export-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }, [qf]);

  useEffect(() => { setPage(1); }, [filters]);

  const FilterSelect = ({ label, value, onChange, options, placeholder }: any) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 outline-none focus:border-teal-600 min-w-0">
      <option value="">{placeholder}</option>
      {options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Incident History &amp; Analytics</h2>
          <p className="mt-1 text-sm text-slate-500">Live data from NASA EONET, GDACS &amp; USGS. Updated hourly.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setRefreshKey((k) => k + 1)} className="rounded-xl border border-teal-700 bg-teal-500/10 px-4 py-2 text-xs font-medium text-teal-300 transition hover:bg-teal-500/20">
            Refresh Data
          </button>
          <button onClick={handleExport} className="rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-600">
            Export CSV
          </button>
        </div>
      </div>

      {/* Metrics */}
      {metricsLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-900/60" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard label="Total Incidents" value={metrics?.totalIncidents ?? 0} color="text-slate-100" />
          <MetricCard label="Active" value={metrics?.activeIncidents ?? 0} color="text-amber-300" />
          <MetricCard label="Critical Cases" value={metrics?.criticalCases ?? 0} color="text-red-400" />
          <MetricCard label="Data Sources" value="3 APIs" sub="EONET · GDACS · USGS" color="text-teal-300" />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500">From</label>
          <input type="date" value={filters.dateFrom} onChange={(e) => updateFilter("dateFrom", e.target.value)} className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 outline-none focus:border-teal-600 [color-scheme:dark]" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500">To</label>
          <input type="date" value={filters.dateTo} onChange={(e) => updateFilter("dateTo", e.target.value)} className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 outline-none focus:border-teal-600 [color-scheme:dark]" />
        </div>
        <FilterSelect label="Severity" value={filters.severity} onChange={(v: string) => updateFilter("severity", v)} placeholder="All Severities" options={SEVERITY_ORDER.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))} />
        <FilterSelect label="Type" value={filters.type} onChange={(v: string) => updateFilter("type", v)} placeholder="All Types" options={["fire","flood","earthquake","cyclone","landslide","structural_collapse","road_accident","medical","missing_person","other"].map((t) => ({ value: t, label: t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) }))} />
        <FilterSelect label="Status" value={filters.status} onChange={(v: string) => updateFilter("status", v)} placeholder="All Statuses" options={["active","monitoring","resolved","closed"].map((s) => ({ value: s, label: STATUS_LABELS[s] }))} />
        <input type="text" value={filters.location} onChange={(e) => updateFilter("location", e.target.value)} placeholder="Filter location..." className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-teal-600" />
        <input type="text" value={filters.search} onChange={(e) => updateFilter("search", e.target.value)} placeholder="Search incidents..." className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-teal-600" />
        <button onClick={() => setFilters({ dateFrom: "", dateTo: "", severity: "", type: "", location: "", status: "", search: "" })} className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-400 transition hover:border-slate-600">
          Clear
        </button>
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button onClick={() => setView("table")} className={`rounded-lg px-4 py-1.5 text-xs font-medium transition ${view === "table" ? "bg-teal-500/15 text-teal-300" : "text-slate-400 hover:text-slate-200"}`}>Table</button>
        <button onClick={() => setView("timeline")} className={`rounded-lg px-4 py-1.5 text-xs font-medium transition ${view === "timeline" ? "bg-teal-500/15 text-teal-300" : "text-slate-400 hover:text-slate-200"}`}>Timeline</button>
        <span className="ml-auto text-xs text-slate-500">{total} incidents</span>
      </div>

      {/* Table view */}
      {view === "table" && (
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900/80 text-xs font-medium uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Reported</th>
                <th className="px-4 py-3">Resp.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {incidentsLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><SkeletonLine w="80%" h={12} /></td>
                    ))}
                  </tr>
                ))
              ) : incidents.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">No incidents match your filters.</td></tr>
              ) : (
                incidents.map((inc) => (
                  <tr key={inc.id} onClick={() => setDrawerId(inc.id)} className="cursor-pointer transition hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-mono text-[11px] text-teal-400">{inc.incident_id}</td>
                    <td className="px-4 py-3 text-slate-200 font-medium max-w-[200px] truncate">{inc.title}</td>
                    <td className="px-4 py-3 text-slate-400 capitalize">{inc.incident_type.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        inc.severity === "critical" ? "bg-red-500/15 text-red-400" :
                        inc.severity === "high" ? "bg-orange-500/15 text-orange-400" :
                        inc.severity === "moderate" ? "bg-yellow-500/15 text-yellow-400" :
                        "bg-green-500/15 text-green-400"
                      }`}>{inc.severity}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 max-w-[140px] truncate">{inc.location}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        inc.status === "active" ? "bg-red-500/10 text-red-400" :
                        inc.status === "monitoring" ? "bg-amber-500/10 text-amber-400" :
                        "bg-emerald-500/10 text-emerald-400"
                      }`}>{STATUS_LABELS[inc.status] ?? inc.status}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{new Date(inc.reported_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{inc.response_time_minutes != null ? `${inc.response_time_minutes}m` : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 border-t border-slate-800 p-3">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-1 text-xs text-slate-300 disabled:opacity-40">Prev</button>
              <span className="text-xs text-slate-500">{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-1 text-xs text-slate-300 disabled:opacity-40">Next</button>
            </div>
          )}
        </div>
      )}

      {/* Timeline view */}
      {view === "timeline" && (
        <div className="space-y-4">
          {incidentsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-20 shrink-0"><SkeletonLine w="100%" h={12} /></div>
                <div className="relative pl-4 before:absolute before:left-0 before:top-2 before:h-full before:w-0.5 before:bg-slate-800 flex-1 space-y-2 pb-6">
                  <SkeletonLine w="60%" h={16} /><SkeletonLine w="40%" h={12} />
                </div>
              </div>
            ))
          ) : incidents.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">No incidents match your filters.</p>
          ) : (
            incidents.map((inc, idx) => (
              <div key={inc.id} className="flex gap-4 group cursor-pointer" onClick={() => setDrawerId(inc.id)}>
                <div className="w-20 shrink-0 pt-0.5 text-right">
                  <span className="text-[10px] font-mono text-slate-600">{new Date(inc.reported_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                </div>
                <div className={`relative flex-1 rounded-xl border p-4 transition hover:border-slate-600 ${
                  idx === 0 ? "border-teal-700/60 bg-teal-500/5" : "border-slate-800 bg-slate-900/40"
                }`}>
                  <div className={`absolute left-0 top-3 h-2.5 w-2.5 -translate-x-1/2 rounded-full ${
                    idx === 0 ? "bg-teal-400" : "bg-slate-700"
                  }`} />
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-200">{inc.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{inc.location} &middot; {inc.incident_type.replace(/_/g, " ")}</p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        inc.severity === "critical" ? "bg-red-500/15 text-red-400" :
                        inc.severity === "high" ? "bg-orange-500/15 text-orange-400" :
                        inc.severity === "moderate" ? "bg-yellow-500/15 text-yellow-400" :
                        "bg-green-500/15 text-green-400"
                      }`}>{inc.severity}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        inc.status === "active" ? "bg-red-500/10 text-red-400" :
                        inc.status === "monitoring" ? "bg-amber-500/10 text-amber-400" :
                        "bg-emerald-500/10 text-emerald-400"
                      }`}>{STATUS_LABELS[inc.status]}</span>
                    </div>
                  </div>
                  {inc.description && <p className="mt-2 text-xs text-slate-500 line-clamp-2">{inc.description}</p>}
                </div>
              </div>
            ))
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-1 text-xs text-slate-300 disabled:opacity-40">Prev</button>
              <span className="text-xs text-slate-500">{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-1 text-xs text-slate-300 disabled:opacity-40">Next</button>
            </div>
          )}
        </div>
      )}

      {/* Charts */}
      <div className="pt-4 border-t border-slate-800">
        <h3 className="text-sm font-semibold text-slate-100 mb-4">Analytics</h3>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
          {/* Line: Incident Trends */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Incident Trends</h4>
            {trendsLoading ? <div className="h-48 animate-pulse rounded-xl bg-slate-800" /> : trends?.length ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="count" stroke="#14b8a6" strokeWidth={2} dot={{ r: 3, fill: "#14b8a6" }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-slate-500 py-12 text-center">No trend data.</p>}
          </div>

          {/* Pie: Severity Distribution */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Severity Distribution</h4>
            {severityLoading ? <div className="h-48 animate-pulse rounded-xl bg-slate-800" /> : severityDist?.length ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={severityDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name} (${value})`}>
                    {severityDist.map((entry) => <Cell key={entry.name} fill={(SEVERITY_COLORS as any)[entry.name] ?? "#64748b"} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-slate-500 py-12 text-center">No severity data.</p>}
          </div>

          {/* Bar: Incident Types */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Incident Types</h4>
            {typeLoading ? <div className="h-48 animate-pulse rounded-xl bg-slate-800" /> : typeDist?.length ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={typeDist} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} width={75} />
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="value" fill="#14b8a6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-slate-500 py-12 text-center">No type data.</p>}
          </div>

          {/* Data Sources card */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Live Data Sources</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-xl bg-slate-800/40 p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/20 text-[10px] font-bold text-sky-400">NASA</div>
                <div><p className="text-sm font-medium text-slate-200">EONET</p><p className="text-xs text-slate-500">Earth Observatory Natural Event Tracker — wildfires, storms, floods, landslides, earthquakes</p></div>
              </div>
              <div className="flex items-start gap-3 rounded-xl bg-slate-800/40 p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-[10px] font-bold text-amber-400">GD</div>
                <div><p className="text-sm font-medium text-slate-200">GDACS</p><p className="text-xs text-slate-500">Global Disaster Alert &amp; Coordination System — cyclones, floods, earthquakes, volcanoes</p></div>
              </div>
              <div className="flex items-start gap-3 rounded-xl bg-slate-800/40 p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/20 text-[10px] font-bold text-red-400">US</div>
                <div><p className="text-sm font-medium text-slate-200">USGS</p><p className="text-xs text-slate-500">U.S. Geological Survey — earthquake monitoring across India</p></div>
              </div>
              <p className="text-[10px] text-slate-600 mt-1">Data refreshes every hour. Response-time &amp; resolution metrics require internal incident tracking.</p>
            </div>
          </div>
        </div>

      </div>

      {/* Drawer */}
      {drawerId && <IncidentDrawer incidentId={drawerId} onClose={() => setDrawerId(null)} />}
    </div>
  );
};
