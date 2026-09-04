"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  normalizeSalesmanPhone,
  parseCreateSalesmanInput,
  parseUpdateSalesmanInput,
  SALESMAN_DELETE_BLOCKED_MESSAGE,
} from "@/lib/validations/create-salesman";
import { ZodError } from "zod";

export interface CreateSalesmanResult {
  success: boolean;
  error?: string;
  salesmanId?: string;
}

export interface SalesmanActionResult {
  success: boolean;
  error?: string;
}

async function requireAdminOrManager() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, error: "Not signed in." as const };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "admin" && profile.role !== "manager")) {
    return {
      supabase,
      error: "You don't have permission to manage salesmen." as const,
    };
  }

  return { supabase, user, error: null };
}

function friendlyAuthError(message: string, mode: "create" | "update" = "create"): string {
  const lower = message.toLowerCase();
  if (lower.includes("already been registered") || lower.includes("already exists")) {
    return "A user with this email already exists.";
  }
  if (lower.includes("password")) {
    return "Password does not meet requirements.";
  }
  return mode === "update"
    ? "Could not update the login account. Please try again."
    : "Could not create the login account. Please try again.";
}

export async function createSalesmanAction(formData: FormData): Promise<CreateSalesmanResult> {
  const auth = await requireAdminOrManager();
  if (auth.error) {
    return { success: false, error: auth.error };
  }

  const { supabase } = auth;

  let input;
  try {
    input = parseCreateSalesmanInput({
      fullName: formData.get("fullName"),
      phone: formData.get("phone"),
      email: formData.get("email"),
      password: formData.get("password"),
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return { success: false, error: err.issues[0]?.message ?? "Invalid form data." };
    }
    return { success: false, error: "Invalid form data." };
  }

  const phoneNormalized = normalizeSalesmanPhone(input.phone);
  const email = input.email.trim().toLowerCase();

  const { data: existingPhone } = await supabase
    .from("salesmen")
    .select("id")
    .eq("phone_number_normalized", phoneNormalized)
    .maybeSingle();

  if (existingPhone) {
    return { success: false, error: "A salesman with this phone number already exists." };
  }

  const serviceClient = createServiceClient();
  const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName.trim() },
  });

  if (authError || !authData.user) {
    console.error("[createSalesmanAction] auth.admin.createUser failed", authError);
    return {
      success: false,
      error: friendlyAuthError(authError?.message ?? "Auth creation failed"),
    };
  }

  const authUserId = authData.user.id;

  const { error: userError } = await supabase.from("users").insert({
    id: authUserId,
    role: "salesman",
    full_name: input.fullName.trim(),
    email,
    is_active: true,
  });

  if (userError) {
    console.error("[createSalesmanAction] users insert failed", userError);
    await serviceClient.auth.admin.deleteUser(authUserId);
    return { success: false, error: "Could not create the user profile." };
  }

  const { data: salesman, error: salesmanError } = await supabase
    .from("salesmen")
    .insert({
      user_id: authUserId,
      full_name: input.fullName.trim(),
      phone_number: phoneNormalized,
      phone_number_normalized: phoneNormalized,
      email,
      is_active: true,
    })
    .select("id")
    .single();

  if (salesmanError || !salesman) {
    console.error("[createSalesmanAction] salesmen insert failed", salesmanError);
    await supabase.from("users").delete().eq("id", authUserId);
    await serviceClient.auth.admin.deleteUser(authUserId);
    return { success: false, error: "Could not create the salesman profile." };
  }

  return { success: true, salesmanId: salesman.id };
}

export async function updateSalesmanAction(formData: FormData): Promise<SalesmanActionResult> {
  const auth = await requireAdminOrManager();
  if (auth.error) {
    return { success: false, error: auth.error };
  }

  const { supabase } = auth;

  let input;
  try {
    const passwordRaw = formData.get("password");
    input = parseUpdateSalesmanInput({
      id: formData.get("id"),
      fullName: formData.get("fullName"),
      phone: formData.get("phone"),
      email: formData.get("email"),
      password: typeof passwordRaw === "string" ? passwordRaw : undefined,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return { success: false, error: err.issues[0]?.message ?? "Invalid form data." };
    }
    return { success: false, error: "Invalid form data." };
  }

  const phoneNormalized = normalizeSalesmanPhone(input.phone);
  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();

  const { data: existing, error: loadError } = await supabase
    .from("salesmen")
    .select("id, user_id, email, phone_number_normalized")
    .eq("id", input.id)
    .maybeSingle();

  if (loadError || !existing) {
    return { success: false, error: "Salesman not found." };
  }

  const { data: phoneClash } = await supabase
    .from("salesmen")
    .select("id")
    .eq("phone_number_normalized", phoneNormalized)
    .neq("id", input.id)
    .maybeSingle();

  if (phoneClash) {
    return { success: false, error: "A salesman with this phone number already exists." };
  }

  if (existing.user_id) {
    const serviceClient = createServiceClient();
    const authUpdates: { email?: string; password?: string; user_metadata?: { full_name: string } } =
      {
        user_metadata: { full_name: fullName },
      };
    const previousEmail = existing.email?.trim().toLowerCase() ?? "";
    if (email !== previousEmail) {
      authUpdates.email = email;
    }
    if (input.password) {
      authUpdates.password = input.password;
    }

    if (authUpdates.email || authUpdates.password || authUpdates.user_metadata) {
      const { error: authUpdateError } = await serviceClient.auth.admin.updateUserById(
        existing.user_id,
        authUpdates,
      );
      if (authUpdateError) {
        console.error("[updateSalesmanAction] auth update failed", authUpdateError);
        return {
          success: false,
          error: friendlyAuthError(authUpdateError.message, "update"),
        };
      }
    }

    const { error: userError } = await supabase
      .from("users")
      .update({ full_name: fullName, email })
      .eq("id", existing.user_id);

    if (userError) {
      console.error("[updateSalesmanAction] users update failed", userError);
      return { success: false, error: "Could not update the user profile." };
    }
  }

  const { error: salesmanError } = await supabase
    .from("salesmen")
    .update({
      full_name: fullName,
      phone_number: phoneNormalized,
      phone_number_normalized: phoneNormalized,
      email,
    })
    .eq("id", input.id);

  if (salesmanError) {
    console.error("[updateSalesmanAction] salesmen update failed", salesmanError);
    return { success: false, error: "Could not update the salesman profile." };
  }

  return { success: true };
}

export async function setSalesmanActiveAction(
  salesmanId: string,
  isActive: boolean,
): Promise<SalesmanActionResult> {
  const auth = await requireAdminOrManager();
  if (auth.error) {
    return { success: false, error: auth.error };
  }

  const { supabase } = auth;

  const { data: existing, error: loadError } = await supabase
    .from("salesmen")
    .select("id, user_id")
    .eq("id", salesmanId)
    .maybeSingle();

  if (loadError || !existing) {
    return { success: false, error: "Salesman not found." };
  }

  const { error: salesmanError } = await supabase
    .from("salesmen")
    .update({ is_active: isActive })
    .eq("id", salesmanId);

  if (salesmanError) {
    console.error("[setSalesmanActiveAction] salesmen update failed", salesmanError);
    return {
      success: false,
      error: isActive ? "Could not activate the salesman." : "Could not deactivate the salesman.",
    };
  }

  if (existing.user_id) {
    const { error: userError } = await supabase
      .from("users")
      .update({ is_active: isActive })
      .eq("id", existing.user_id);

    if (userError) {
      console.error("[setSalesmanActiveAction] users update failed", userError);
      return {
        success: false,
        error: isActive
          ? "Salesman updated, but the login account could not be activated."
          : "Salesman updated, but the login account could not be deactivated.",
      };
    }
  }

  return { success: true };
}

export async function deleteSalesmanAction(salesmanId: string): Promise<SalesmanActionResult> {
  const auth = await requireAdminOrManager();
  if (auth.error) {
    return { success: false, error: auth.error };
  }

  const { supabase } = auth;

  const { data: existing, error: loadError } = await supabase
    .from("salesmen")
    .select("id, user_id")
    .eq("id", salesmanId)
    .maybeSingle();

  if (loadError || !existing) {
    return { success: false, error: "Salesman not found." };
  }

  const [{ count: visitCount }, { count: followupCount }, { count: opportunityCount }] =
    await Promise.all([
      supabase
        .from("visits")
        .select("id", { count: "exact", head: true })
        .eq("salesman_id", salesmanId),
      supabase
        .from("followups")
        .select("id", { count: "exact", head: true })
        .eq("salesman_id", salesmanId),
      supabase
        .from("opportunities")
        .select("id", { count: "exact", head: true })
        .eq("salesman_id", salesmanId),
    ]);

  if ((visitCount ?? 0) > 0 || (followupCount ?? 0) > 0 || (opportunityCount ?? 0) > 0) {
    return { success: false, error: SALESMAN_DELETE_BLOCKED_MESSAGE };
  }

  const { error: salesmanError } = await supabase.from("salesmen").delete().eq("id", salesmanId);
  if (salesmanError) {
    console.error("[deleteSalesmanAction] salesmen delete failed", salesmanError);
    if (salesmanError.code === "23503") {
      return { success: false, error: SALESMAN_DELETE_BLOCKED_MESSAGE };
    }
    return { success: false, error: "Could not delete the salesman." };
  }

  if (existing.user_id) {
    const { error: userError } = await supabase.from("users").delete().eq("id", existing.user_id);
    if (userError) {
      console.error("[deleteSalesmanAction] users delete failed", userError);
      return {
        success: false,
        error: "Salesman removed, but the user profile could not be deleted.",
      };
    }

    const serviceClient = createServiceClient();
    const { error: authDeleteError } = await serviceClient.auth.admin.deleteUser(
      existing.user_id,
    );
    if (authDeleteError) {
      console.error("[deleteSalesmanAction] auth delete failed", authDeleteError);
      return {
        success: false,
        error: "Salesman removed, but the login account could not be deleted.",
      };
    }
  }

  return { success: true };
}
