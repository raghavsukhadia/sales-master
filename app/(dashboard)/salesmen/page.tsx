import { createClient } from "@/lib/supabase/server";
import { SalesmenPageClient } from "@/components/salesmen/salesmen-page-client";

export default async function SalesmenPage() {
  const supabase = await createClient();
  const { data: salesmen } = await supabase
    .from("salesmen")
    .select("id, full_name, phone_number, email, is_active, created_at")
    .order("full_name");

  return <SalesmenPageClient salesmen={salesmen ?? []} />;
}
