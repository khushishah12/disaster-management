import { NextResponse } from "next/server";

import type { Facility, FacilityType, FacilitiesData } from "@/lib/facilities/types";

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function etaMinutes(type: FacilityType, distKm: number): number {
  const speeds: Record<FacilityType, number> = {
    hospital: 40,
    police: 50,
    fire_station: 50,
    shelter: 30,
  };
  return Math.round((distKm / (speeds[type] ?? 40)) * 60);
}

const FACILITY_QUERIES = [
  `node["amenity"="hospital"](around:RADIUS,LAT,LNG);`,
  `node["amenity"="police"](around:RADIUS,LAT,LNG);`,
  `node["amenity"="fire_station"](around:RADIUS,LAT,LNG);`,
  `node["emergency"="shelter"](around:RADIUS,LAT,LNG);`,
  `node["amenity"="shelter"](around:RADIUS,LAT,LNG);`,
];

type OverpassElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

export const GET = async (req: Request) => {
  try {
    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get("lat") ?? "");
    const lng = parseFloat(searchParams.get("lng") ?? "");
    const radius = parseInt(searchParams.get("radius") ?? "25000", 10);

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
    }

    if (radius < 1000 || radius > 100000) {
      return NextResponse.json({ error: "radius must be between 1000 and 100000" }, { status: 400 });
    }

    const queries = FACILITY_QUERIES.map((q) =>
      q.replace("RADIUS", String(radius)).replace("LAT", String(lat)).replace("LNG", String(lng)),
    );

    const overpassQl = `[out:json][timeout:15][maxsize:2097152];(${queries.join("")});out center body 20;`;

    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQl)}`;

    const res = await fetch(url, {
      headers: { "User-Agent": "DisasterMgmt/1.0" },
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[Facilities] Overpass error (${res.status}): ${text.slice(0, 300)}`);
      return NextResponse.json(
        { error: `Overpass API request failed (${res.status})` },
        { status: 502 },
      );
    }

    const json = await res.json();
    const elements: OverpassElement[] = json.elements ?? [];

    const typeMap: Record<string, FacilityType> = {
      hospital: "hospital",
      police: "police",
      fire_station: "fire_station",
      shelter: "shelter",
    };

    const seen = new Set<number>();
    const facilities: Facility[] = [];

    for (const el of elements) {
      if (!el.tags || seen.has(el.id)) continue;
      seen.add(el.id);

      const tagKey =
        el.tags.amenity ?? el.tags.emergency ?? "";
      const fType = typeMap[tagKey];
      if (!fType) continue;

      const fLat = el.lat ?? el.center?.lat;
      const fLng = el.lon ?? el.center?.lon;
      if (fLat == null || fLng == null) continue;

      const name = el.tags.name ?? `Unnamed ${tagKey}`;
      if (name === `Unnamed ${tagKey}` && fType !== "shelter") continue;

      const dist = haversineKm(lat, lng, fLat, fLng);
      const cap = parseInt(el.tags.beds ?? el.tags.capacity ?? "", 10);

      const capacity = isNaN(cap) ? null : cap;
      const availability = capacity ? `${Math.round(capacity * 0.3)}–${capacity}` : "Unknown";

      facilities.push({
        id: `${fType}-${el.id}`,
        name,
        type: fType,
        lat: fLat,
        lng: fLng,
        distance: Math.round(dist * 10) / 10,
        etaMinutes: etaMinutes(fType, dist),
        capacity,
        availability,
        phone: el.tags.phone ?? el.tags["contact:phone"],
        operator: el.tags.operator,
      });
    }

    facilities.sort((a, b) => a.distance - b.distance);

    const payload: FacilitiesData = {
      facilities,
      fetchedAt: Date.now(),
      center: { lat, lng },
      radius,
    };

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" },
    });
  } catch (error) {
    console.error("[Facilities] error:", error);
    return NextResponse.json({ error: "Failed to fetch facilities" }, { status: 502 });
  }
};
