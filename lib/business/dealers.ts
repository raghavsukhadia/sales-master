import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export interface DealerSearchResult {
  id: string;
  business_name: string;
  city: string | null;
  state: string | null;
  phone_number: string | null;
}

/**
 * Dealer search used both as the salesman-facing "find a dealer" UI and
 * as the duplicate-check step before creating a new one (CLAUDE.md §31):
 * requiring a search first, and only allowing "create new" once nothing
 * matched, is the duplicate-detection UX -- there's no separate matching
 * pass beyond this.
 */
export async function searchDealers(
  supabase: SupabaseClient<Database>,
  query: string,
): Promise<DealerSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const { data, error } = await supabase
    .from("dealers")
    .select("id, business_name, city, state, phone_number")
    .or(`business_name.ilike.%${trimmed}%,phone_number.ilike.%${trimmed}%`)
    .order("business_name")
    .limit(10);

  if (error) {
    console.error("[searchDealers] query failed", error);
    return [];
  }

  return data;
}

/**
 * Server-side safety net against a stale client: if two salesmen search,
 * both find nothing, and both submit "create new" for the same phone
 * number within moments of each other, the second submission should
 * attach to the dealer the first one just created rather than making a
 * duplicate.
 */
export async function findDealerByExactPhone(
  supabase: SupabaseClient<Database>,
  phoneNumber: string,
): Promise<DealerSearchResult | null> {
  const { data, error } = await supabase
    .from("dealers")
    .select("id, business_name, city, state, phone_number")
    .eq("phone_number", phoneNumber)
    .maybeSingle();

  if (error) {
    console.error("[findDealerByExactPhone] query failed", error);
    return null;
  }

  return data;
}
