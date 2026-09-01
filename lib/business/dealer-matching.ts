import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import {
  normalizeBusinessName,
  normalizeCity,
  normalizeGst,
  normalizeIndianMobile,
} from "@/lib/utils/phone";

export interface DealerMatchCandidate {
  id: string;
  business_name: string;
  city: string | null;
  state: string | null;
  phone_number: string | null;
  whatsapp_number: string | null;
  gst_number: string | null;
}

export type DealerMatchInput = {
  phone?: string | null;
  whatsapp?: string | null;
  gst?: string | null;
  businessName?: string | null;
  city?: string | null;
};

export type DealerMatchResult =
  | { status: "exact_match"; dealer: DealerMatchCandidate }
  | { status: "possible_matches"; candidates: DealerMatchCandidate[] }
  | { status: "no_match" };

const CANDIDATE_SELECT =
  "id, business_name, city, state, phone_number, whatsapp_number, gst_number" as const;

const NAME_ONLY_LIMIT = 10;

/**
 * Deterministic dealer matching (CLAUDE.md §31). Never creates a dealer.
 * Never uses AI for identity.
 *
 * Priority:
 * 1. exact normalized phone
 * 2. exact normalized WhatsApp
 * 3. exact normalized GST
 * 4. strong normalized business name + city (1 → exact; many → possible)
 * 5. name-only candidates → possible_matches
 */
export async function matchDealer(
  supabase: SupabaseClient<Database>,
  input: DealerMatchInput,
): Promise<DealerMatchResult> {
  const phone = input.phone ? normalizeIndianMobile(input.phone) : null;
  if (phone) {
    const byPhone = await findByNormalizedPhone(supabase, phone);
    if (byPhone.length === 1) {
      return { status: "exact_match", dealer: byPhone[0] };
    }
    if (byPhone.length > 1) {
      return { status: "possible_matches", candidates: byPhone };
    }
  }

  const whatsapp = input.whatsapp ? normalizeIndianMobile(input.whatsapp) : null;
  if (whatsapp) {
    const byWa = await findByNormalizedWhatsapp(supabase, whatsapp);
    if (byWa.length === 1) {
      return { status: "exact_match", dealer: byWa[0] };
    }
    if (byWa.length > 1) {
      return { status: "possible_matches", candidates: byWa };
    }
  }

  const gst = normalizeGst(input.gst);
  if (gst) {
    const byGst = await findByGst(supabase, gst);
    if (byGst.length === 1) {
      return { status: "exact_match", dealer: byGst[0] };
    }
    if (byGst.length > 1) {
      return { status: "possible_matches", candidates: byGst };
    }
  }

  const name = normalizeBusinessName(input.businessName);
  const city = normalizeCity(input.city);

  if (name && city) {
    const strong = await findByNameAndCity(supabase, name, city);
    if (strong.length === 1) {
      return { status: "exact_match", dealer: strong[0] };
    }
    if (strong.length > 1) {
      return { status: "possible_matches", candidates: strong };
    }
  }

  if (name) {
    const byName = await findByNormalizedName(supabase, name, NAME_ONLY_LIMIT);
    if (byName.length > 0) {
      return { status: "possible_matches", candidates: byName };
    }
  }

  return { status: "no_match" };
}

async function findByNormalizedPhone(
  supabase: SupabaseClient<Database>,
  phone: string,
): Promise<DealerMatchCandidate[]> {
  const { data, error } = await supabase
    .from("dealers")
    .select(CANDIDATE_SELECT)
    .eq("phone_number_normalized", phone)
    .limit(10);

  if (error) {
    console.error("[matchDealer] phone query failed", error);
    return [];
  }
  return data ?? [];
}

async function findByNormalizedWhatsapp(
  supabase: SupabaseClient<Database>,
  whatsapp: string,
): Promise<DealerMatchCandidate[]> {
  const { data, error } = await supabase
    .from("dealers")
    .select(CANDIDATE_SELECT)
    .eq("whatsapp_number_normalized", whatsapp)
    .limit(10);

  if (error) {
    console.error("[matchDealer] whatsapp query failed", error);
    return [];
  }
  return data ?? [];
}

async function findByGst(
  supabase: SupabaseClient<Database>,
  gst: string,
): Promise<DealerMatchCandidate[]> {
  const { data, error } = await supabase
    .from("dealers")
    .select(CANDIDATE_SELECT)
    .ilike("gst_number", gst)
    .limit(10);

  if (error) {
    console.error("[matchDealer] gst query failed", error);
    return [];
  }
  return data ?? [];
}

async function findByNameAndCity(
  supabase: SupabaseClient<Database>,
  normalizedName: string,
  normalizedCity: string,
): Promise<DealerMatchCandidate[]> {
  // Fetch a bounded set by city, filter name in-process with the same
  // normalizer used for writes/matching (DB has no normalized name column yet).
  const { data, error } = await supabase
    .from("dealers")
    .select(CANDIDATE_SELECT)
    .ilike("city", normalizedCity)
    .limit(50);

  if (error) {
    console.error("[matchDealer] name+city query failed", error);
    return [];
  }

  return (data ?? []).filter(
    (d) => normalizeBusinessName(d.business_name) === normalizedName,
  );
}

async function findByNormalizedName(
  supabase: SupabaseClient<Database>,
  normalizedName: string,
  limit: number,
): Promise<DealerMatchCandidate[]> {
  // ILIKE on raw name as a coarse prefilter; exact normalized compare in-process.
  const tokens = normalizedName.split(" ").filter(Boolean);
  const primary = tokens[0] ?? normalizedName;

  const { data, error } = await supabase
    .from("dealers")
    .select(CANDIDATE_SELECT)
    .ilike("business_name", `%${escapeIlike(primary)}%`)
    .limit(50);

  if (error) {
    console.error("[matchDealer] name query failed", error);
    return [];
  }

  return (data ?? [])
    .filter((d) => normalizeBusinessName(d.business_name) === normalizedName)
    .slice(0, limit);
}

/** Escape PostgREST/ILIKE wildcards in user input. */
export function escapeIlike(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * Pure helper for tests: decide match status from already-fetched candidate lists
 * after phone/whatsapp/gst misses.
 */
export function resolveNameMatchStatus(
  nameCityMatches: DealerMatchCandidate[],
  nameOnlyMatches: DealerMatchCandidate[],
): DealerMatchResult {
  if (nameCityMatches.length === 1) {
    return { status: "exact_match", dealer: nameCityMatches[0] };
  }
  if (nameCityMatches.length > 1) {
    return { status: "possible_matches", candidates: nameCityMatches };
  }
  if (nameOnlyMatches.length > 0) {
    return { status: "possible_matches", candidates: nameOnlyMatches };
  }
  return { status: "no_match" };
}
