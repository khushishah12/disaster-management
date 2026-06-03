"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/sos/roles";
import {
  RESCUE_TEAM_PAGE_SIZE,
  type DisasterRow,
  type RescueTaskStatus,
  type RescueTeamFormInput,
  type RescueTeamMemberRow,
  type RescueTeamsPageResult,
} from "@/lib/rescue-teams/types";

type RescueTeamsQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: RescueTaskStatus | "all";
  disasterId?: string | "all";
};

type ActionResult = {
  error?: string;
  success?: string;
};

function normalizeSearchTerm(search?: string) {
  return (search ?? "").trim().replace(/[%(),]/g, "");
}

function normalizeText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function clampPriority(priority: number) {
  if (!Number.isFinite(priority)) return 2;
  return Math.min(3, Math.max(1, Math.trunc(priority)));
}

async function getSessionRole() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { supabase, userId: null, appRole: null as AppRole | null, error: "You must be logged in." };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("app_role")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return { supabase, userId: user.id, appRole: null as AppRole | null, error: "Your profile could not be loaded." };
  }

  return {
    supabase,
    userId: user.id,
    appRole: profile.app_role as AppRole,
    error: null as string | null,
  };
}

async function requireResponder() {
  const context = await getSessionRole();
  if (context.error) return context;

  if (context.appRole === "civilian") {
    return { ...context, error: "Only responder accounts can view rescue team management." };
  }

  return context;
}

async function requireCoordinator() {
  const context = await getSessionRole();
  if (context.error) return context;

  if (context.appRole !== "coordinator") {
    return { ...context, error: "Only disaster coordinators can manage rescue teams." };
  }

  return context;
}

function buildCompletedAt(
  status: RescueTaskStatus,
  existingCompletedAt?: string | null,
): string | null {
  if (status !== "completed") return null;
  return existingCompletedAt ?? new Date().toISOString();
}

export async function getRescueTeamsPage(
  query: RescueTeamsQuery = {},
): Promise<RescueTeamsPageResult & { error?: string }> {
  const context = await requireResponder();
  if (context.error) {
    return {
      members: [],
      disasters: [],
      totalCount: 0,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? RESCUE_TEAM_PAGE_SIZE,
      error: context.error,
    };
  }

  const { supabase } = context;
  const pageSize = query.pageSize ?? RESCUE_TEAM_PAGE_SIZE;
  const page = Math.max(1, query.page ?? 1);
  const offset = (page - 1) * pageSize;
  const search = normalizeSearchTerm(query.search);

  let memberQuery = supabase
    .from("rescue_team_members")
    .select(
      "id,name,role,phone,email,base_location,skills,notes,assigned_disaster_id,task_status,priority,completed_at,created_at,updated_at",
      { count: "exact" },
    )
    .order("updated_at", { ascending: false });

  if (search) {
    memberQuery = memberQuery.or(
      `name.ilike.%${search}%,role.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%,base_location.ilike.%${search}%`,
    );
  }

  if (query.status && query.status !== "all") {
    memberQuery = memberQuery.eq("task_status", query.status);
  }

  if (query.disasterId === "") {
    memberQuery = memberQuery.is("assigned_disaster_id", null);
  } else if (query.disasterId && query.disasterId !== "all") {
    memberQuery = memberQuery.eq("assigned_disaster_id", query.disasterId);
  }

  const [membersResult, disastersResult] = await Promise.all([
    memberQuery.range(offset, offset + pageSize - 1),
    supabase
      .from("disasters")
      .select("id,title,disaster_type,location,severity,response_status,reported_at,created_at,updated_at")
      .order("reported_at", { ascending: false }),
  ]);

  if (membersResult.error) {
    return {
      members: [],
      disasters: [],
      totalCount: 0,
      page,
      pageSize,
      error: "Failed to load rescue team members.",
    };
  }

  if (disastersResult.error) {
    return {
      members: [],
      disasters: [],
      totalCount: 0,
      page,
      pageSize,
      error: "Failed to load disaster assignments.",
    };
  }

  const disasterLookup = new Map<string, DisasterRow>(
    (disastersResult.data ?? []).map((disaster) => [disaster.id, disaster as DisasterRow]),
  );

  const members = (membersResult.data ?? []).map((member) => ({
    ...(member as Omit<RescueTeamMemberRow, "assigned_disaster">),
    assigned_disaster: member.assigned_disaster_id
      ? disasterLookup.get(member.assigned_disaster_id) ?? null
      : null,
  }));

  return {
    members,
    disasters: (disastersResult.data ?? []) as DisasterRow[],
    totalCount: membersResult.count ?? 0,
    page,
    pageSize,
  };
}

export async function saveRescueTeamMember(
  member: RescueTeamFormInput & { id?: string },
): Promise<ActionResult> {
  const context = await requireCoordinator();
  if (context.error) return { error: context.error };

  const { supabase } = context;
  const payload = {
    name: member.name.trim(),
    role: member.role.trim(),
    phone: normalizeText(member.phone),
    email: normalizeText(member.email),
    base_location: normalizeText(member.base_location),
    skills: member.skills.map((skill) => skill.trim()).filter(Boolean),
    notes: normalizeText(member.notes),
    assigned_disaster_id: member.assigned_disaster_id || null,
    task_status: member.task_status,
    priority: clampPriority(member.priority),
  };

  if (!payload.name || !payload.role) {
    return { error: "Member name and role are required." };
  }

  if (member.id) {
    const { data: existing, error: fetchError } = await supabase
      .from("rescue_team_members")
      .select("completed_at")
      .eq("id", member.id)
      .single();

    if (fetchError || !existing) {
      return { error: "The selected member could not be found." };
    }

    const { error } = await supabase
      .from("rescue_team_members")
      .update({
        ...payload,
        completed_at: buildCompletedAt(member.task_status, existing.completed_at),
      })
      .eq("id", member.id);

    if (error) {
      return { error: "Failed to update the rescue team member." };
    }
  } else {
    const { error } = await supabase
      .from("rescue_team_members")
      .insert({
        ...payload,
        completed_at: buildCompletedAt(member.task_status),
      });

    if (error) {
      return { error: "Failed to add the rescue team member." };
    }
  }

  revalidatePath("/dashboard");
  return { success: member.id ? "Member updated successfully." : "Member added successfully." };
}

export async function deleteRescueTeamMember(memberId: string): Promise<ActionResult> {
  const context = await requireCoordinator();
  if (context.error) return { error: context.error };

  const { supabase } = context;
  const { error } = await supabase
    .from("rescue_team_members")
    .delete()
    .eq("id", memberId);

  if (error) {
    return { error: "Failed to delete the rescue team member." };
  }

  revalidatePath("/dashboard");
  return { success: "Member deleted successfully." };
}

export async function completeRescueTask(memberId: string): Promise<ActionResult> {
  const context = await requireCoordinator();
  if (context.error) return { error: context.error };

  const { supabase } = context;
  const { error } = await supabase
    .from("rescue_team_members")
    .update({
      task_status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", memberId);

  if (error) {
    return { error: "Failed to mark the task as completed." };
  }

  revalidatePath("/dashboard");
  return { success: "Task marked as completed." };
}
