import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { CatalogProduct } from "@/lib/types/catalog";
import { RecordVisitForm } from "./record-visit-form";

export const metadata: Metadata = {
  title: "Record Visit",
};

export default async function RecordVisitPage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, name, category, description")
    .eq("is_active", true)
    .order("name");

  return <RecordVisitForm products={(products ?? []) as CatalogProduct[]} />;
}
