"use server";

import { redirect } from "next/navigation";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export type AuthActionState = {
  error?: string;
  success?: string;
};

function normalizeIdentifier(value: string) {
  return value.trim();
}

async function resolveEmail(identifier: string) {
  const trimmed = normalizeIdentifier(identifier);

  if (trimmed.includes("@")) {
    return trimmed;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_email_by_username", {
    p_username: trimmed,
  });

  if (error || !data) {
    return null;
  }

  return data as string;
}

function createServiceRoleClient() {
  const { supabaseUrl, supabaseServiceRoleKey } = getSupabaseEnv();
  if (!supabaseServiceRoleKey) throw new Error("Service role key not available");
  return createAdminClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function signIn(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const identifier = String(formData.get("usernameOrEmail") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!identifier || !password) {
    return { error: "Username/email and password are required." };
  }

  const email = await resolveEmail(identifier);

  if (!email) {
    return { error: "No account found for that username or email." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (!error) {
    const next = String(formData.get("next") ?? AUTH_ROUTES.dashboard);
    redirect(next.startsWith("/") ? next : AUTH_ROUTES.dashboard);
  }

  // Fallback: GoTrue rejected the login. Try verifying the password directly
  // via the database (handles users registered via the old RPC bypass).
  if (error) {
    const { data: verifyData, error: verifyError } = await supabase.rpc("verify_user_password", {
      p_email: email,
      p_password: password,
    });

    if (verifyError || !verifyData) {
      return { error: "Invalid login credentials." };
    }

    // Password is correct but GoTrue couldn't verify it (likely old RPC-bypass user).
    // Re-hash the password using GoTrue's bcrypt via the admin API.
    const adminClient = createServiceRoleClient();
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      verifyData as string,
      { password },
    );

    if (updateError) {
      return { error: "Please try again. If the issue persists, contact support." };
    }

    // Retry login now that the password has been re-hashed by GoTrue.
    const { error: retryError } = await supabase.auth.signInWithPassword({ email, password });

    if (retryError) {
      return { error: "Login failed after rehash. Please try again." };
    }

    const next = String(formData.get("next") ?? AUTH_ROUTES.dashboard);
    redirect(next.startsWith("/") ? next : AUTH_ROUTES.dashboard);
  }

  const next = String(formData.get("next") ?? AUTH_ROUTES.dashboard);
  redirect(next.startsWith("/") ? next : AUTH_ROUTES.dashboard);
}

export async function signUp(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const organization = String(formData.get("organization") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const role = String(formData.get("role") ?? "Volunteer");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const emergencyContact = String(formData.get("emergencyContact") ?? "").trim();

  if (!fullName || !username || !email || !password) {
    return { error: "Please fill in all required fields." };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  if (!/^[a-zA-Z0-9_]{5,15}$/.test(username)) {
    return {
      error:
        "Username must be 5–15 characters and contain only letters, numbers, and underscores.",
    };
  }

  try {
    const supabase = await createClient();

    // Use the proper GoTrue API so password hashing, identities, and metadata
    // are all handled correctly. The auto_confirm_email_trigger sets
    // email_confirmed_at = now() automatically.
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          full_name: fullName,
          phone,
          organization,
          city,
          state,
          role,
          emergency_contact: emergencyContact,
          app_role: role,
        },
      },
    });

    if (signUpError) {
      return { error: signUpError.message };
    }

    if (!data.user) {
      return { error: "Registration failed. No user returned." };
    }

    // The handle_new_user trigger already creates the profile, but it may not
    // include all fields (city, state, organization, app_role). Update it.
    const appRole = mapRoleToAppRole(role);
    await supabase.from("profiles").update({
      username,
      full_name: fullName,
      phone: phone || null,
      organization: organization || null,
      city: city || null,
      state: state || null,
      emergency_contact: emergencyContact || null,
      app_role: appRole,
    }).eq("id", data.user.id);
  } catch (err) {
    console.error("Signup exception:", err);
    return { error: "Registration failed. Please try again." };
  }

  return { success: "Account created successfully! You can now log in." };
}

function mapRoleToAppRole(role: string) {
  switch (role) {
    case "coordinator": return "coordinator";
    case "rescue_team": return "rescue_team";
    case "ambulance_team": return "ambulance_team";
    case "fire_response": return "fire_response";
    case "hospital_coordinator": return "hospital_coordinator";
    case "shelter_department": return "shelter_department";
    default: return "civilian";
  }
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(AUTH_ROUTES.login);
}
