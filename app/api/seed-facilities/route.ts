import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

const FACILITY_QUERIES = [
  `node["amenity"="hospital"](around:RADIUS,LAT,LNG);`,
  `node["amenity"="police"](around:RADIUS,LAT,LNG);`,
  `node["amenity"="fire_station"](around:RADIUS,LAT,LNG);`,
  `node["emergency"="shelter"](around:RADIUS,LAT,LNG);`,
  `node["amenity"="shelter"](around:RADIUS,LAT,LNG);`,
];

const TYPE_MAP: Record<string, string> = {
  hospital: "hospital",
  police: "police",
  fire_station: "fire_station",
  shelter: "shelter",
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city")?.trim();
  const state = searchParams.get("state")?.trim();

  if (!city) {
    return NextResponse.json({ error: "city is required" }, { status: 400 });
  }

  // Geocode
  const geoQuery = `${city}${state ? `, ${state}` : ""}, India`;
  let lat: number, lng: number;
  try {
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(geoQuery)}&limit=1`,
      { headers: { "User-Agent": "DisasterMgmt/1.0" }, signal: AbortSignal.timeout(10000) },
    );
    const geoData = await geoRes.json();
    if (!geoData?.[0]) {
      return NextResponse.json({ error: `Could not geocode ${city}` }, { status: 404 });
    }
    lat = parseFloat(geoData[0].lat);
    lng = parseFloat(geoData[0].lon);
  } catch {
    return NextResponse.json({ error: "Geocoding failed" }, { status: 502 });
  }

  // Overpass query
  const radius = 30000;
  const queries = FACILITY_QUERIES.map((q) =>
    q.replace("RADIUS", String(radius)).replace("LAT", String(lat)).replace("LNG", String(lng)),
  );
  const ql = `[out:json][timeout:25][maxsize:4194304];(${queries.join("")});out body 80;`;

  let elements: any[];
  try {
    const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(ql)}`, {
      headers: { "User-Agent": "DisasterMgmt/1.0" },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return NextResponse.json({ error: "Overpass query failed" }, { status: 502 });
    const json = await res.json();
    elements = json.elements ?? [];
  } catch {
    return NextResponse.json({ error: "Overpass request failed" }, { status: 502 });
  }

  const seen = new Set<number>();
  const rows: any[] = [];

  for (const el of elements) {
    if (!el.tags || seen.has(el.id)) continue;
    seen.add(el.id);
    const tagKey = el.tags.amenity ?? el.tags.emergency ?? "";
    const fType = TYPE_MAP[tagKey];
    if (!fType) continue;
    const name = el.tags.name;
    if (!name) continue;
    const elLat = el.lat ?? el.center?.lat;
    const elLon = el.lon ?? el.center?.lon;
    if (elLat == null || elLon == null) continue;

    rows.push({
      city,
      state: state || "",
      name,
      type: fType,
      phone: el.tags.phone ?? el.tags["contact:phone"] ?? null,
      operator: el.tags.operator ?? null,
      latitude: elLat,
      longitude: elLon,
      distance_km: haversine(lat, lng, elLat, elLon),
      source: "overpass",
    });
  }

  if (rows.length === 0) {
    return NextResponse.json({ count: 0, message: `No facilities found for ${city}.` });
  }

  const supabase = await createClient();
  const { error: insertError } = await supabase
    .from("city_facilities")
    .upsert(rows, { onConflict: "city,state,name,type", ignoreDuplicates: false });

  if (insertError) {
    console.error("seed insert error:", insertError);
    return NextResponse.json({ error: "Database insert failed", detail: insertError.message }, { status: 500 });
  }

  const typeCounts: Record<string, number> = {};
  for (const r of rows) {
    typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
  }

  return NextResponse.json({ count: rows.length, city, state, types: typeCounts });
}
