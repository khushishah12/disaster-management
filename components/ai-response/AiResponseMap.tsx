"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { useDisasterStore } from "@/lib/store/disasterStore";
import { FacilitiesLayer } from "@/components/ai-response/FacilitiesLayer";
import { DispatchLayer } from "@/components/ai-response/DispatchLayer";
import { RouteLayer } from "@/components/ai-response/RouteLayer";
import { SosMapLayer } from "@/components/ai-response/SosMapLayer";
import type { DispatchMission } from "@/lib/dispatch/types";
import type { RouteData } from "@/lib/routing/types";
import { useFacilities } from "@/lib/hooks/use-facilities";
import { INDIA_BOUNDS, INDIA_CENTER, INDIA_DEFAULT_ZOOM } from "@/lib/map/india-bounds";

const PLACED_ICON = L.divIcon({
  className: "",
  html: `<div style="width:20px;height:20px;border-radius:50%;background:#14b8a6;border:3px solid white;box-shadow:0 0 12px #14b8a680;display:flex;align-items:center;justify-content:center;"><div style="width:8px;height:8px;border-radius:50%;background:white;"></div></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

function MapClickHandler() {
  const setCoordinates = useDisasterStore((s) => s.setCoordinates);
  useMapEvents({
    click(e) {
      setCoordinates(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapBoundsFitter() {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(INDIA_BOUNDS, { padding: [30, 30] });
  }, [map]);
  return null;
}

function RadarLayer({ active }: { active: boolean }) {
  const map = useMap();
  const [tileUrl, setTileUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;

    fetch("https://api.rainviewer.com/public/weather-maps.json")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const past = data.past ?? [];
        if (past.length === 0) return;
        const latest = past[past.length - 1];
        setTileUrl(
          `https://tilecache.rainviewer.com${latest.path}/256/{z}/{x}/{y}.png`,
        );
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [active]);

  useEffect(() => {
    if (!tileUrl || !active) return;
    const layer = L.tileLayer(tileUrl, {
      opacity: 0.45,
      zIndex: 500,
    });
    layer.addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [tileUrl, active, map]);

  return null;
}

type LayerToggleProps = {
  label: string;
  active: boolean;
  color: string;
  onToggle: () => void;
};

function LayerToggle({ label, active, color, onToggle }: LayerToggleProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2 select-none">
      <span
        className="inline-block h-3 w-3 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-xs font-medium text-slate-300">{label}</span>
      <input
        type="checkbox"
        checked={active ?? false}
        onChange={onToggle}
        className="ml-auto h-3.5 w-3.5 accent-teal-500"
      />
    </label>
  );
}

type AiResponseMapProps = {
  routeData: RouteData | null;
  dispatchMissions: DispatchMission[];
};

export function AiResponseMap({ routeData, dispatchMissions }: AiResponseMapProps) {
  const latitude = useDisasterStore((s) => s.situation.latitude);
  const longitude = useDisasterStore((s) => s.situation.longitude);
  const showSos = useDisasterStore((s) => s.showSos);
  const showRadar = useDisasterStore((s) => s.showRadar);
  const showFacilities = useDisasterStore((s) => s.showFacilities);
  const toggleSos = useDisasterStore((s) => s.toggleSos);
  const toggleRadar = useDisasterStore((s) => s.toggleRadar);
  const toggleFacilities = useDisasterStore((s) => s.toggleFacilities);

  const facilityRadius = useDisasterStore((s) => s.facilityRadius);
  const { data: facilitiesData } = useFacilities(latitude, longitude, facilityRadius);

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={INDIA_CENTER}
        zoom={INDIA_DEFAULT_ZOOM}
        className="h-full w-full"
        scrollWheelZoom
        maxBounds={INDIA_BOUNDS}
        maxBoundsViscosity={1}
        style={{ minHeight: "400px" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <MapClickHandler />
        <MapBoundsFitter />
        <RadarLayer active={showRadar} />
        <SosMapLayer visible={showSos} />
        <FacilitiesLayer data={facilitiesData ?? null} visible={showFacilities} />
        <RouteLayer data={routeData} visible={true} />
        <DispatchLayer missions={dispatchMissions} visible={true} />
        {latitude != null && longitude != null && (
          <Marker position={[latitude, longitude]} icon={PLACED_ICON}>
            <Popup>
              <div className="text-sm">
                <strong>Placed Marker</strong>
                <br />
                <span className="text-xs">
                  {latitude.toFixed(4)}, {longitude.toFixed(4)}
                </span>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      <div className="absolute right-3 top-3 z-[10000] rounded-lg border border-slate-700/60 bg-slate-900/90 p-3 shadow-lg backdrop-blur-sm">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
          Overlay Layers
        </p>
        <div className="space-y-1.5">
          <LayerToggle
            label="SOS Requests"
            active={showSos}
            color="#ef4444"
            onToggle={toggleSos}
          />
          <LayerToggle
            label="RainViewer Radar"
            active={showRadar}
            color="#06b6d4"
            onToggle={toggleRadar}
          />
          <LayerToggle
            label="Emergency Facilities"
            active={showFacilities}
            color="#f59e0b"
            onToggle={toggleFacilities}
          />
        </div>
      </div>

      <div className="absolute bottom-3 left-3 z-[10000] max-w-[180px] rounded-lg border border-slate-700/60 bg-slate-900/90 p-3 shadow-lg backdrop-blur-sm">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
          Legend
        </p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 shrink-0 rounded-full border-2 border-white"
              style={{ backgroundColor: "#ef4444" }}
            />
            <span className="text-[11px] text-slate-400">SOS Requests</span>
          </div>
          {showRadar && (
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm border border-cyan-500/50 bg-cyan-500/20" />
              <span className="text-[11px] text-slate-400">Precipitation</span>
            </div>
          )}
          {showFacilities && (
            <>
              <div className="my-1.5 border-t border-slate-800" />
              <p className="text-[9px] font-medium uppercase tracking-wider text-amber-400/70">
                Facilities
              </p>
              {[
                { label: "Hospitals", color: "#dc2626" },
                { label: "Police Stations", color: "#2563eb" },
                { label: "Fire Stations", color: "#ea580c" },
                { label: "Shelters", color: "#16a34a" },
              ].map(({ label, color }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-white/30"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-[11px] text-slate-400">{label}</span>
                </div>
              ))}
            </>
          )}
          <div className="my-1.5 border-t border-slate-800" />
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 shrink-0 rounded-full border-2 border-white"
              style={{ backgroundColor: "#14b8a6" }}
            />
            <span className="text-[11px] text-slate-400">Analysis Marker</span>
          </div>
        </div>
      </div>
    </div>
  );
}
