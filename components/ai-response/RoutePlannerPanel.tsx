"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { ROUTE_COLORS, ROUTE_LABELS, type RouteData, type RouteIncidentOption, type RoutePoint } from "@/lib/routing/types";
import { calculateRouteRisk } from "@/lib/routing/risk";
import { computeWeatherImpactScore } from "@/lib/weather/impact-score";
import { useWeather } from "@/lib/hooks/use-weather";
import { useFacilities } from "@/lib/hooks/use-facilities";
import { useDisasterStore } from "@/lib/store/disasterStore";
import type { Facility } from "@/lib/facilities/types";

type RoutePlannerPanelProps = {
  incidents: RouteIncidentOption[];
  routeData: RouteData | null;
  onRouteClear: () => void;
  loading: boolean;
  onPlanRoute: (from: RoutePoint, to: RoutePoint) => void;
};

export function RoutePlannerPanel({
  incidents,
  routeData,
  onRouteClear,
  loading,
  onPlanRoute,
}: RoutePlannerPanelProps) {
  const severity = useDisasterStore((s) => s.situation.severity);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>("");
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>("");
  const [showSuccess, setShowSuccess] = useState(false);

  const selectedIncident = useMemo(
    () => incidents.find((i) => i.id === selectedIncidentId) ?? null,
    [incidents, selectedIncidentId],
  );

  const facilityLat = selectedIncident?.lat ?? null;
  const facilityLng = selectedIncident?.lng ?? null;

  const { data: weather } = useWeather(facilityLat, facilityLng);
  const { data: facilities } = useFacilities(facilityLat, facilityLng, 25000);
  const weatherScore = useMemo(
    () => (weather?.cities?.length ? computeWeatherImpactScore(weather.cities).score : 0),
    [weather],
  );

  useEffect(() => {
    if (routeData) {
      setShowSuccess(true);
      const t = setTimeout(() => setShowSuccess(false), 1000);
      return () => clearTimeout(t);
    }
  }, [routeData]);

  const fireStations = useMemo(
    () => (facilities?.facilities ?? []).filter((f) => f.type === "fire_station"),
    [facilities],
  );

  const policeStations = useMemo(
    () => (facilities?.facilities ?? []).filter((f) => f.type === "police"),
    [facilities],
  );

  const hospitals = useMemo(
    () => (facilities?.facilities ?? []).filter((f) => f.type === "hospital"),
    [facilities],
  );

  const shelters = useMemo(
    () => (facilities?.facilities ?? []).filter((f) => f.type === "shelter"),
    [facilities],
  );

  const destOptions = useMemo(() => {
    const map = new Map<string, Facility>();
    for (const f of facilities?.facilities ?? []) map.set(f.id, f);
    return Array.from(map.values());
  }, [facilities]);

  const selectedDest = useMemo(
    () => destOptions.find((f) => f.id === selectedFacilityId) ?? null,
    [destOptions, selectedFacilityId],
  );

  const handlePlan = () => {
    if (!selectedIncident || !selectedDest) return;
    onPlanRoute(
      { lat: selectedIncident.lat, lng: selectedIncident.lng },
      { lat: selectedDest.lat, lng: selectedDest.lng },
    );
  };

  const hasIncidents = incidents.length > 0;
  const hasDest = destOptions.length > 0;

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          Select Incident
        </p>
        {!hasIncidents && (
          <p className="text-xs text-slate-500">No active incidents available.</p>
        )}
        {hasIncidents && (
          <select
            value={selectedIncidentId}
            onChange={(e) => {
              setSelectedIncidentId(e.target.value);
              onRouteClear();
            }}
            className="w-full rounded-lg border border-slate-700/60 bg-slate-800/80 px-2.5 py-2 text-xs text-slate-200 outline-none focus:border-teal-500/50"
          >
            <option value="">-- Select Incident --</option>
            {incidents.map((inc) => (
              <option key={inc.id} value={inc.id}>
                {inc.label}
              </option>
            ))}
          </select>
        )}
      </div>

      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          Select Destination
        </p>
        {!hasDest && (
          <p className="text-xs text-slate-500">
            No facilities found. Search facilities first.
          </p>
        )}
        {hasDest && (
          <select
            value={selectedFacilityId}
            onChange={(e) => {
              setSelectedFacilityId(e.target.value);
              onRouteClear();
            }}
            className="w-full rounded-lg border border-slate-700/60 bg-slate-800/80 px-2.5 py-2 text-xs text-slate-200 outline-none focus:border-teal-500/50"
          >
            <option value="">-- Select Destination --</option>
            {hospitals.length > 0 && (
              <optgroup label="Hospitals">
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.distance} km)
                  </option>
                ))}
              </optgroup>
            )}
            {fireStations.length > 0 && (
              <optgroup label="Fire Stations">
                {fireStations.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.distance} km)
                  </option>
                ))}
              </optgroup>
            )}
            {policeStations.length > 0 && (
              <optgroup label="Police Stations">
                {policeStations.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.distance} km)
                  </option>
                ))}
              </optgroup>
            )}
            {shelters.length > 0 && (
              <optgroup label="Shelters">
                {shelters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.distance} km)
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        )}
      </div>

      <button
        onClick={handlePlan}
        disabled={!selectedIncident || !selectedDest || loading}
        className={cn(
          "w-full rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-all",
          selectedIncident && selectedDest && !loading
            ? "bg-teal-600 text-white hover:bg-teal-500"
            : "cursor-not-allowed bg-slate-800 text-slate-600",
        )}
      >
        {loading ? "Processing..." : "Plan Route"}
      </button>

      {showSuccess && (
        <div className="animate-in slide-in-from-top-2 rounded-lg border border-teal-500/30 bg-teal-950/50 px-3 py-2 text-center text-xs text-teal-300">
          Information updated
        </div>
      )}

      {routeData && (
        <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
          {routeData.routes.map((leg, i) => {
            const color = ROUTE_COLORS[i % ROUTE_COLORS.length];
            const label = ROUTE_LABELS[i % ROUTE_LABELS.length];
            const risk = calculateRouteRisk(leg.distance, weatherScore, severity);
            return (
              <div
                key={i}
                className="rounded-lg border p-3"
                style={{ borderColor: `${color}40`, backgroundColor: `${color}08` }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <p className="text-xs font-semibold text-slate-200">{label}</p>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <p className="text-slate-500">Distance</p>
                    <p className="font-semibold text-slate-200">
                      {(leg.distance / 1000).toFixed(1)} km
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">ETA</p>
                    <p className="font-semibold text-slate-200">
                      {Math.round(leg.time / 60)} min
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Risk</p>
                    <p className="font-semibold" style={{ color }}>
                      {risk.label}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
