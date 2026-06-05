"use client";

import "leaflet/dist/leaflet.css";

import { useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import { RouteLayer } from "@/components/ai-response/RouteLayer";
import { MapRouteInstructions } from "@/components/dashboard/MapRouteInstructions";
import { INDIA_DEFAULT_ZOOM } from "@/lib/map/india-bounds";
import type { RouteData } from "@/lib/routing/types";

type Props = {
  routeData: RouteData;
  centerLat: number;
  centerLng: number;
  onClose: () => void;
};

export function FacilityMiniMap({ routeData, centerLat, centerLng, onClose }: Props) {
  const [showDirections, setShowDirections] = useState(false);

  return (
    <div className="relative h-72 overflow-hidden rounded-lg">
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={INDIA_DEFAULT_ZOOM}
        scrollWheelZoom={false}
        dragging={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RouteLayer data={routeData} visible={true} />
      </MapContainer>

      {!showDirections && (
        <button
          type="button"
          onClick={() => setShowDirections(true)}
          className="pointer-events-auto absolute bottom-3 right-3 rounded-lg bg-slate-900/90 px-3 py-1.5 text-[11px] font-semibold text-slate-300 shadow-lg backdrop-blur-sm transition hover:bg-slate-800"
        >
          🧭 Directions
        </button>
      )}

      {showDirections && routeData.routes[0]?.instructions && (
        <MapRouteInstructions
          instructions={routeData.routes[0].instructions}
          onClose={() => setShowDirections(false)}
        />
      )}
    </div>
  );
}
