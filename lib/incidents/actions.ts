"use server";

import { createClient } from "@/lib/supabase/server";
import { fetchEonetEvents, type EonetFeatureCollection } from "@/lib/map/eonet";
import { fetchGdacsEvents, filterIndiaEvents, type GdacsFeatureCollection } from "@/lib/map/gdacs";

// --- Types ---

export type IncidentRow = {
  id: string;
  incident_id: string;
  title: string;
  incident_type: string;
  severity: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  description: string | null;
  reported_at: string;
  resolved_at: string | null;
  response_time_minutes: number | null;
  resolution_time_minutes: number | null;
  assigned_team: string | null;
  media_urls: string[];
  source: string;
};

export type IncidentLogRow = {
  id: string;
  incident_id: string;
  action: string;
  description: string | null;
  performed_by: string | null;
  created_at: string;
};

export type AnalyticsMetrics = {
  totalIncidents: number;
  activeIncidents: number;
  criticalCases: number;
  avgResponseTime: number | null;
  avgResolutionTime: number | null;
};

export type TrendPoint = { date: string; count: number };
export type SeverityDist = { name: string; value: number };
export type TypeDist = { name: string; value: number };
export type LocationDensity = { location: string; count: number; lat: number | null; lng: number | null };
export type ResponseTimePoint = { location: string; avgResponseMinutes: number };

export type IncidentFilters = {
  dateFrom?: string;
  dateTo?: string;
  severity?: string;
  type?: string;
  location?: string;
  status?: string;
  search?: string;
  page?: number;
  perPage?: number;
  refresh?: boolean;
};

// --- Normalization helpers ---

const SEVERITY_MAP_GDACS: Record<string, string> = { Red: "critical", Orange: "high", Green: "moderate" };

function eonetSeverity(mag: number | null): string {
  if (mag == null) return "moderate";
  if (mag >= 5) return "critical";
  if (mag >= 3) return "high";
  if (mag >= 1) return "moderate";
  return "low";
}

function usgsSeverity(mag: number): string {
  if (mag >= 6) return "critical";
  if (mag >= 4) return "high";
  if (mag >= 2.5) return "moderate";
  return "low";
}

const EONET_TYPE_MAP: Record<string, string> = {
  wildfires: "fire", severeStorms: "cyclone", floods: "flood", landslides: "landslide", earthquakes: "earthquake",
};

const GDACS_TYPE_MAP: Record<string, string> = {
  TC: "cyclone", FL: "flood", EQ: "earthquake", WF: "fire", VO: "other", DR: "other", TS: "other",
};

function normalizeEonet(events: EonetFeatureCollection): IncidentRow[] {
  return events.features.map((f) => {
    const p = f.properties;
    const [lng, lat] = f.geometry?.coordinates ?? [null, null];
    const cat = p.categories?.[0]?.id ?? "other";
    const severity = eonetSeverity(p.magnitudeValue);
    const status = p.closed ? "resolved" : "active";
    return {
      id: `eonet-${p.id}`,
      incident_id: `EONET-${p.id}`,
      title: p.title,
      incident_type: EONET_TYPE_MAP[cat] ?? cat,
      severity,
      location: p.sources?.[0]?.id ?? "Unknown",
      latitude: lat,
      longitude: lng,
      status,
      description: p.description ?? "No description available.",
      reported_at: p.date,
      resolved_at: p.closed ?? null,
      response_time_minutes: null,
      resolution_time_minutes: null,
      assigned_team: null,
      media_urls: [],
      source: "eonet",
    };
  });
}

function normalizeGdacs(events: GdacsFeatureCollection): IncidentRow[] {
  return events.features.map((f) => {
    const p = f.properties;
    const [lng, lat] = f.geometry?.coordinates ?? [null, null];
    const severity = SEVERITY_MAP_GDACS[p.alertlevel] ?? "moderate";
    const status = p.todate ? "resolved" : "active";
    return {
      id: `gdacs-${p.eventtype}-${p.eventid}`,
      incident_id: `GDACS-${p.eventtype}-${p.eventid}`,
      title: p.eventname ?? p.name,
      incident_type: GDACS_TYPE_MAP[p.eventtype] ?? "other",
      severity,
      location: p.country ?? "India",
      latitude: lat,
      longitude: lng,
      status,
      description: p.description ?? p.htmldescription?.replace(/<[^>]*>/g, "") ?? "No description available.",
      reported_at: p.fromdate,
      resolved_at: p.todate ?? null,
      response_time_minutes: null,
      resolution_time_minutes: null,
      assigned_team: null,
      media_urls: [],
      source: "gdacs",
    };
  });
}

function normalizeUsgs(data: any[]): IncidentRow[] {
  return data.map((f) => {
    const p = f.properties ?? f;
    const coords = f.geometry?.coordinates ?? [null, null];
    const [lng, lat] = coords;
    const severity = usgsSeverity(p.mag ?? 0);
    const time = new Date(p.time ?? p.updated ?? Date.now()).toISOString();
    const place = p.place ?? "Unknown";
    const status = p.status === "reviewed" ? "monitoring" : "active";
    return {
      id: `usgs-${p.code ?? p.id ?? Math.random()}`,
      incident_id: `USGS-${p.code ?? "EQ"}`,
      title: p.title ?? `Earthquake ${p.mag}M near ${place}`,
      incident_type: "earthquake",
      severity,
      location: place,
      latitude: lat,
      longitude: lng,
      status,
      description: `${p.mag ?? "?"} magnitude earthquake at ${place}. ${p.felt ? `Felt by ${p.felt} people.` : ""}`,
      reported_at: time,
      resolved_at: null,
      response_time_minutes: null,
      resolution_time_minutes: null,
      assigned_team: null,
      media_urls: [],
      source: "usgs",
    };
  });
}

// --- Fetch from all external APIs ---

async function fetchAllExternalIncidents(): Promise<IncidentRow[]> {
  const [eonetRaw, gdacsRaw] = await Promise.allSettled([
    fetchEonetEvents(),
    fetchGdacsEvents(),
  ]);

  const all: IncidentRow[] = [];

  if (eonetRaw.status === "fulfilled") all.push(...normalizeEonet(eonetRaw.value));
  else console.error("EONET fetch failed:", eonetRaw.reason);

  if (gdacsRaw.status === "fulfilled") {
    const indiaEvents = filterIndiaEvents(gdacsRaw.value);
    all.push(...normalizeGdacs(indiaEvents));
  } else console.error("GDACS fetch failed:", gdacsRaw.reason);

  // USGS fetch directly
  try {
    const usgsRes = await fetch("https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=2024-06-01&endtime=2026-06-04&minlatitude=6.5&maxlatitude=35.7&minlongitude=68.1&maxlongitude=97.4&minmagnitude=2.5&orderby=magnitude&limit=50", {
      signal: AbortSignal.timeout(10000),
    });
    if (usgsRes.ok) {
      const usgsData = await usgsRes.json();
      if (usgsData?.features) all.push(...normalizeUsgs(usgsData.features));
    }
  } catch (e) {
    console.error("USGS fetch failed:", e);
  }

  // Deduplicate by incident_id
  const seen = new Set<string>();
  return all.filter((inc) => {
    if (seen.has(inc.incident_id)) return false;
    seen.add(inc.incident_id);
    return true;
  });
}

// --- Cache in DB and return ---

async function getCachedOrFetch(refresh = false): Promise<IncidentRow[]> {
  const supabase = await createClient();

  // Always fetch from live APIs first
  const external = await fetchAllExternalIncidents();

  if (external.length > 0) {
    // Upsert results into DB cache (silent, best-effort background write)
    const batchSize = 50;
    for (let i = 0; i < external.length; i += batchSize) {
      const batch = external.slice(i, i + batchSize);
      await supabase.from("incidents").upsert(
        batch.map((inc) => ({
          incident_id: inc.incident_id,
          title: inc.title,
          incident_type: inc.incident_type,
          severity: inc.severity,
          location: inc.location,
          latitude: inc.latitude,
          longitude: inc.longitude,
          status: inc.status,
          description: inc.description,
          reported_at: inc.reported_at,
          resolved_at: inc.resolved_at,
          source: inc.source,
        })),
        { onConflict: "incident_id", ignoreDuplicates: true },
      );
    }
    return external; // Return fresh API data
  }

  // API fallback: return whatever is in DB cache
  const { data: cached } = await supabase.from("incidents").select("*").order("reported_at", { ascending: false });
  return (cached ?? []) as IncidentRow[];
}

// --- Filter & Paginate ---

function applyFilters(rows: IncidentRow[], filters: IncidentFilters): IncidentRow[] {
  let filtered = [...rows];
  if (filters.dateFrom) filtered = filtered.filter((r) => r.reported_at >= filters.dateFrom!);
  if (filters.dateTo) filtered = filtered.filter((r) => r.reported_at <= filters.dateTo!);
  if (filters.severity) filtered = filtered.filter((r) => r.severity === filters.severity);
  if (filters.type) filtered = filtered.filter((r) => r.incident_type === filters.type);
  if (filters.location) {
    const q = filters.location.toLowerCase();
    filtered = filtered.filter((r) => r.location.toLowerCase().includes(q));
  }
  if (filters.status) filtered = filtered.filter((r) => r.status === filters.status);
  if (filters.search) {
    const q = filters.search.toLowerCase();
    filtered = filtered.filter((r) => r.title.toLowerCase().includes(q) || r.incident_id.toLowerCase().includes(q) || (r.description ?? "").toLowerCase().includes(q));
  }
  return filtered;
}

// --- Public API ---

export async function getIncidents(filters: IncidentFilters = {}): Promise<{
  data: IncidentRow[];
  total: number;
  page: number;
  perPage: number;
}> {
  const all = await getCachedOrFetch(filters.refresh);
  const filtered = applyFilters(all, filters);
  const page = filters.page ?? 1;
  const perPage = filters.perPage ?? 15;
  const start = (page - 1) * perPage;
  return { data: filtered.slice(start, start + perPage), total: filtered.length, page, perPage };
}

export async function getIncidentById(id: string): Promise<{ incident: IncidentRow | null; logs: IncidentLogRow[] }> {
  const supabase = await createClient();
  const { data: incident } = await supabase.from("incidents").select("*").eq("id", id).single();
  const { data: logs } = await supabase.from("incident_logs").select("*").eq("incident_id", id).order("created_at", { ascending: true });
  return { incident: (incident ?? null) as IncidentRow | null, logs: (logs ?? []) as IncidentLogRow[] };
}

export async function getAnalyticsMetrics(filters: Pick<IncidentFilters, "dateFrom" | "dateTo" | "refresh"> = {}): Promise<AnalyticsMetrics> {
  const all = await getCachedOrFetch(filters.refresh);
  const filtered = filters.dateFrom || filters.dateTo ? applyFilters(all, filters as IncidentFilters) : all;

  const totalIncidents = filtered.length;
  const activeIncidents = filtered.filter((i) => i.status === "active").length;
  const criticalCases = filtered.filter((i) => i.severity === "critical").length;
  return { totalIncidents, activeIncidents, criticalCases, avgResponseTime: null, avgResolutionTime: null };
}

export async function getTrends(filters: Pick<IncidentFilters, "dateFrom" | "dateTo" | "refresh"> = {}): Promise<TrendPoint[]> {
  const all = await getCachedOrFetch(filters.refresh);
  const filtered = applyFilters(all, filters as IncidentFilters);
  const buckets: Record<string, number> = {};
  for (const item of filtered) {
    const day = item.reported_at.slice(0, 10);
    buckets[day] = (buckets[day] ?? 0) + 1;
  }
  return Object.entries(buckets).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }));
}

export async function getSeverityDistribution(filters: Pick<IncidentFilters, "dateFrom" | "dateTo" | "refresh"> = {}): Promise<SeverityDist[]> {
  const all = await getCachedOrFetch(filters.refresh);
  const filtered = applyFilters(all, filters as IncidentFilters);
  const map: Record<string, number> = {};
  for (const i of filtered) map[i.severity] = (map[i.severity] ?? 0) + 1;
  return Object.entries(map).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
}

export async function getTypeDistribution(filters: Pick<IncidentFilters, "dateFrom" | "dateTo" | "refresh"> = {}): Promise<TypeDist[]> {
  const all = await getCachedOrFetch(filters.refresh);
  const filtered = applyFilters(all, filters as IncidentFilters);
  const map: Record<string, number> = {};
  for (const i of filtered) {
    const label = i.incident_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    map[label] = (map[label] ?? 0) + 1;
  }
  return Object.entries(map).map(([name, value]) => ({ name, value }));
}

export async function getLocationDensity(filters: Pick<IncidentFilters, "dateFrom" | "dateTo" | "refresh"> = {}): Promise<LocationDensity[]> {
  const all = await getCachedOrFetch(filters.refresh);
  const filtered = applyFilters(all, filters as IncidentFilters);
  const map: Record<string, { count: number; lat: number | null; lng: number | null }> = {};
  for (const i of filtered) {
    if (!map[i.location]) map[i.location] = { count: 0, lat: i.latitude, lng: i.longitude };
    map[i.location].count++;
  }
  return Object.entries(map).map(([location, v]) => ({ location, count: v.count, lat: v.lat, lng: v.lng }));
}

export async function getResponseTimeAnalytics(_filters: Pick<IncidentFilters, "dateFrom" | "dateTo" | "refresh"> = {}): Promise<ResponseTimePoint[]> {
  return [];
}

export async function exportIncidentsCSV(filters: IncidentFilters = {}): Promise<string> {
  const { data } = await getIncidents({ ...filters, perPage: 5000 });
  const headers = ["Incident ID", "Title", "Type", "Severity", "Location", "Status", "Reported At", "Resolved At", "Source"];
  const rows = data.map((i) =>
    [
      i.incident_id,
      `"${i.title.replace(/"/g, '""')}"`,
      i.incident_type,
      i.severity,
      `"${i.location.replace(/"/g, '""')}"`,
      i.status,
      i.reported_at,
      i.resolved_at ?? "",
      i.source,
    ].join(","),
  );
  return [headers.join(","), ...rows].join("\n");
}
