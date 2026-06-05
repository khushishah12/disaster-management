"use server";

import { createClient } from "@/lib/supabase/server";

export type ShelterReportType = "capacity_update" | "facility_availability" | "occupancy_report" | "evacuee_acceptance";
export type ShelterReportStatus = "active" | "completed" | "cancelled";

export type ShelterReportRow = {
  id: string;
  report_type: ShelterReportType;
  status: ShelterReportStatus;
  submitted_by: string;
  facility_id: string | null;
  title: string;
  description: string | null;
  location: string;
  state: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ShelterReportForm = {
  report_type: ShelterReportType;
  facility_id?: string;
  title: string;
  description?: string;
  location: string;
  state: string;
  city: string;
  latitude?: number;
  longitude?: number;
  data?: Record<string, unknown>;
};

export type CityFacility = {
  id: string;
  name: string;
  city: string;
  state: string;
  current_occupancy: number | null;
  max_capacity: number | null;
  food_status: string | null;
  water_status: string | null;
  sanitation_status: string | null;
  accepting_evacuees: boolean;
};

async function getSessionUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not authenticated.");
  return { supabase, user };
}

export async function getShelterFacilities(state?: string, city?: string): Promise<CityFacility[]> {
  const { supabase } = await getSessionUser();
  let query = supabase.from("city_facilities").select("*").eq("type", "shelter");
  if (state) query = query.eq("state", state);
  if (city) query = query.eq("city", city);
  const { data } = await query.order("name");
  return (data ?? []) as CityFacility[];
}

export async function getShelterFacilitiesByProfile(): Promise<CityFacility[]> {
  const { supabase, user } = await getSessionUser();
  const { data: profile } = await supabase.from("profiles").select("organization, city, state").eq("id", user.id).single();
  if (!profile) return [];
  const orgName = profile.organization;
  let query = supabase.from("city_facilities").select("*").eq("type", "shelter");
  if (orgName) query = query.eq("name", orgName);
  if (profile.city) query = query.eq("city", profile.city);
  if (profile.state) query = query.eq("state", profile.state);
  const { data } = await query.order("name");
  return (data ?? []) as CityFacility[];
}

export async function submitShelterReport(form: ShelterReportForm): Promise<{ id?: string; error?: string }> {
  try {
    const { supabase, user } = await getSessionUser();
    const { data: profile } = await supabase.from("profiles").select("app_role").eq("id", user.id).single();
    if (profile?.app_role !== "shelter_department") return { error: "Only shelter department members can submit reports." };

    const { data, error } = await supabase.from("shelter_reports").insert({
      report_type: form.report_type,
      facility_id: form.facility_id ?? null,
      title: form.title,
      description: form.description ?? null,
      location: form.location,
      state: form.state,
      city: form.city,
      latitude: form.latitude ?? null,
      longitude: form.longitude ?? null,
      data: form.data ?? {},
      submitted_by: user.id,
    }).select("id").single();

    if (error) return { error: error.message };

    if (form.facility_id && form.data) {
      const facilityUpdate: Record<string, unknown> = {};
      if (form.report_type === "capacity_update") {
        if (form.data.current_occupancy !== undefined) facilityUpdate.current_occupancy = form.data.current_occupancy;
        if (form.data.max_capacity !== undefined) facilityUpdate.max_capacity = form.data.max_capacity;
      } else if (form.report_type === "facility_availability") {
        if (form.data.food_status !== undefined) facilityUpdate.food_status = form.data.food_status;
        if (form.data.water_status !== undefined) facilityUpdate.water_status = form.data.water_status;
        if (form.data.sanitation_status !== undefined) facilityUpdate.sanitation_status = form.data.sanitation_status;
      } else if (form.report_type === "occupancy_report") {
        if (form.data.current_occupancy !== undefined) facilityUpdate.current_occupancy = form.data.current_occupancy;
      } else if (form.report_type === "evacuee_acceptance") {
        if (form.data.accepting_evacuees !== undefined) facilityUpdate.accepting_evacuees = form.data.accepting_evacuees;
      }
      if (Object.keys(facilityUpdate).length > 0) {
        await supabase.from("city_facilities").update(facilityUpdate).eq("id", form.facility_id);
      }
    }

    return { id: data.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function getMyShelterReports(typeFilter?: ShelterReportType): Promise<{ data: ShelterReportRow[] }> {
  const { supabase, user } = await getSessionUser();
  let query = supabase.from("shelter_reports").select("*").eq("submitted_by", user.id).order("created_at", { ascending: false });
  if (typeFilter) query = query.eq("report_type", typeFilter);
  const { data } = await query;
  return { data: (data ?? []) as ShelterReportRow[] };
}

export async function getActiveShelterReports(): Promise<{ data: ShelterReportRow[] }> {
  const { supabase, user } = await getSessionUser();
  const { data } = await supabase.from("shelter_reports").select("*").eq("submitted_by", user.id).eq("status", "active").order("created_at", { ascending: false });
  return { data: (data ?? []) as ShelterReportRow[] };
}

export async function updateShelterReport(id: string, updates: Partial<ShelterReportForm & { status: ShelterReportStatus }>): Promise<{ success?: string; error?: string }> {
  try {
    const { supabase } = await getSessionUser();
    const payload: Record<string, unknown> = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.location !== undefined) payload.location = updates.location;
    if (updates.state !== undefined) payload.state = updates.state;
    if (updates.city !== undefined) payload.city = updates.city;
    if (updates.latitude !== undefined) payload.latitude = updates.latitude;
    if (updates.longitude !== undefined) payload.longitude = updates.longitude;
    if (updates.data !== undefined) payload.data = updates.data;
    if (updates.status !== undefined) payload.status = updates.status;
    const { error } = await supabase.from("shelter_reports").update(payload).eq("id", id);
    if (error) return { error: error.message };
    return { success: "Report updated." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export type AddShelterForm = {
  name: string;
  city: string;
  state: string;
  capacity: number;
  address?: string;
  phone?: string;
  facilities?: string[];
};

export async function addShelter(form: AddShelterForm): Promise<{ id?: string; error?: string }> {
  try {
    const { supabase, user } = await getSessionUser();
    const { data: profile } = await supabase.from("profiles").select("app_role, organization").eq("id", user.id).single();
    if (profile?.app_role !== "shelter_department") return { error: "Only shelter department members can add shelters." };

    if (!form.name || !form.city || !form.state || !form.capacity) return { error: "Name, city, state, and capacity are required." };

    let latitude = 20.5937;
    let longitude = 78.9629;
    try {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(`${form.city}, ${form.state}, India`)}&limit=1`,
        { headers: { "User-Agent": "DisasterMgmt/1.0" }, signal: AbortSignal.timeout(10000) },
      );
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        if (geoData?.[0]) {
          latitude = parseFloat(geoData[0].lat);
          longitude = parseFloat(geoData[0].lon);
        }
      }
    } catch {}

    const { data: shelterData, error: shelterError } = await supabase.from("shelters").upsert({
      name: form.name,
      city: form.city,
      state: form.state,
      capacity: form.capacity,
      available_occupancy: form.capacity,
      address: form.address ?? null,
      phone: form.phone ?? null,
      facilities: form.facilities ?? [],
      source: "manual",
    }, { onConflict: "city,state,name", ignoreDuplicates: false }).select("id").single();

    if (shelterError) return { error: shelterError.message };

    const { error: facilityError } = await supabase.from("city_facilities").upsert({
      name: form.name,
      city: form.city,
      state: form.state,
      type: "shelter",
      phone: form.phone ?? null,
      address: form.address ?? null,
      latitude,
      longitude,
      max_capacity: form.capacity,
      operator: profile.organization ?? null,
      source: "manual",
    }, { onConflict: "city,state,name,type", ignoreDuplicates: false });

    if (facilityError) return { error: facilityError.message };

    return { id: shelterData.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}
