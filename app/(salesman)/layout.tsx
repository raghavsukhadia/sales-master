import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { signOut } from "./actions";

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
    .select("role")
    .eq("id", user.id)
    .single();

  // This route group is salesman-only (ADR-005 Revised). Admin/manager
  // land back on their own dashboard rather than a salesman testing path
  // here: current_salesman_id() would resolve to null for them (no
  // salesmen row), which would break visit submission anyway.
  if (!profile) {
    redirect("/login");
  }
  if (profile.role === "admin" || profile.role === "manager") {
    redirect("/dashboard");
  }
  if (profile.role !== "salesman") {
    redirect("/login");
  }

  const { data: salesmanId } = await supabase.rpc("current_salesman_id");

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between border-b bg-background px-4 py-3">
        <span className="text-sm font-medium">Log a Visit</span>
        <form action={signOut}>
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
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
