"use server";

import { createClient } from "@/lib/supabase/server";

export type ContributionRow = {
  id: string;
  contribution_type: "hospital" | "shelter" | "incident";
  status: "pending" | "verified" | "rejected";
  submitted_by: string | null;
  submitter_name: string | null;
  submitter_contact: string | null;
  title: string;
  description: string | null;
  location: string;
  state: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  data: Record<string, unknown>;
  media_urls: string[];
  confidence_score: number;
  duplicate_of: string | null;
  duplicate_warning: string | null;
  verified_by: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
  reviewer_notes: string | null;
  edited_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export async function getContributions(status?: string): Promise<{ data: ContributionRow[] }> {
  const supabase = await createClient();
  let query = supabase.from("contributions").select("*").order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data } = await query;
  return { data: (data ?? []) as ContributionRow[] };
}

export async function getContributionById(id: string): Promise<ContributionRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("contributions").select("*").eq("id", id).single();
  return data as ContributionRow | null;
}

export async function approveContribution(id: string, notes?: string, editedData?: Record<string, unknown>): Promise<{ success?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "You must be logged in." };
  if (!(await isCoordinator())) return { error: "Only coordinators can approve contributions." };

  const { data: contrib } = await supabase.from("contributions").select("*").eq("id", id).single();
  if (!contrib) return { error: "Contribution not found." };

  const updateData: Record<string, unknown> = {
    status: "verified",
    verified_by: user.id,
    verified_at: new Date().toISOString(),
    reviewer_notes: notes ?? null,
  };

  if (editedData) updateData.edited_data = editedData;

  const { error: updateErr } = await supabase.from("contributions").update(updateData).eq("id", id);
  if (updateErr) return { error: "Failed to approve: " + updateErr.message };

  // If edited data was provided, push to the respective live table
  const finalData = editedData ?? contrib.data;

  if (contrib.contribution_type === "hospital") {
    await supabase.from("hospitals").upsert({
      name: finalData.name ?? contrib.title,
      city: contrib.city,
      state: contrib.state,
      address: finalData.address ?? contrib.location,
      phone: finalData.phone ?? null,
      latitude: finalData.latitude ?? contrib.latitude,
      longitude: finalData.longitude ?? contrib.longitude,
      total_beds: finalData.total_beds ?? 0,
      available_beds: finalData.available_beds ?? 0,
      icu_beds: finalData.icu_beds ?? 0,
      emergency_services: finalData.emergency_services ?? false,
      ambulance_available: finalData.ambulance_available ?? false,
      oxygen_available: finalData.oxygen_available ?? false,
    }, { onConflict: "city,state,name", ignoreDuplicates: false });
  } else if (contrib.contribution_type === "shelter") {
    await supabase.from("shelters").upsert({
      name: finalData.name ?? contrib.title,
      city: contrib.city,
      state: contrib.state,
      address: finalData.address ?? contrib.location,
      phone: finalData.phone ?? null,
      capacity: finalData.capacity ?? 0,
      available_occupancy: finalData.available_occupancy ?? 0,
      facilities: finalData.facilities ?? [],
      latitude: finalData.latitude ?? contrib.latitude,
      longitude: finalData.longitude ?? contrib.longitude,
    }, { onConflict: "city,state,name", ignoreDuplicates: false });
  }

  return { success: "Contribution approved and synced to system." };
}

export async function rejectContribution(id: string, reason: string, notes?: string): Promise<{ success?: string; error?: string }> {
  if (!reason || reason.trim().length < 5) return { error: "Rejection reason is required (min 5 characters)." };

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "You must be logged in." };
  if (!(await isCoordinator())) return { error: "Only coordinators can reject contributions." };

  const { error } = await supabase.from("contributions").update({
    status: "rejected",
    rejection_reason: reason,
    reviewer_notes: notes ?? null,
    verified_by: user.id,
    verified_at: new Date().toISOString(),
  }).eq("id", id);

  if (error) return { error: "Failed to reject: " + error.message };
  return { success: "Contribution rejected." };
}

export async function checkDuplicate(title: string, location: string, type: string): Promise<{ isDuplicate: boolean; match?: ContributionRow; warning?: string }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contributions")
    .select("*")
    .eq("contribution_type", type)
    .eq("status", "pending")
    .ilike("title", `%${title.slice(0, 30)}%`)
    .limit(1);

  const match = (data?.[0] ?? null) as ContributionRow | null;
  if (match && match.title.toLowerCase().includes(title.toLowerCase().slice(0, 15))) {
    return { isDuplicate: true, match, warning: `Similar contribution "${match.title}" already pending from ${match.submitter_name ?? "unknown"}.` };
  }
  return { isDuplicate: false };
}

async function isCoordinator(): Promise<boolean> {
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("app_role").eq("id", (await supabase.auth.getUser()).data.user?.id).single();
  return profile?.app_role === "coordinator";
}
