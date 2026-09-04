import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { countSalesmanScheduledFollowups } from "@/lib/business/followups";
import { signOut } from "./actions";
import { SalesmanNav } from "./salesman-nav";

export default async function SalesmanLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }
  if (profile.role === "admin" || profile.role === "manager") {
    redirect("/dashboard");
  }
  if (profile.role !== "salesman") {
    redirect("/login");
  }

  if (profile.is_active === false) {
    await supabase.auth.signOut();
    redirect(
      `/login?error=${encodeURIComponent("Your account is inactive. Contact an admin.")}`,
    );
  }

  const { data: salesmanId } = await supabase.rpc("current_salesman_id");

  const { data: salesman } = salesmanId
    ? await supabase
        .from("salesmen")
        .select("full_name, is_active")
        .eq("id", salesmanId)
        .single()
    : { data: null };

  if (salesman && salesman.is_active === false) {
    await supabase.auth.signOut();
    redirect(
      `/login?error=${encodeURIComponent("Your account is inactive. Contact an admin.")}`,
    );
  }

  const followupsCount = salesmanId
    ? await countSalesmanScheduledFollowups(supabase, salesmanId)
    : 0;

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <SalesmanNav
        salesmanName={salesman?.full_name ?? "Salesman"}
        roleLabel="Sales Executive"
        signOutAction={signOut}
        followupsCount={followupsCount}
      />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6 pb-28 md:max-w-5xl">
        {salesmanId ? (
          children
        ) : (
          <p className="text-sm text-muted-foreground">
            Your account isn&apos;t linked to a salesman profile yet. Contact an admin before
            logging visits here.
          </p>
        )}
      </main>
    </div>
  );
}
