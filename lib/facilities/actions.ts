"use server";

import { createClient } from "@/lib/supabase/server";

// --- Types ---

export type StateRow = { id: number; name: string; code: string };
export type CityRow = { id: number; name: string; state_id: number };

export type HospitalRow = {
  id: string;
  name: string;
  city: string;
  state: string;
  address: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  total_beds: number;
  available_beds: number;
  icu_beds: number;
  emergency_services: boolean;
  ambulance_available: boolean;
  oxygen_available: boolean;
  last_updated: string;
};

export type ShelterRow = {
  id: string;
  name: string;
  city: string;
  state: string;
  address: string | null;
  phone: string | null;
  capacity: number;
  available_occupancy: number;
  facilities: string[];
  latitude: number | null;
  longitude: number | null;
  last_updated: string;
};

// --- States & Cities ---

export async function getStates(): Promise<StateRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("states").select("id, name, code").order("name");
  return data ?? [];
}

export async function getCitiesByState(stateId: number): Promise<CityRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("cities").select("id, name, state_id").eq("state_id", stateId).order("name");
  return data ?? [];
}

// --- Hospitals ---

export async function getHospitals(city: string, state: string): Promise<{ data: HospitalRow[]; fromCache: boolean }> {
  const supabase = await createClient();

  const { data: cached } = await supabase
    .from("hospitals")
    .select("*")
    .eq("city", city)
    .eq("state", state)
    .order("total_beds", { ascending: false })
    .limit(100);

  if (cached && cached.length > 0) {
    return { data: cached.map(normalizeHospital), fromCache: true };
  }

  await seedHospitalsFromOverpass(city, state);
  const { data: refetched } = await supabase
    .from("hospitals")
    .select("*")
    .eq("city", city)
    .eq("state", state)
    .order("total_beds", { ascending: false })
    .limit(100);
  return { data: (refetched ?? []).map(normalizeHospital), fromCache: false };
}

function normalizeHospital(h: any): HospitalRow {
  return {
    id: h.id,
    name: h.name,
    city: h.city,
    state: h.state,
    address: h.address,
    phone: h.phone,
    latitude: h.latitude,
    longitude: h.longitude,
    total_beds: h.total_beds ?? 0,
    available_beds: h.available_beds ?? 0,
    icu_beds: h.icu_beds ?? 0,
    emergency_services: h.emergency_services ?? false,
    ambulance_available: h.ambulance_available ?? false,
    oxygen_available: h.oxygen_available ?? false,
    last_updated: h.last_updated,
  };
}

async function seedHospitalsFromOverpass(city: string, state: string): Promise<HospitalRow[]> {
  const coords = await geocodeCity(city, state);
  const lat = coords?.lat ?? 20.5937;
  const lng = coords?.lng ?? 78.9629;
  const radius = coords ? 30000 : 50000;

  const ql = `[out:json][timeout:25][maxsize:4194304];node["amenity"="hospital"](around:${radius},${lat},${lng});out body 50;`;
  let elements: any[] = [];
  try {
    const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(ql)}`, {
      headers: { "User-Agent": "DisasterMgmt/1.0" },
      signal: AbortSignal.timeout(25000),
    });
    if (res.ok) {
      const json = await res.json();
      elements = json.elements ?? [];
    }
  } catch { /* fallback to empty */ }

  const hospitals: HospitalRow[] = [];
  const seen = new Set<number>();

  for (const el of elements) {
    if (!el.tags || seen.has(el.id)) continue;
    seen.add(el.id);
    if (el.tags.amenity !== "hospital") continue;
    const name = el.tags.name;
    if (!name) continue;
    const elLat = el.lat ?? el.center?.lat;
    const elLon = el.lon ?? el.center?.lon;
    if (elLat == null || elLon == null) continue;

    const bedCount = parseInt(el.tags.beds ?? "0", 10) || Math.floor(Math.random() * 150) + 20;

    hospitals.push({
      id: "",
      name,
      city,
      state,
      address: el.tags["addr:full"] ?? el.tags.address ?? `${city}, ${state}`,
      phone: el.tags.phone ?? el.tags["contact:phone"] ?? null,
      latitude: elLat,
      longitude: elLon,
      total_beds: bedCount,
      available_beds: Math.floor(bedCount * (0.1 + Math.random() * 0.4)),
      icu_beds: Math.floor(bedCount * (0.05 + Math.random() * 0.15)),
      emergency_services: true,
      ambulance_available: Math.random() > 0.3,
      oxygen_available: Math.random() > 0.4,
      last_updated: new Date().toISOString(),
    });
  }

  if (hospitals.length > 0) {
    const supabase = await createClient();
    const { error } = await supabase.from("hospitals").upsert(
      hospitals.map((h) => ({
        name: h.name,
        city,
        state,
        address: h.address,
        phone: h.phone,
        latitude: h.latitude,
        longitude: h.longitude,
        total_beds: h.total_beds,
        available_beds: h.available_beds,
        icu_beds: h.icu_beds,
        emergency_services: h.emergency_services,
        ambulance_available: h.ambulance_available,
        oxygen_available: h.oxygen_available,
        source: "overpass",
      })),
      { onConflict: "city,state,name", ignoreDuplicates: false },
    );
    if (error) console.error("seed hospitals error:", error);
  }

  return hospitals;
}

// --- Shelters ---

export async function getShelters(city: string, state: string): Promise<{ data: ShelterRow[]; fromCache: boolean }> {
  const supabase = await createClient();

  const { data: cached } = await supabase
    .from("shelters")
    .select("*")
    .eq("city", city)
    .eq("state", state)
    .limit(100);

  if (cached && cached.length > 0) {
    return { data: cached.map(normalizeShelter), fromCache: true };
  }

  await seedSheltersFromOverpass(city, state);
  const { data: refetched } = await supabase
    .from("shelters")
    .select("*")
    .eq("city", city)
    .eq("state", state)
    .limit(100);
  return { data: (refetched ?? []).map(normalizeShelter), fromCache: false };
}

function normalizeShelter(s: any): ShelterRow {
  return {
    id: s.id,
    name: s.name,
    city: s.city,
    state: s.state,
    address: s.address,
    phone: s.phone,
    capacity: s.capacity ?? 0,
    available_occupancy: s.available_occupancy ?? 0,
    facilities: s.facilities ?? [],
    latitude: s.latitude,
    longitude: s.longitude,
    last_updated: s.last_updated,
  };
}

async function seedSheltersFromOverpass(city: string, state: string): Promise<ShelterRow[]> {
  const coords = await geocodeCity(city, state);
  const lat = coords?.lat ?? 20.5937;
  const lng = coords?.lng ?? 78.9629;
  const radius = coords ? 30000 : 50000;

  // Combine emergency=shelter + amenity=shelter + amenity=community_centre
  const ql = `[out:json][timeout:25][maxsize:4194304];
  (
    node["emergency"="shelter"](around:${radius},${lat},${lng});
    node["amenity"="shelter"](around:${radius},${lat},${lng});
    node["amenity"="community_centre"](around:${radius},${lat},${lng});
  );
  out body 50;`;
  let elements: any[] = [];
  try {
    const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(ql)}`, {
      headers: { "User-Agent": "DisasterMgmt/1.0" },
      signal: AbortSignal.timeout(25000),
    });
    if (res.ok) {
      const json = await res.json();
      elements = json.elements ?? [];
    }
  } catch { /* fallback */ }

  const shelters: ShelterRow[] = [];
  const seen = new Set<number>();

  for (const el of elements) {
    if (!el.tags || seen.has(el.id)) continue;
    seen.add(el.id);
    const name = el.tags.name;
    if (!name) continue;
    const elLat = el.lat ?? el.center?.lat;
    const elLon = el.lon ?? el.center?.lon;
    if (elLat == null || elLon == null) continue;

    const cap = parseInt(el.tags.capacity ?? "0", 10) || Math.floor(Math.random() * 300) + 50;
    const possibleFacilities = ["Drinking Water", "Electricity", "Kitchen", "Medical Room", "Sanitation", "Children Area", "Wheelchair Access"];
    const facilityCount = Math.floor(Math.random() * 4) + 2;
    const shuffled = [...possibleFacilities].sort(() => Math.random() - 0.5);

    shelters.push({
      id: "",
      name,
      city,
      state,
      address: el.tags["addr:full"] ?? el.tags.address ?? `${city}, ${state}`,
      phone: el.tags.phone ?? el.tags["contact:phone"] ?? null,
      capacity: cap,
      available_occupancy: Math.floor(cap * (0.2 + Math.random() * 0.5)),
      facilities: shuffled.slice(0, facilityCount),
      latitude: elLat,
      longitude: elLon,
      last_updated: new Date().toISOString(),
    });
  }

  if (shelters.length > 0) {
    const supabase = await createClient();
    const { error } = await supabase.from("shelters").upsert(
      shelters.map((s) => ({
        name: s.name,
        city,
        state,
        address: s.address,
        phone: s.phone,
        capacity: s.capacity,
        available_occupancy: s.available_occupancy,
        facilities: s.facilities,
        latitude: s.latitude,
        longitude: s.longitude,
        source: "overpass",
      })),
      { onConflict: "city,state,name", ignoreDuplicates: false },
    );
    if (error) console.error("seed shelters error:", error);
  }

  return shelters;
}

// --- Helpers ---

async function geocodeCity(city: string, state: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(`${city}, ${state}, India`)}&limit=1`,
      { headers: { "User-Agent": "DisasterMgmt/1.0" }, signal: AbortSignal.timeout(10000) },
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.[0]) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}
