import { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SalesMasterLogo } from "@/components/branding/sales-master-logo";
import { Button } from "@/components/ui/button";
import { signOut } from "./actions";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dealers", label: "Dealers" },
  { href: "/salesmen", label: "Salesmen" },
  { href: "/distributors", label: "Distributors" },
  { href: "/visits", label: "Visits" },
  { href: "/followups", label: "Follow-ups" },
  { href: "/opportunities", label: "Opportunities" },
];

export default async function DashboardLayout({ children }: { children: ReactNode }) {
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

  if (!profile) {
    redirect("/login");
  }
  if (profile.role === "salesman") {
    redirect("/record-visit");
  }
  if (profile.role !== "admin" && profile.role !== "manager") {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center gap-6 border-b px-6 py-3">
        <SalesMasterLogo size="sm" />
        <nav className="flex flex-1 flex-wrap gap-4 text-sm">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className="hover:underline">
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={signOut}>
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
