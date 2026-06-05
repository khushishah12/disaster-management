"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { DisasterSituationAnalysis } from "@/components/ai-response/DisasterSituationAnalysis";
import { FacilitiesPanel } from "@/components/ai-response/FacilitiesPanel";
import { AIIntelligencePanel } from "@/components/ai-response/AIIntelligencePanel";
import { DispatchPanel } from "@/components/ai-response/DispatchPanel";
import { RecommendationPanel } from "@/components/ai-response/RecommendationPanel";
import { ResourceAllocationPanel } from "@/components/ai-response/ResourceAllocationPanel";
import { ResourceAllocationCards } from "@/components/ai-response/ResourceAllocationCards";
import { LiveDispatchPanel } from "@/components/ai-response/LiveDispatchPanel";
import { RoutePlannerPanel } from "@/components/ai-response/RoutePlannerPanel";
import { WeatherPanel } from "@/components/ai-response/WeatherPanel";
import { PanelCard, StatCard } from "@/components/ui/PanelCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { computeRiskScores } from "@/lib/ai-intelligence/scoring";
import { useDisasterStore } from "@/lib/store/disasterStore";
import { computeWeatherImpactScore } from "@/lib/weather/impact-score";
import { generateRecommendations } from "@/lib/recommendations/engine";
import type { Recommendation } from "@/lib/recommendations/types";
import { useEonetEvents } from "@/lib/hooks/use-eonet";
import { useUsgsEvents } from "@/lib/hooks/use-usgs";
import { useGdacsEvents } from "@/lib/hooks/use-gdacs";
import { normalizeGdacsEvents } from "@/lib/map/gdacs";
import { formatUsgsTime } from "@/lib/map/usgs";
import { useWeather } from "@/lib/hooks/use-weather";
import { useFacilities } from "@/lib/hooks/use-facilities";
import { useRoute } from "@/lib/hooks/use-route";
import type { RouteIncidentOption } from "@/lib/routing/types";
import { cn } from "@/lib/utils";

const AiResponseMap = dynamic(
  () => import("@/components/ai-response/AiResponseMap").then((m) => m.AiResponseMap),
  { ssr: false },
);

const CATEGORY_LABELS: Record<string, string> = {
  wildfires: "Wildfire",
  severeStorms: "Severe Storm",
  floods: "Flood",
  landslides: "Landslide",
  earthquakes: "Earthquake",
};

const SOURCE_COLORS: Record<string, string> = {
  EONET: "text-purple-400 border-purple-500/30 bg-purple-500/10",
  USGS: "text-red-400 border-red-500/30 bg-red-500/10",
  GDACS: "text-amber-400 border-amber-500/30 bg-amber-500/10",
};

type DisplayEvent = {
  id: string;
  type: string;
  label: string;
  detail: string;
  source: "EONET" | "USGS" | "GDACS";
};

type IntelTab = "overview" | "resources" | "dispatch" | "weather" | "intel";

const TABS: { id: IntelTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "resources", label: "Resource Allocation" },
  { id: "dispatch", label: "Dispatch" },
  { id: "weather", label: "Weather & Route" },
  { id: "intel", label: "AI Intel" },
];

export function AiResponseDashboard() {
  const [activeTab, setActiveTab] = useState<IntelTab>("overview");
  const [dispatchView, setDispatchView] = useState<"live" | "simulation">("live");

  const latitude = useDisasterStore((s) => s.situation.latitude);
  const longitude = useDisasterStore((s) => s.situation.longitude);
  const disasterType = useDisasterStore((s) => s.situation.disasterType);
  const severity = useDisasterStore((s) => s.situation.severity);
  const populationAffected = useDisasterStore((s) => s.situation.populationAffected);

  const facilityRadius = useDisasterStore((s) => s.facilityRadius);
  const routeParams = useDisasterStore((s) => s.routeParams);
  const dispatchMissions = useDisasterStore((s) => s.dispatchMissions);
  const setDispatchMissions = useDisasterStore((s) => s.setDispatchMissions);
  const setRouteParams = useDisasterStore((s) => s.setRouteParams);
  const clearRoute = useDisasterStore((s) => s.clearRoute);

  const {
    data: eonetRaw,
    isLoading: eonetLoading,
    error: eonetError,
  } = useEonetEvents();
  const {
    data: usgsRaw,
    isLoading: usgsLoading,
    error: usgsError,
  } = useUsgsEvents();
  const {
    data: gdacsRaw,
    isLoading: gdacsLoading,
    error: gdacsError,
  } = useGdacsEvents();
  const {
    data: weather,
    isLoading: weatherLoading,
    error: weatherError,
    refetch: weatherRefetch,
  } = useWeather(latitude, longitude);
  const {
    data: facilities,
    isLoading: facilitiesLoading,
    error: facilitiesError,
    refetch: facilitiesRefetch,
  } = useFacilities(latitude, longitude, facilityRadius);
  const {
    data: routeRaw,
    isLoading: routeLoading,
  } = useRoute(routeParams);

  const eonetEvents = eonetRaw ?? { type: "FeatureCollection", features: [] };
  const usgsEvents = usgsRaw ?? { type: "FeatureCollection", features: [] };
  const gdacsEvents = gdacsRaw ? normalizeGdacsEvents(gdacsRaw) : { type: "FeatureCollection", features: [] };
  const routeData = routeRaw ?? null;

  const hasFacilityLocation = latitude != null && longitude != null;

  const allLoading = eonetLoading || usgsLoading || gdacsLoading || weatherLoading;
  const allError = eonetError || usgsError || gdacsError || weatherError;

  const displayEvents: DisplayEvent[] = useMemo(() => {
    const cutoff = Date.now() - 48 * 60 * 60 * 1000;
    const events: DisplayEvent[] = [];
    for (const f of eonetEvents.features) {
      const p = f.properties;
      if (!p) continue;
      if (p.closed) continue;
      if (p.date && new Date(p.date).getTime() < cutoff) continue;
      const catId = p.categories?.[0]?.id ?? "";
      events.push({
        id: p.id,
        type: CATEGORY_LABELS[catId] ?? catId,
        label: p.title,
        detail: p.date ? new Date(p.date).toLocaleString("en-IN") : "—",
        source: "EONET",
      });
    }
    for (const f of usgsEvents.features) {
      const p = f.properties;
      if (!p) continue;
      if (p.time && Number(p.time) < cutoff) continue;
      events.push({
        id: p.code,
        type: `M ${p.mag?.toFixed(1) ?? "?"}`,
        label: p.place ?? "Unknown",
        detail: p.time ? formatUsgsTime(p.time) : "—",
        source: "USGS",
      });
    }
    for (const f of gdacsEvents.features) {
      const p = f.properties;
      if (!p) continue;
      if (p.fromdate && new Date(p.fromdate).getTime() < cutoff) continue;
      events.push({
        id: String(p.eventid),
        type: p.eventtype ?? "—",
        label: p.eventname ?? p.name ?? "Unknown",
        detail: p.fromdate ? new Date(p.fromdate).toLocaleString("en-IN") : "—",
        source: "GDACS",
      });
    }
    events.sort((a, b) => b.detail.localeCompare(a.detail));
    return events.slice(0, 20);
  }, [eonetEvents, usgsEvents, gdacsEvents]);

  const { data: sosStats } = useQuery({
    queryKey: ["sos-dashboard-stats"],
    queryFn: async () => {
      const supabase = await createClient();
      const [sosRes, assignRes] = await Promise.all([
        supabase.from("sos_requests").select("id, severity", { count: "exact", head: false }).in("status", ["pending", "acknowledged", "in_progress"]),
        supabase.from("rescue_assignments").select("id", { count: "exact", head: false }).eq("status", "in_progress"),
      ]);
      const activeIncidents = sosRes.count ?? 0;
      const activeMissions = assignRes.count ?? 0;
      const criticalCount = (sosRes.data ?? []).filter((r) => r.severity?.toLowerCase() === "critical").length;
      const severeCount = (sosRes.data ?? []).filter((r) => r.severity?.toLowerCase() === "severe").length;
      return { activeIncidents, activeMissions, criticalCount, severeCount };
    },
    refetchInterval: 30000,
  });

  const { data: sosIncidents } = useQuery({
    queryKey: ["sos-route-incidents"],
    queryFn: async () => {
      const supabase = await createClient();
      const { data } = await supabase
        .from("sos_requests")
        .select("id, ticket_number, emergency_type, address, latitude, longitude, status")
        .in("status", ["pending", "acknowledged", "in_progress"])
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .order("created_at", { ascending: false });
      return (data ?? []) as { id: string; ticket_number: string; emergency_type: string; address: string | null; latitude: number; longitude: number; status: string }[];
    },
    refetchInterval: 15000,
  });

  const routeIncidents: RouteIncidentOption[] = useMemo(() => {
    if (!sosIncidents) return [];
    return sosIncidents.map((s) => ({
      id: s.id,
      label: `${s.ticket_number} — ${s.emergency_type.replace(/_/g, " ")}${s.address ? ` (${s.address})` : ""}`,
      lat: s.latitude,
      lng: s.longitude,
    }));
  }, [sosIncidents]);

  const weatherScore = useMemo(
    () => (weather?.cities?.length ? computeWeatherImpactScore(weather.cities).score : 0),
    [weather],
  );

  const riskScores = useMemo(
    () =>
      computeRiskScores({
        severity,
        populationAffected,
        weather: weather ?? null,
        facilities: facilities ?? null,
        disasterType,
      }),
    [severity, populationAffected, weather, facilities, disasterType],
  );

  const recommendations: Recommendation[] = useMemo(
    () =>
      generateRecommendations({
        weather: weather ?? null,
        severity,
        populationAffected,
        disasterType,
        facilities: facilities ?? null,
        routeData,
        weatherScore,
        floodRisk: riskScores.floodRisk,
        hospitalOverloadRisk: riskScores.hospitalOverloadRisk,
        infrastructureDamageRisk: riskScores.infrastructureDamageRisk,
        responseDelayRisk: riskScores.responseDelayRisk,
      }),
    [weather, severity, populationAffected, disasterType, facilities, routeData, weatherScore, riskScores],
  );

  return (
    <div className="dashboard-ops-bg flex min-h-screen flex-col">
      <header className="flex-shrink-0 border-b border-slate-800/60 px-4 py-3 sm:px-6 lg:px-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-teal-500 shadow-lg shadow-teal-500/30">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a8 8 0 0 0-8 8c0 5 8 12 8 12s8-7 8-12a8 8 0 0 0-8-8z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.2em] text-teal-400/90 truncate">
                Emergency Operations
              </p>
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-slate-50 truncate">
                AI Disaster Response Platform
              </h1>
            </div>
          </div>
          <span className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1",
            allLoading
              ? "bg-amber-500/10 text-amber-300 ring-amber-500/30"
              : allError
                ? "bg-red-500/10 text-red-300 ring-red-500/30"
                : "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30",
          )}>
            <span className={cn(
              "h-1.5 w-1.5 rounded-full",
              allLoading ? "bg-amber-400" : allError ? "bg-red-400" : "bg-emerald-400 animate-pulse",
            )} />
            {allLoading ? "Loading..." : allError ? "Degraded" : "System Active"}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatCard label="Active Incidents" value={String(sosStats?.activeIncidents ?? "—")} accent="text-red-400" />
          <StatCard label="Active Missions" value={String(sosStats?.activeMissions ?? "—")} accent="text-teal-400" />
          <StatCard
            label="Response Status"
            value={(sosStats?.criticalCount ?? 0) > 0 ? "Critical" : (sosStats?.severeCount ?? 0) > 0 ? "High Alert" : "Stable"}
            accent={(sosStats?.criticalCount ?? 0) > 0 ? "text-amber-400" : (sosStats?.severeCount ?? 0) > 0 ? "text-orange-400" : "text-emerald-400"}
          />
          <StatCard
            label="Emergency Level"
            value={(sosStats?.activeIncidents ?? 0) > 15 ? "Level 3" : (sosStats?.activeIncidents ?? 0) > 5 ? "Level 2" : "Level 1"}
            accent={(sosStats?.activeIncidents ?? 0) > 15 ? "text-red-400" : (sosStats?.activeIncidents ?? 0) > 5 ? "text-orange-400" : "text-teal-400"}
          />
        </div>
      </header>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-slate-800/60 px-4 pt-2 sm:px-6 lg:px-8">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "rounded-t-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-all",
              activeTab === tab.id
                ? "bg-slate-800/80 text-teal-400 border border-b-0 border-slate-700/50"
                : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/30",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-auto p-4 lg:flex-row lg:p-6">
        {/* Left panels - change by tab */}
        <aside className="flex flex-col gap-4 lg:w-[30%]">
          {activeTab === "overview" && (
            <>
              <DisasterSituationAnalysis />
              <PanelCard title="Live Events">
                {allLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-3/4" />
                  </div>
                ) : displayEvents.length === 0 ? (
                  <p className="text-sm text-slate-500">No active events in the India region.</p>
                ) : (
                  <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
                    {displayEvents.map((ev) => (
                      <div key={ev.id} className="rounded-lg border border-slate-800/60 bg-slate-900/40 p-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-200">{ev.type}</span>
                          <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", SOURCE_COLORS[ev.source])}>
                            {ev.source}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">{ev.label}</p>
                        <p className="mt-0.5 text-[10px] text-slate-500">{ev.detail}</p>
                      </div>
                    ))}
                  </div>
                )}
              </PanelCard>
            </>
          )}

          {activeTab === "resources" && (
            <>
              <PanelCard title="Live Dispatch Allocation">
                <ResourceAllocationPanel />
              </PanelCard>
              <PanelCard title="SOS Resource Cards">
                <ResourceAllocationCards />
              </PanelCard>
            </>
          )}

          {activeTab === "dispatch" && (
            <>
              <PanelCard title="Dispatch">
                <div className="mb-3 flex gap-1 rounded-lg bg-slate-800/60 p-0.5">
                  <button
                    onClick={() => setDispatchView("live")}
                    className={`flex-1 rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wider transition ${dispatchView === "live" ? "bg-teal-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
                  >
                    Live
                  </button>
                  <button
                    onClick={() => setDispatchView("simulation")}
                    className={`flex-1 rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wider transition ${dispatchView === "simulation" ? "bg-teal-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
                  >
                    Simulate
                  </button>
                </div>
                {dispatchView === "live" ? (
                  <LiveDispatchPanel />
                ) : (
                  <DispatchPanel onMissionsChange={setDispatchMissions} />
                )}
              </PanelCard>
              <PanelCard title="Emergency Facilities">
                <FacilitiesPanel hasLocation={hasFacilityLocation} />
              </PanelCard>
            </>
          )}

          {activeTab === "weather" && (
            <>
              <PanelCard title="Weather">
                <WeatherPanel />
              </PanelCard>
            </>
          )}

          {activeTab === "intel" && (
            <>
              <PanelCard title="AI Intelligence">
                <AIIntelligencePanel />
              </PanelCard>
              <PanelCard title="Recommendations">
                <RecommendationPanel recommendations={recommendations} loading={allLoading} />
              </PanelCard>
            </>
          )}
        </aside>

        {/* Map - always visible */}
        <section className={cn(
          "flex flex-col",
          activeTab === "weather" ? "lg:w-[50%]" : "lg:flex-1",
        )}>
          <div className="dashboard-panel relative flex-1 overflow-hidden rounded-xl border border-slate-800/60" style={{ minHeight: "300px" }}>
            <AiResponseMap
              routeData={routeData}
              dispatchMissions={dispatchMissions}
              eonetEvents={eonetEvents}
              usgsEvents={usgsEvents}
              gdacsEvents={gdacsEvents}
            />
          </div>
        </section>

        {/* Right panels - change by tab */}
        {activeTab === "weather" && (
          <aside className="flex w-full flex-col gap-4 lg:w-[20%]">
            <PanelCard title="Route Planner">
              <RoutePlannerPanel
                incidents={routeIncidents}
                routeData={routeData}
                onRouteClear={clearRoute}
                loading={routeLoading}
                onPlanRoute={(from, to) => setRouteParams({ fromLat: from.lat, fromLng: from.lng, toLat: to.lat, toLng: to.lng })}
              />
            </PanelCard>
          </aside>
        )}
      </div>
    </div>
  );
}
