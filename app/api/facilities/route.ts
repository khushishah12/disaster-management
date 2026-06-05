import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

type DbFacility = {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  operator: string | null;
};

function boundingBox(lat: number, lng: number, radiusKm: number) {
  const latDeg = radiusKm / 111.32;
  const lngDeg = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  return { minLat: lat - latDeg, maxLat: lat + latDeg, minLng: lng - lngDeg, maxLng: lng + lngDeg };
}

function buildFacilityFromDb(row: DbFacility, lat: number, lng: number): Facility {
  const dist = haversineKm(lat, lng, row.latitude, row.longitude);
  const type = row.type as FacilityType;
  return {
    id: `${type}-${row.id}`,
    name: row.name,
    type,
    lat: row.latitude,
    lng: row.longitude,
    distance: Math.round(dist * 10) / 10,
    etaMinutes: etaMinutes(type, dist),
    capacity: null,
    availability: "Unknown",
    phone: row.phone ?? undefined,
    operator: row.operator ?? undefined,
  };
}

function gridCell(lat: number, lng: number): { city: string; state: string } {
  const rlat = Math.round(lat * 100) / 100;
  const rlng = Math.round(lng * 100) / 100;
  return { city: `grid_${rlat}_${rlng}`, state: "overpass_cache" };
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

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

    const radiusKm = radius / 1000;
    const box = boundingBox(lat, lng, radiusKm);
    const { city, state } = gridCell(lat, lng);

    // 1. Try cache first (look for any facilities in the area, not just from this grid cell)
    const { data: cachedRows } = await supabase
      .from("city_facilities")
      .select("id, name, type, latitude, longitude, phone, operator")
      .gte("latitude", box.minLat)
      .lte("latitude", box.maxLat)
      .gte("longitude", box.minLng)
      .lte("longitude", box.maxLng)
      .limit(100);

    const cachedFacilities: Facility[] = (cachedRows ?? []).map((r) =>
      buildFacilityFromDb(r as unknown as DbFacility, lat, lng),
    );
    cachedFacilities.sort((a, b) => a.distance - b.distance);

    // If we have enough cached results, return them
    if (cachedFacilities.length >= 5) {
      const payload: FacilitiesData = {
        facilities: cachedFacilities,
        fetchedAt: Date.now(),
        center: { lat, lng },
        radius,
      };
      return NextResponse.json(payload, {
        headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" },
      });
    }

    // 2. Fetch from Overpass API
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
      // Fallback: return whatever we have from cache even if < 5
      if (cachedFacilities.length > 0) {
        const payload: FacilitiesData = {
          facilities: cachedFacilities,
          fetchedAt: Date.now(),
          center: { lat, lng },
          radius,

        };
        return NextResponse.json(payload);
      }
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
    const rowsToInsert: { city: string; state: string; name: string; type: string; latitude: number; longitude: number; phone: string | null; operator: string | null }[] = [];

    for (const el of elements) {
      if (!el.tags || seen.has(el.id)) continue;
      seen.add(el.id);

      const tagKey = el.tags.amenity ?? el.tags.emergency ?? "";
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

      rowsToInsert.push({
        city,
        state,
        name,
        type: fType,
        latitude: fLat,
        longitude: fLng,
        phone: el.tags.phone ?? el.tags["contact:phone"] ?? null,
        operator: el.tags.operator ?? null,
      });
    }

    facilities.sort((a, b) => a.distance - b.distance);

    // 3. Upsert to city_facilities for next time
    if (rowsToInsert.length > 0) {
      const { error: upsertErr } = await supabase
        .from("city_facilities")
        .upsert(rowsToInsert, {
          onConflict: "city,state,name,type",
          ignoreDuplicates: true,
        });
      if (upsertErr) {
        console.error("[Facilities] upsert error:", upsertErr);
      }
    }

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
