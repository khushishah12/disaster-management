"use server";

import { createClient } from "@/lib/supabase/server";

export type HospitalReportType = "bed_availability" | "resource_shortage" | "patient_intake";
export type HospitalReportStatus = "active" | "completed" | "cancelled";

export type HospitalReportRow = {
  id: string;
  report_type: HospitalReportType;
  status: HospitalReportStatus;
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

export type HospitalReportForm = {
  report_type: HospitalReportType;
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

export type HospitalFacility = {
  id: string;
  name: string;
  city: string;
  state: string;
  total_beds: number | null;
  available_beds: number | null;
  icu_beds: number | null;
  oxygen_available: boolean | null;
  ventilator_available: boolean | null;
  surge_capacity: string | null;
};

async function getSessionUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not authenticated.");
  return { supabase, user };
}

export async function getHospitalFacilities(state?: string, city?: string): Promise<HospitalFacility[]> {
  const { supabase } = await getSessionUser();
  let query = supabase.from("city_facilities").select("*").eq("type", "hospital");
  if (state) query = query.eq("state", state);
  if (city) query = query.eq("city", city);
  const { data } = await query.order("name");
  return (data ?? []) as HospitalFacility[];
}

export async function getHospitalFacilitiesByProfile(): Promise<HospitalFacility[]> {
  const { supabase, user } = await getSessionUser();
  const { data: profile } = await supabase.from("profiles").select("organization, city, state").eq("id", user.id).single();
  if (!profile) return [];
  let query = supabase.from("city_facilities").select("*").eq("type", "hospital");
  if (profile.organization) query = query.eq("name", profile.organization);
  if (profile.city) query = query.eq("city", profile.city);
  if (profile.state) query = query.eq("state", profile.state);
  const { data } = await query.order("name");
  return (data ?? []) as HospitalFacility[];
}

export async function submitHospitalReport(form: HospitalReportForm): Promise<{ id?: string; error?: string }> {
  try {
    const { supabase, user } = await getSessionUser();
    const { data: profile } = await supabase.from("profiles").select("app_role").eq("id", user.id).single();
    if (profile?.app_role !== "hospital_coordinator") return { error: "Only hospital coordinators can submit reports." };

    const { data, error } = await supabase.from("hospital_reports").insert({
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
      if (form.report_type === "bed_availability") {
        if (form.data.available_beds !== undefined) facilityUpdate.available_beds = form.data.available_beds;
        if (form.data.icu_beds !== undefined) facilityUpdate.icu_beds = form.data.icu_beds;
        if (form.data.total_beds !== undefined) facilityUpdate.total_beds = form.data.total_beds;
      } else if (form.report_type === "resource_shortage") {
        if (form.data.oxygen_available !== undefined) facilityUpdate.oxygen_available = form.data.oxygen_available;
        if (form.data.ventilator_available !== undefined) facilityUpdate.ventilator_available = form.data.ventilator_available;
      } else if (form.report_type === "patient_intake") {
        if (form.data.surge_capacity !== undefined) facilityUpdate.surge_capacity = form.data.surge_capacity;
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

export async function getMyHospitalReports(typeFilter?: HospitalReportType): Promise<{ data: HospitalReportRow[] }> {
  const { supabase, user } = await getSessionUser();
  let query = supabase.from("hospital_reports").select("*").eq("submitted_by", user.id).order("created_at", { ascending: false });
  if (typeFilter) query = query.eq("report_type", typeFilter);
  const { data } = await query;
  return { data: (data ?? []) as HospitalReportRow[] };
}

export async function getActiveHospitalReports(): Promise<{ data: HospitalReportRow[] }> {
  const { supabase, user } = await getSessionUser();
  const { data } = await supabase.from("hospital_reports").select("*").eq("submitted_by", user.id).eq("status", "active").order("created_at", { ascending: false });
  return { data: (data ?? []) as HospitalReportRow[] };
}

export async function updateHospitalReport(id: string, updates: Partial<HospitalReportForm & { status: HospitalReportStatus }>): Promise<{ success?: string; error?: string }> {
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
    const { error } = await supabase.from("hospital_reports").update(payload).eq("id", id);
    if (error) return { error: error.message };
    return { success: "Report updated." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export type AddHospitalForm = {
  name: string;
  city: string;
  state: string;
  total_beds: number;
  available_beds: number;
  icu_beds: number;
  address?: string;
  phone?: string;
  emergency_services?: boolean;
  ambulance_available?: boolean;
  oxygen_available?: boolean;
};

export async function addHospital(form: AddHospitalForm): Promise<{ id?: string; error?: string }> {
  try {
    const { supabase, user } = await getSessionUser();
    const { data: profile } = await supabase.from("profiles").select("app_role, organization").eq("id", user.id).single();
    if (profile?.app_role !== "hospital_coordinator") return { error: "Only hospital coordinators can add hospitals." };

    if (!form.name || !form.city || !form.state) return { error: "Name, city, and state are required." };

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

    const { data: hospitalData, error: hospitalError } = await supabase.from("hospitals").upsert({
      name: form.name,
      city: form.city,
      state: form.state,
      total_beds: form.total_beds,
      available_beds: form.available_beds,
      icu_beds: form.icu_beds,
      address: form.address ?? null,
      phone: form.phone ?? null,
      emergency_services: form.emergency_services ?? false,
      ambulance_available: form.ambulance_available ?? false,
      oxygen_available: form.oxygen_available ?? false,
      source: "manual",
    }, { onConflict: "city,state,name", ignoreDuplicates: false }).select("id").single();

    if (hospitalError) return { error: hospitalError.message };

    const { error: facilityError } = await supabase.from("city_facilities").upsert({
      name: form.name,
      city: form.city,
      state: form.state,
      type: "hospital",
      phone: form.phone ?? null,
      address: form.address ?? null,
      latitude,
      longitude,
      total_beds: form.total_beds,
      available_beds: form.available_beds,
      icu_beds: form.icu_beds,
      oxygen_available: form.oxygen_available ?? false,
      operator: profile.organization ?? null,
      source: "manual",
    }, { onConflict: "city,state,name,type", ignoreDuplicates: false });

    if (facilityError) return { error: facilityError.message };

    return { id: hospitalData.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}
