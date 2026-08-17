"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    redirect(`/login?error=${encodeURIComponent("Email and password are required.")}`);
  }

  const supabase = await createClient();

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError || !signInData.user) {
    redirect(`/login?error=${encodeURIComponent("Invalid email or password.")}`);
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role")
    .eq("id", signInData.user.id)
    .single();

  // No profile row, or the lookup itself failed: don't guess at access.
  if (profileError || !profile) {
    await supabase.auth.signOut();
    redirect(`/login?notice=${encodeURIComponent("access-denied")}`);
  }

  if (profile.role === "admin" || profile.role === "manager") {
    redirect("/dashboard");
  }

  if (profile.role === "salesman") {
    // ADR-005 (Revised): WhatsApp stays primary, but a salesman can now
    // fall back to this minimal web visit-logging form.
    redirect("/log-visit");
  }

  // Unreachable given the user_role enum, but don't guess if it ever is.
  await supabase.auth.signOut();
  redirect(`/login?notice=${encodeURIComponent("access-denied")}`);
}
