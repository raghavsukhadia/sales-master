import { createClient } from "@/lib/supabase/server";
import { LogVisitForm } from "./log-visit-form";

export default async function LogVisitPage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  return <LogVisitForm products={products ?? []} />;
}
