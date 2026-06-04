"use server";

import { createClient } from "@/lib/supabase/server";

export type RescueReportType = "rescue_operation" | "casualty_evacuation" | "search_operation" | "resource_requirement";
export type RescueReportStatus = "active" | "completed" | "cancelled";
export type RescueReviewStatus = "pending" | "approved" | "rejected";

export type RescueReportRow = {
  id: string;
  report_type: RescueReportType;
  status: RescueReportStatus;
  submitted_by: string;
  title: string;
  description: string | null;
  location: string;
  state: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  data: Record<string, unknown>;
  media_urls: string[];
  review_status: RescueReviewStatus;
  verified_by: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
  reviewer_notes: string | null;
  edited_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type RescueReportForm = {
  report_type: RescueReportType;
  title: string;
  description?: string;
  location: string;
  state: string;
  city: string;
  latitude?: number;
  longitude?: number;
  data?: Record<string, unknown>;
  media_urls?: string[];
};

async function getSessionUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not authenticated.");
  return { supabase, user };
}

export async function submitRescueReport(form: RescueReportForm): Promise<{ id?: string; error?: string }> {
  try {
    const { supabase, user } = await getSessionUser();
    const { data: profile } = await supabase.from("profiles").select("app_role").eq("id", user.id).single();
    if (profile?.app_role !== "rescue_team") return { error: "Only rescue team members can submit reports." };

    const { data, error } = await supabase.from("rescue_reports").insert({
      report_type: form.report_type,
      title: form.title,
      description: form.description ?? null,
      location: form.location,
      state: form.state,
      city: form.city,
      latitude: form.latitude ?? null,
      longitude: form.longitude ?? null,
      data: form.data ?? {},
      media_urls: form.media_urls ?? [],
      submitted_by: user.id,
    }).select("id").single();

    if (error) return { error: error.message };
    return { id: data.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function getMyRescueReports(typeFilter?: RescueReportType): Promise<{ data: RescueReportRow[] }> {
  const { supabase, user } = await getSessionUser();
  let query = supabase.from("rescue_reports").select("*").eq("submitted_by", user.id).order("created_at", { ascending: false });
  if (typeFilter) query = query.eq("report_type", typeFilter);
  const { data } = await query;
  return { data: (data ?? []) as RescueReportRow[] };
}

export async function getActiveRescueReports(): Promise<{ data: RescueReportRow[] }> {
  const { supabase, user } = await getSessionUser();
  const { data } = await supabase.from("rescue_reports").select("*").eq("submitted_by", user.id).eq("status", "active").order("created_at", { ascending: false });
  return { data: (data ?? []) as RescueReportRow[] };
}

export async function updateRescueReport(id: string, updates: Partial<RescueReportForm & { status: RescueReportStatus }>): Promise<{ success?: string; error?: string }> {
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
    if (updates.media_urls !== undefined) payload.media_urls = updates.media_urls;
    if (updates.status !== undefined) payload.status = updates.status;
    const { error } = await supabase.from("rescue_reports").update(payload).eq("id", id);
    if (error) return { error: error.message };
    return { success: "Report updated." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function getRescueReportById(id: string): Promise<RescueReportRow | null> {
  const { supabase } = await getSessionUser();
  const { data } = await supabase.from("rescue_reports").select("*").eq("id", id).single();
  return data as RescueReportRow | null;
}

// --- Coordinator review actions ---

export async function getAllRescueReports(reviewStatus?: RescueReviewStatus): Promise<{ data: RescueReportRow[] }> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { data: [] };
  const { data: profile } = await supabase.from("profiles").select("app_role").eq("id", user.id).single();
  if (profile?.app_role !== "coordinator") return { data: [] };

  let query = supabase.from("rescue_reports").select("*").order("created_at", { ascending: false });
  if (reviewStatus) query = query.eq("review_status", reviewStatus);
  const { data } = await query;
  return { data: (data ?? []) as RescueReportRow[] };
}

export async function approveRescueReport(id: string, notes?: string, editedData?: Record<string, unknown>): Promise<{ success?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "You must be logged in." };
  const { data: profile } = await supabase.from("profiles").select("app_role").eq("id", user.id).single();
  if (profile?.app_role !== "coordinator") return { error: "Only coordinators can approve reports." };

  const payload: Record<string, unknown> = { review_status: "approved", verified_by: user.id, verified_at: new Date().toISOString(), reviewer_notes: notes ?? null };
  if (editedData) payload.edited_data = editedData;
  const { error } = await supabase.from("rescue_reports").update(payload).eq("id", id);
  if (error) return { error: "Failed to approve: " + error.message };
  return { success: "Report approved." };
}

export async function rejectRescueReport(id: string, reason: string, notes?: string): Promise<{ success?: string; error?: string }> {
  if (!reason || reason.trim().length < 5) return { error: "Rejection reason is required (min 5 characters)." };
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "You must be logged in." };
  const { data: profile } = await supabase.from("profiles").select("app_role").eq("id", user.id).single();
  if (profile?.app_role !== "coordinator") return { error: "Only coordinators can reject reports." };
  const { error } = await supabase.from("rescue_reports").update({
    review_status: "rejected", rejection_reason: reason, reviewer_notes: notes ?? null, verified_by: user.id, verified_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) return { error: "Failed to reject: " + error.message };
  return { success: "Report rejected." };
}
