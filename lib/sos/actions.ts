"use server";

import { createClient } from "@/lib/supabase/server";
import { canCancelOwn } from "./roles";

export type SosActionResult = {
  error?: string;
  success?: string;
  ticketNumber?: string;
};

type SosSubmission = {
  emergency_type: string;
  severity: string;
  adults_count: number;
  children_count: number;
  elderly_count: number;
  injured_count: number;
  latitude: number;
  longitude: number;
  address: string;
  description: string;
  immediate_needs: string[];
  accessibility_flags: Record<string, boolean>;
  phone_number: string;
  alternate_contact: string;
};

export async function submitSosRequest(
  data: SosSubmission,
): Promise<SosActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You must be logged in to submit an SOS request." };
  }

  const { data: result, error } = await supabase
    .from("sos_requests")
    .insert({
      user_id: user.id,
      emergency_type: data.emergency_type,
      severity: data.severity,
      adults_count: data.adults_count,
      children_count: data.children_count,
      elderly_count: data.elderly_count,
      injured_count: data.injured_count,
      latitude: data.latitude,
      longitude: data.longitude,
      address: data.address || null,
      description: data.description || null,
      immediate_needs: data.immediate_needs,
      accessibility_flags: data.accessibility_flags,
      phone_number: data.phone_number || null,
      alternate_contact: data.alternate_contact || null,
    })
    .select("ticket_number")
    .single();

  if (error) {
    console.error("SOS insert error:", error);
    return { error: "Failed to submit SOS request. Please try again." };
  }

  return {
    success: "SOS request submitted successfully!",
    ticketNumber: result.ticket_number,
  };
}

export type SosRequestRow = {
  id: string;
  ticket_number: string;
  emergency_type: string;
  severity: string;
  status: string;
  address: string | null;
  description: string | null;
  latitude: number;
  longitude: number;
  adults_count: number;
  children_count: number;
  elderly_count: number;
  injured_count: number;
  immediate_needs: string[];
  phone_number: string | null;
  alternate_contact: string | null;
  created_at: string;
  updated_at: string;
};

export async function getMyRequests(): Promise<{
  data: SosRequestRow[] | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { data: null, error: "You must be logged in." };
  }

  const { data, error } = await supabase
    .from("sos_requests")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getMyRequests error:", error);
    return { data: null, error: "Failed to fetch your requests." };
  }

  return { data, error: null };
}

export async function getRequestById(id: string): Promise<{
  data: SosRequestRow | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { data: null, error: "You must be logged in." };
  }

  const { data, error } = await supabase
    .from("sos_requests")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) {
    console.error("getRequestById error:", error);
    return { data: null, error: "Request not found." };
  }

  return { data, error: null };
}

export type EditableSosFields = {
  emergency_type: string;
  severity: string;
  adults_count: number;
  children_count: number;
  elderly_count: number;
  injured_count: number;
  address: string;
  description: string;
  immediate_needs: string[];
  phone_number: string;
  alternate_contact: string;
};

export async function updateSosRequest(
  requestId: string,
  data: EditableSosFields,
): Promise<{ error?: string; success?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You must be logged in." };
  }

  const { data: existing, error: fetchError } = await supabase
    .from("sos_requests")
    .select("status, user_id")
    .eq("id", requestId)
    .single();

  if (fetchError || !existing) {
    return { error: "Request not found." };
  }

  if (existing.user_id !== user.id) {
    return { error: "You can only edit your own requests." };
  }

  if (existing.status !== "pending") {
    return { error: "Only pending requests can be edited." };
  }

  const { error: updateError } = await supabase
    .from("sos_requests")
    .update({
      emergency_type: data.emergency_type,
      severity: data.severity,
      adults_count: data.adults_count,
      children_count: data.children_count,
      elderly_count: data.elderly_count,
      injured_count: data.injured_count,
      address: data.address || null,
      description: data.description || null,
      immediate_needs: data.immediate_needs,
      phone_number: data.phone_number || null,
      alternate_contact: data.alternate_contact || null,
    })
    .eq("id", requestId);

  if (updateError) {
    console.error("updateSosRequest error:", updateError);
    return { error: "Failed to update request. Please try again." };
  }

  return { success: "SOS request updated successfully!" };
}

export async function cancelSosRequest(
  requestId: string,
): Promise<{ error?: string; success?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You must be logged in." };
  }

  const { data: request, error: fetchError } = await supabase
    .from("sos_requests")
    .select("status, user_id")
    .eq("id", requestId)
    .single();

  if (fetchError || !request) {
    return { error: "Request not found." };
  }

  if (request.user_id !== user.id) {
    return { error: "You can only cancel your own requests." };
  }

  if (!canCancelOwn("civilian", request.status)) {
    return { error: "Only pending requests can be cancelled." };
  }

  const { error: updateError } = await supabase
    .from("sos_requests")
    .update({ status: "cancelled" })
    .eq("id", requestId);

  if (updateError) {
    console.error("cancelSosRequest error:", updateError);
    return { error: "Failed to cancel request. Please try again." };
  }

  return { success: "SOS request cancelled successfully." };
}

// --- Emergency Profile ---

export type EmergencyProfile = {
  phone: string;
  emergency_contact: string;
  blood_type: string;
  medical_conditions: string;
  allergies: string;
  emergency_contacts_json: string;
};

export async function getEmergencyProfile(): Promise<{
  data: EmergencyProfile | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { data: null, error: "You must be logged in." };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("phone, emergency_contact, blood_type, medical_conditions, allergies, emergency_contacts_json")
    .eq("id", user.id)
    .single();

  if (error) {
    return { data: null, error: "Failed to fetch profile." };
  }

  return {
    data: {
      phone: data.phone ?? "",
      emergency_contact: data.emergency_contact ?? "",
      blood_type: data.blood_type ?? "",
      medical_conditions: data.medical_conditions ?? "",
      allergies: data.allergies ?? "",
      emergency_contacts_json:
        typeof data.emergency_contacts_json === "string"
          ? data.emergency_contacts_json
          : JSON.stringify(data.emergency_contacts_json ?? []),
    },
    error: null,
  };
}

export async function saveEmergencyProfile(formData: {
  phone: string;
  emergency_contact: string;
  blood_type: string;
  medical_conditions: string;
  allergies: string;
  emergency_contacts_json: string;
}): Promise<{ error?: string; success?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You must be logged in." };
  }

  let contacts: unknown;
  try {
    contacts = JSON.parse(formData.emergency_contacts_json);
  } catch {
    contacts = [];
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      phone: formData.phone || null,
      emergency_contact: formData.emergency_contact || null,
      blood_type: formData.blood_type || null,
      medical_conditions: formData.medical_conditions || null,
      allergies: formData.allergies || null,
      emergency_contacts_json: contacts,
    })
    .eq("id", user.id);

  if (error) {
    console.error("saveEmergencyProfile error:", error);
    return { error: "Failed to save profile." };
  }

  return { success: "Emergency profile saved successfully!" };
}

// --- City Facilities (cached in DB) ---

export type CityFacility = {
  id: string;
  name: string;
  type: string;
  phone: string | null;
  operator: string | null;
  distance: number;
};

type OverpassEl = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

async function geocodeCity(city: string, state: string): Promise<{ lat: number; lng: number } | null> {
  const query = `${city}, ${state}, India`;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
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

async function fetchOverpassFacilities(
  city: string,
  state: string,
): Promise<(CityFacility & { lat: number; lng: number })[]> {
  const coords = await geocodeCity(city, state);
  if (!coords) return [];

  const { lat, lng } = coords;
  const radius = 30000;

  const subQueries = [
    `node["amenity"="hospital"](around:${radius},${lat},${lng});`,
    `node["amenity"="police"](around:${radius},${lat},${lng});`,
    `node["amenity"="fire_station"](around:${radius},${lat},${lng});`,
    `node["emergency"="shelter"](around:${radius},${lat},${lng});`,
    `node["amenity"="shelter"](around:${radius},${lat},${lng});`,
  ];

  const typeMap: Record<string, string> = {
    hospital: "hospital",
    police: "police",
    fire_station: "fire_station",
    shelter: "shelter",
  };

  const ql = `[out:json][timeout:25][maxsize:4194304];(${subQueries.join("")});out body 80;`;
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(ql)}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "DisasterMgmt/1.0" },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    const elements: OverpassEl[] = json.elements ?? [];
    if (elements.length === 0) return [];

    const results: (CityFacility & { lat: number; lng: number })[] = [];
    const seen = new Set<number>();

    for (const el of elements) {
      if (!el.tags || seen.has(el.id)) continue;
      seen.add(el.id);
      const tagKey = el.tags.amenity ?? el.tags.emergency ?? "";
      const fType = typeMap[tagKey];
      if (!fType) continue;
      const name = el.tags.name;
      if (!name) continue;
      const elLat = el.lat ?? el.center?.lat;
      const elLon = el.lon ?? el.center?.lon;
      if (elLat == null || elLon == null) continue;

      const R = 6371;
      const dLat = ((elLat - lat) * Math.PI) / 180;
      const dLon = ((elLon - lng) * Math.PI) / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat * Math.PI) / 180) * Math.cos((elLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
      const dist = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;

      results.push({
        id: `${fType}-${el.id}`,
        name,
        type: fType,
        phone: el.tags.phone ?? el.tags["contact:phone"] ?? null,
        operator: el.tags.operator ?? null,
        distance: dist,
        lat: elLat,
        lng: elLon,
      });
    }

    results.sort((a, b) => a.distance - b.distance);
    return results;
  } catch {
    return [];
  }
}

export async function getCityFacilities(
  city: string,
  state: string,
): Promise<{ facilities: CityFacility[]; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("city_facilities")
    .select("id, name, type, phone, operator, distance_km")
    .eq("city", city)
    .eq("state", state)
    .order("type")
    .limit(200);

  if (error) {
    console.error("getCityFacilities error:", error);
    return { facilities: [], error: "Failed to load facilities." };
  }

  if (data && data.length > 0) {
    return {
      facilities: data.map((f) => ({
        id: f.id,
        name: f.name,
        type: f.type,
        phone: f.phone,
        operator: f.operator,
        distance: f.distance_km ?? 0,
      })),
    };
  }

  // Auto-seed on cache miss — fetch from Overpass and store
  const seed = await seedCityFacilities(city, state);
  if (seed.error || seed.count === 0) {
    return { facilities: [], error: seed.error || `No facilities found for ${city}.` };
  }

  // Read back from DB
  const { data: seeded } = await supabase
    .from("city_facilities")
    .select("id, name, type, phone, operator, distance_km")
    .eq("city", city)
    .eq("state", state)
    .order("type")
    .limit(200);

  return {
    facilities: (seeded ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      phone: f.phone,
      operator: f.operator,
      distance: f.distance_km ?? 0,
    })),
  };
}

// --- Coordinator SOS Management ---

export type SosRequestWithProfile = SosRequestRow & {
  profiles: { full_name: string; phone: string | null } | null;
};

export async function getAllSosRequests(filters?: {
  status?: string;
  severity?: string;
}): Promise<{ data: SosRequestWithProfile[]; error: string | null }> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { data: [], error: "Not authenticated." };

  const { data: profile } = await supabase.from("profiles").select("app_role").eq("id", user.id).single();
  if (profile?.app_role !== "coordinator") return { data: [], error: "Access denied." };

  let query = supabase
    .from("sos_requests")
    .select("*, profiles(full_name, phone)")
    .order("created_at", { ascending: false });

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.severity) query = query.eq("severity", filters.severity);

  const { data, error } = await query;
  if (error) return { data: [], error: error.message };
  return { data: data as SosRequestWithProfile[], error: null };
}

export async function assignTeamToSosRequest(
  requestId: string,
  assignedTeam: string,
  eta?: number,
  resourceCount?: number,
): Promise<{ success?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Not authenticated." };

  const { data: profile } = await supabase.from("profiles").select("app_role").eq("id", user.id).single();
  if (profile?.app_role !== "coordinator") return { error: "Only coordinators can assign teams." };

  // Check if this team type is already assigned
  const { data: existing } = await supabase
    .from("rescue_assignments")
    .select("id")
    .eq("request_id", requestId)
    .eq("assigned_team", assignedTeam)
    .maybeSingle();

  if (existing) return { error: "This team type is already assigned to this request." };

  const { error: assignError } = await supabase.from("rescue_assignments").insert({
    request_id: requestId,
    assigned_team: assignedTeam,
    assigned_role: "rescuer",
    assigned_to: user.id,
    eta: eta ?? null,
    resource_count: resourceCount ?? 1,
    dispatch_time: new Date().toISOString(),
  });

  if (assignError) return { error: "Failed to assign team: " + assignError.message };

  // Only bump status to acknowledged if it's still pending
  const { data: current } = await supabase
    .from("sos_requests")
    .select("status")
    .eq("id", requestId)
    .single();

  if (current?.status === "pending") {
    await supabase.from("sos_requests").update({ status: "acknowledged" }).eq("id", requestId);
  }

  return { success: "Team assigned successfully." };
}

export type SosAssignment = {
  id: string;
  assigned_team: string;
  eta: number | null;
  resource_count: number;
  dispatch_time: string;
  created_at: string;
};

export async function getSosRequestAssignments(
  requestId: string,
): Promise<{ data: SosAssignment[]; error: string | null }> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { data: [], error: "Not authenticated." };

  const { data, error } = await supabase
    .from("rescue_assignments")
    .select("id, assigned_team, eta, resource_count, dispatch_time, created_at")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });

  if (error) return { data: [], error: error.message };
  return { data: data as SosAssignment[], error: null };
}

export type TeamAssignmentRow = SosRequestWithProfile & {
  rescue_assignments: { id: string; resource_count: number; responder_lat: number | null; responder_lng: number | null }[];
};

export async function getMyTeamAssignments(): Promise<{ data: TeamAssignmentRow[]; error: string | null }> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { data: [], error: "Not authenticated." };

  const { data: profile } = await supabase.from("profiles").select("app_role").eq("id", user.id).single();
  if (!profile?.app_role || profile.app_role === "civilian" || profile.app_role === "coordinator") {
    return { data: [], error: null };
  }

  const { data, error } = await supabase
    .from("sos_requests")
    .select("*, profiles(full_name, phone), rescue_assignments!inner(id, resource_count, responder_lat, responder_lng)")
    .eq("rescue_assignments.assigned_team", profile.app_role)
    .in("status", ["acknowledged", "in_progress"])
    .order("created_at", { ascending: false });

  if (error) {
    const { data: fallback } = await supabase
      .from("sos_requests")
      .select("*, profiles(full_name, phone)")
      .in("status", ["acknowledged", "in_progress"])
      .order("created_at", { ascending: false });
    return { data: (fallback ?? []) as TeamAssignmentRow[], error: null };
  }

  return { data: (data ?? []) as TeamAssignmentRow[], error: null };
}

export async function startTeamResponse(
  requestId: string,
  resourceCount?: number,
  responderLat?: number,
  responderLng?: number,
): Promise<{ success?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Not authenticated." };

  const { data: profile } = await supabase.from("profiles").select("app_role").eq("id", user.id).single();
  if (!profile?.app_role || profile.app_role === "civilian" || profile.app_role === "coordinator") {
    return { error: "Only response teams can start a response." };
  }

  const { data: assignment } = await supabase
    .from("rescue_assignments")
    .select("id")
    .eq("request_id", requestId)
    .eq("assigned_team", profile.app_role)
    .maybeSingle();

  if (!assignment) return { error: "No assignment found for your team on this request." };

  const updateFields: Record<string, unknown> = {};
  if (resourceCount != null) updateFields.resource_count = resourceCount;
  if (responderLat != null) updateFields.responder_lat = responderLat;
  if (responderLng != null) updateFields.responder_lng = responderLng;

  if (Object.keys(updateFields).length > 0) {
    await supabase.from("rescue_assignments").update(updateFields).eq("id", assignment.id);
  }

  const { error } = await supabase.from("sos_requests").update({ status: "in_progress" }).eq("id", requestId);
  if (error) return { error: error.message };
  return { success: "Response started." };
}

export async function updateAssignmentResource(
  requestId: string,
  resourceCount: number,
): Promise<{ success?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Not authenticated." };

  const { data: profile } = await supabase.from("profiles").select("app_role").eq("id", user.id).single();
  if (!profile?.app_role || profile.app_role === "civilian" || profile.app_role === "coordinator") {
    return { error: "Only response teams can update resources." };
  }

  const { error } = await supabase
    .from("rescue_assignments")
    .update({ resource_count: resourceCount })
    .eq("request_id", requestId)
    .eq("assigned_team", profile.app_role);

  if (error) return { error: error.message };
  return { success: "Resource count updated." };
}

export async function updateSosRequestStatus(
  requestId: string,
  status: string,
): Promise<{ success?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Not authenticated." };

  const { data: profile } = await supabase.from("profiles").select("app_role").eq("id", user.id).single();
  if (!profile?.app_role) return { error: "Profile not found." };

  // Coordinators can update any status
  if (profile.app_role === "coordinator") {
    const { error } = await supabase.from("sos_requests").update({ status }).eq("id", requestId);
    if (error) return { error: error.message };
    return { success: "Status updated." };
  }

  // Team roles can only mark in_progress -> rescued on their own assignments
  if (["rescue_team", "ambulance_team", "fire_response"].includes(profile.app_role)) {
    if (status !== "rescued") return { error: "Teams can only mark requests as rescued." };

    const { data: assignment } = await supabase
      .from("rescue_assignments")
      .select("id")
      .eq("request_id", requestId)
      .eq("assigned_team", profile.app_role)
      .maybeSingle();

    if (!assignment) return { error: "This request is not assigned to your team." };

    const { error } = await supabase.from("sos_requests").update({ status }).eq("id", requestId);
    if (error) return { error: error.message };
    return { success: "Request marked as rescued." };
  }

  return { error: "You are not authorized to update status." };
}

export async function getAvailableResponders(): Promise<{ data: { id: string; full_name: string; app_role: string }[]; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, app_role")
    .in("app_role", ["rescue_team", "ambulance_team", "fire_response"])
    .order("full_name");

  if (error) return { data: [], error: error.message };
  return { data: data as { id: string; full_name: string; app_role: string }[], error: null };
}

// ─── Resource Allocation Stats ───────────────────────────────────

export type ResourceAllocationStats = {
  disaster_type: string;
  total_assignments: number;
  total_resources: number;
  assigned_teams: { team: string; count: number; resources: number }[];
};

export async function getResourceAllocationByDisaster(): Promise<{
  data: ResourceAllocationStats[];
  error: string | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sos_requests")
    .select(`
      emergency_type,
      rescue_assignments (
        assigned_team,
        resource_count
      )
    `)
    .in("status", ["acknowledged", "in_progress", "rescued"]);

  if (error) return { data: [], error: error.message };

  const map = new Map<string, Map<string, { count: number; resources: number }>>();

  for (const row of data as { emergency_type: string; rescue_assignments: { assigned_team: string; resource_count: number }[] }[]) {
    const type = row.emergency_type || "unknown";
    if (!map.has(type)) map.set(type, new Map());
    const teamMap = map.get(type)!;
    const assignments = row.rescue_assignments ?? [];
    for (const a of assignments) {
      if (!teamMap.has(a.assigned_team)) {
        teamMap.set(a.assigned_team, { count: 0, resources: 0 });
      }
      const entry = teamMap.get(a.assigned_team)!;
      entry.count += 1;
      entry.resources += a.resource_count ?? 1;
    }
  }

  const result: ResourceAllocationStats[] = [];
  for (const [disasterType, teamMap] of map) {
    const teams = Array.from(teamMap.entries()).map(([team, stats]) => ({
      team,
      count: stats.count,
      resources: stats.resources,
    }));
    const totalResources = teams.reduce((s, t) => s + t.resources, 0);
    const totalAssignments = teams.reduce((s, t) => s + t.count, 0);
    result.push({
      disaster_type: disasterType,
      total_assignments: totalAssignments,
      total_resources: totalResources,
      assigned_teams: teams,
    });
  }

  return { data: result, error: null };
}

// ─── Active Responder Assignments (for dispatch viz) ─────────────

export type ActiveResponderAssignment = {
  assignment_id: string;
  request_id: string;
  sos_ticket: string;
  emergency_type: string;
  assigned_team: string;
  resource_count: number;
  responder_lat: number | null;
  responder_lng: number | null;
  incident_lat: number;
  incident_lng: number;
  incident_address: string | null;
  status: string;
  sos_created_at: string;
};

export async function getActiveResponderAssignments(): Promise<{
  data: ActiveResponderAssignment[];
  error: string | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rescue_assignments")
    .select(`
      id,
      request_id,
      responder_lat,
      responder_lng,
      resource_count,
      assigned_team,
      sos_requests!inner(
        ticket_number,
        emergency_type,
        latitude,
        longitude,
        address,
        status,
        created_at
      )
    `)
    .in("sos_requests.status", ["in_progress"])
    .not("responder_lat", "is", null)
    .not("responder_lng", "is", null);

  if (error) return { data: [], error: error.message };

  const rows = data as unknown as {
    id: string;
    request_id: string;
    responder_lat: number;
    responder_lng: number;
    resource_count: number;
    assigned_team: string;
    sos_requests: {
      ticket_number: string;
      emergency_type: string;
      latitude: number;
      longitude: number;
      address: string | null;
      status: string;
      created_at: string;
    };
  }[];

  const result: ActiveResponderAssignment[] = rows.map((r) => ({
    assignment_id: r.id,
    request_id: r.request_id,
    sos_ticket: r.sos_requests.ticket_number,
    emergency_type: r.sos_requests.emergency_type,
    assigned_team: r.assigned_team,
    resource_count: r.resource_count,
    responder_lat: r.responder_lat,
    responder_lng: r.responder_lng,
    incident_lat: r.sos_requests.latitude,
    incident_lng: r.sos_requests.longitude,
    incident_address: r.sos_requests.address,
    status: r.sos_requests.status,
    sos_created_at: r.sos_requests.created_at,
  }));

  return { data: result, error: null };
}

export async function seedCityFacilities(
  city: string,
  state: string,
): Promise<{ count: number; error?: string }> {
  const facilities = await fetchOverpassFacilities(city, state);
  if (facilities.length === 0) return { count: 0, error: `No facilities found for ${city}.` };

  const supabase = await createClient();
  const rows = facilities.map((f) => ({
    city,
    state,
    name: f.name,
    type: f.type,
    phone: f.phone,
    operator: f.operator,
    latitude: f.lat,
    longitude: f.lng,
    distance_km: f.distance,
    source: "overpass",
  }));

  const { error: insertError } = await supabase
    .from("city_facilities")
    .upsert(rows, { onConflict: "city,state,name,type", ignoreDuplicates: false });

  if (insertError) {
    console.error("seedCityFacilities upsert error:", insertError);
    return { count: 0, error: "Failed to save facilities to database." };
  }

  return { count: facilities.length };
}
