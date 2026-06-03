"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

type Facility = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: string;
  distance?: number;
};

const TYPE_CONFIG: Record<string, { color: string; emoji: string; label: string }> = {
  hospital: { color: "#ef4444", emoji: "🏥", label: "Hospital" },
  police: { color: "#3b82f6", emoji: "👮", label: "Police Station" },
  fire_station: { color: "#f97316", emoji: "🚒", label: "Fire Station" },
  shelter: { color: "#22c55e", emoji: "🏠", label: "Shelter" },
};

const FACILITY_TYPES = ["hospital", "police", "fire_station", "shelter"] as const;

function Spinner() {
  return <div className="w-8 h-8 border-3 border-slate-300 dark:border-slate-600 border-t-red-500 rounded-full animate-spin" />;
}

export default function NearbyHelpPage() {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set(FACILITY_TYPES));

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserPos({ lat: latitude, lng: longitude });
      },
      () => {
        setUserPos({ lat: 20.5937, lng: 78.9629 });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    if (!userPos) return;
    const map = L.map("nearby-map", {
      center: [userPos.lat, userPos.lng],
      zoom: 13,
      zoomControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(map);
    mapRef.current = map;

    const customIcon = L.divIcon({
      className: "user-marker",
      html: `<div style="width:28px;height:28px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:12px">📍</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
    const marker = L.marker([userPos.lat, userPos.lng], { icon: customIcon }).addTo(map).bindPopup("<b>You</b>");
    userMarkerRef.current = marker;

    return () => {
      map.remove();
    };
  }, [userPos]);

  useEffect(() => {
    if (!userPos) return;
    const params = new URLSearchParams();
    FACILITY_TYPES.forEach((t) => params.append("types", t));
    params.set("lat", String(userPos.lat));
    params.set("lon", String(userPos.lng));
    params.set("radius", "5000");

    fetch(`/api/facilities?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else if (data.facilities) {
          setFacilities(data.facilities);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load nearby facilities.");
        setLoading(false);
      });
  }, [userPos]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    const filtered = facilities.filter((f) => activeTypes.has(f.type));
    const bounds = L.latLngBounds([]);

    filtered.forEach((f) => {
      const cfg = TYPE_CONFIG[f.type] ?? { color: "#64748b", emoji: "📍", label: f.type };
      const icon = L.divIcon({
        className: "facility-marker",
        html: `<div style="width:32px;height:32px;background:${cfg.color};border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;font-size:14px;cursor:pointer">${cfg.emoji}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      const marker = L.marker([f.lat, f.lon], { icon })
        .addTo(map)
        .bindPopup(`<b>${cfg.emoji} ${f.name}</b><br/>${cfg.label}${f.distance ? `<br/>${f.distance.toFixed(1)} km` : ""}`);
      markersRef.current.push(marker);
      bounds.extend([f.lat, f.lon]);
    });

    if (userPos) bounds.extend([userPos.lat, userPos.lng]);

    if (filtered.length > 0 && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [facilities, activeTypes, userPos]);

  function toggleType(type: string) {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  const grouped = FACILITY_TYPES.map((t) => ({
    ...TYPE_CONFIG[t],
    key: t,
    items: facilities.filter((f) => f.type === t),
  }));

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">🗺️</span>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-slate-900 dark:text-white truncate">Nearby Help</h1>
            <p className="text-xs text-slate-400 dark:text-slate-500">Hospitals, Police, Fire & Shelter</p>
          </div>
        </div>
      </header>

      <div className="flex-1 relative">
        {loading && !userPos ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50 dark:bg-slate-950">
            <Spinner />
          </div>
        ) : (
          <div id="nearby-map" className="w-full h-full min-h-[60dvh]" />
        )}

        {error && (
          <div className="absolute top-4 left-4 right-4 z-[999] p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm font-semibold">
            {error}
          </div>
        )}

        {!loading && facilities.length === 0 && !error && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-sm text-slate-400 dark:text-slate-500 bg-white/80 dark:bg-slate-900/80 px-4 py-2 rounded-xl">
              No facilities found in range.
            </p>
          </div>
        )}
      </div>

      {facilities.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
          <div className="max-w-4xl mx-auto px-4 py-3 flex gap-2 overflow-x-auto">
            {grouped.map(({ key, color, emoji, label, items }) => {
              const on = activeTypes.has(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleType(key)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                    on
                      ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white border-slate-300 dark:border-slate-600 shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800/30 text-slate-400 dark:text-slate-500 border-transparent"
                  }`}
                >
                  <span>{emoji}</span>
                  <span>{label}</span>
                  <span className={`text-[10px] ${on ? "text-slate-400" : "text-slate-400/50"}`}>({items.length})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {facilities.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pb-6">
          <div className="max-w-4xl mx-auto px-4 pt-3">
            {grouped
              .filter(({ key }) => activeTypes.has(key))
              .map(({ key, emoji, label, items }) => (
                <div key={key} className="mb-3 last:mb-0">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                    {emoji} {label} ({items.length})
                  </h3>
                  <div className="space-y-1">
                    {items.map((f) => (
                      <div key={f.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">{f.name}</span>
                        <span className="shrink-0 ml-3 text-xs text-slate-400 dark:text-slate-500 tabular-nums">
                          {f.distance?.toFixed(1)} km
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
