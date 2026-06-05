"use client";

import { useEffect, useState } from "react";
import { Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { createClient } from "@/lib/supabase/client";

const EMERGENCY_ICONS: Record<string, string> = {
  medical: "🏥",
  fire: "🔥",
  flood: "🌊",
  earthquake: "🏚️",
  cyclone: "🌀",
  landslide: "⛰️",
  structural_collapse: "🏗️",
  road_accident: "🚗",
  missing_person: "🔍",
  other: "⚠️",
};

const SOS_ICON = L.divIcon({
  className: "",
  html: `<div style="width:24px;height:24px;border-radius:50%;background:#ef4444;border:3px solid white;box-shadow:0 0 16px #ef4444cc;display:flex;align-items:center;justify-content:center;"><div style="width:8px;height:8px;border-radius:50%;background:white;"></div></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-400",
  acknowledged: "bg-blue-500/15 text-blue-400",
  in_progress: "bg-orange-500/15 text-orange-400",
  rescued: "bg-emerald-500/15 text-emerald-400",
  closed: "bg-slate-500/15 text-slate-400",
  cancelled: "bg-red-500/15 text-red-400",
};

type SosRow = {
  id: string;
  ticket_number: string;
  emergency_type: string;
  severity: string;
  status: string;
  address: string | null;
  latitude: number;
  longitude: number;
  adults_count: number;
  children_count: number;
  elderly_count: number;
  injured_count: number;
  created_at: string;
};

export function SosMapLayer({ visible }: { visible: boolean }) {
  const map = useMap();
  const [requests, setRequests] = useState<SosRow[]>([]);

  useEffect(() => {
    if (!visible) { setRequests([]); return; }
    let cancelled = false;
    async function fetchSos() {
      const supabase = await createClient();
      const { data } = await supabase
        .from("sos_requests")
        .select("*")
        .in("status", ["acknowledged", "in_progress", "rescued"])
        .limit(100);
      if (!cancelled && data) setRequests(data as SosRow[]);
    }
    fetchSos();
    const id = setInterval(fetchSos, 15000);
    return () => { cancelled = true; clearInterval(id); };
  }, [visible, map]);

  if (!visible) return null;

  return (
    <>
      {requests.map((req) => (
        <Marker
          key={req.id}
          position={[req.latitude, req.longitude]}
          icon={SOS_ICON}
        >
          <Popup>
            <div className="text-sm max-w-[220px]">
              <div className="flex items-center gap-1.5 mb-1">
                <span>{EMERGENCY_ICONS[req.emergency_type] || "⚠️"}</span>
                <strong className="text-xs font-mono">{req.ticket_number}</strong>
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${STATUS_STYLES[req.status] || ""}`}>
                  {req.status.replace(/_/g, " ")}
                </span>
              </div>
              {req.address && <p className="text-[10px] text-slate-500 mb-1">{req.address}</p>}
              <p className="text-[10px] text-slate-400">
                {req.adults_count}A / {req.children_count}C / {req.elderly_count}E
                {req.injured_count ? ` · ${req.injured_count} injured` : ""}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {req.severity} · {new Date(req.created_at).toLocaleDateString("en-IN")}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}
