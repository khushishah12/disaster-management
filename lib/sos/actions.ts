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
