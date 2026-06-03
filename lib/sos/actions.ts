"use server";

import { createClient } from "@/lib/supabase/server";

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
