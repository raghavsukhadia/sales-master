"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  normalizeSalesmanPhone,
  parseCreateSalesmanInput,
} from "@/lib/validations/create-salesman";
import { ZodError } from "zod";

export interface CreateSalesmanResult {
  success: boolean;
  error?: string;
  salesmanId?: string;
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
    return { supabase, error: "You don't have permission to create salesmen." as const };
  }

  return { supabase, user, error: null };
}

function friendlyAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("already been registered") || lower.includes("already exists")) {
    return "A user with this email already exists.";
  }
  if (lower.includes("password")) {
    return "Password does not meet requirements.";
  }
  return "Could not create the login account. Please try again.";
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
