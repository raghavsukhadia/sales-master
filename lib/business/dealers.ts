import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { normalizeIndianMobile } from "@/lib/utils/phone";
import {
  escapeIlike,
  matchDealer,
  type DealerMatchCandidate,
} from "@/lib/business/dealer-matching";

export interface DealerSearchResult {
  id: string;
  business_name: string;
  city: string | null;
  state: string | null;
  phone_number: string | null;
  address: string | null;
  last_visit_at: string | null;
}

async function attachLastVisitDates(
  supabase: SupabaseClient<Database>,
  dealers: Omit<DealerSearchResult, "last_visit_at">[],
): Promise<DealerSearchResult[]> {
  if (dealers.length === 0) return [];

  const dealerIds = dealers.map((d) => d.id);
  const { data: visits, error } = await supabase
    .from("visits")
    .select("dealer_id, created_at")
    .in("dealer_id", dealerIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[searchDealers] last visit lookup failed", error);
    return dealers.map((d) => ({ ...d, last_visit_at: null }));
  }

  const lastByDealer = new Map<string, string>();
  for (const visit of visits ?? []) {
    if (!lastByDealer.has(visit.dealer_id)) {
      lastByDealer.set(visit.dealer_id, visit.created_at);
    }
  }

  return dealers.map((d) => ({
    ...d,
    last_visit_at: lastByDealer.get(d.id) ?? null,
  }));
}

/**
 * Dealer search used as the salesman-facing "find a dealer" UI
 * (CLAUDE.md §31). Create-new still goes through matchDealer on submit.
 */
export async function searchDealers(
  supabase: SupabaseClient<Database>,
  query: string,
): Promise<DealerSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const safe = escapeIlike(trimmed);
  const normalizedPhone = normalizeIndianMobile(trimmed);

  let builder = supabase
    .from("dealers")
    .select("id, business_name, city, state, phone_number, address")
    .order("business_name")
    .limit(10);

  if (normalizedPhone) {
    builder = builder.or(
      `business_name.ilike.%${safe}%,phone_number_normalized.eq.${normalizedPhone},city.ilike.%${safe}%,address.ilike.%${safe}%`,
    );
  } else {
    builder = builder.or(
      `business_name.ilike.%${safe}%,phone_number.ilike.%${safe}%,city.ilike.%${safe}%,address.ilike.%${safe}%`,
    );
  }

  const { data, error } = await builder;

  if (error) {
    console.error("[searchDealers] query failed", error);
    return [];
  }

  return attachLastVisitDates(supabase, data ?? []);
}

/**
 * Server-side safety net: exact normalized phone match before creating a dealer.
 * Prefer matchDealer for full priority ladder.
 */
export async function findDealerByExactPhone(
  supabase: SupabaseClient<Database>,
  phoneNumber: string,
): Promise<DealerSearchResult | null> {
  const result = await matchDealer(supabase, { phone: phoneNumber });
  if (result.status !== "exact_match") return null;

  const dealer = {
    id: result.dealer.id,
    business_name: result.dealer.business_name,
    city: result.dealer.city,
    state: result.dealer.state,
    phone_number: result.dealer.phone_number,
    address: null,
  };

  const withVisit = await attachLastVisitDates(supabase, [dealer]);
  return withVisit[0] ?? null;
}

export interface DuplicateDealerLookupInput {
  phone?: string;
  phones?: string[];
  businessName?: string;
  city?: string;
}

export type DuplicateDealerLookupResult =
  | { status: "exact_match"; dealer: DealerSearchResult }
  | { status: "possible_matches"; candidates: DealerSearchResult[] }
  | { status: "no_match" };

const MAX_POSSIBLE_DUPLICATE_CANDIDATES = 5;

function candidateToSearchResultBase(
  candidate: DealerMatchCandidate,
): Omit<DealerSearchResult, "last_visit_at"> {
  return {
    id: candidate.id,
    business_name: candidate.business_name,
    city: candidate.city,
    state: candidate.state,
    phone_number: candidate.phone_number,
    address: null,
  };
}

async function candidatesToSearchResults(
  supabase: SupabaseClient<Database>,
  candidates: DealerMatchCandidate[],
): Promise<DealerSearchResult[]> {
  return attachLastVisitDates(
    supabase,
    candidates.map(candidateToSearchResultBase),
  );
}

/**
 * Find an existing dealer while entering/scannning dealer details.
 * Checks every phone on the card, then name + city via matchDealer.
 */
export async function lookupDuplicateDealer(
  supabase: SupabaseClient<Database>,
  input: DuplicateDealerLookupInput,
): Promise<DuplicateDealerLookupResult> {
  const phonesToTry = new Set<string>();
  const primaryPhone = input.phone?.trim();
  if (primaryPhone) phonesToTry.add(primaryPhone);
  for (const phone of input.phones ?? []) {
    const trimmed = phone.trim();
    if (trimmed) phonesToTry.add(trimmed);
  }

  for (const phone of phonesToTry) {
    const phoneResult = await matchDealer(supabase, { phone });
    if (phoneResult.status === "exact_match") {
      const dealers = await candidatesToSearchResults(supabase, [phoneResult.dealer]);
      if (dealers[0]) {
        return { status: "exact_match", dealer: dealers[0] };
      }
    }
  }

  const fullResult = await matchDealer(supabase, {
    phone: primaryPhone || undefined,
    businessName: input.businessName?.trim() || undefined,
    city: input.city?.trim() || undefined,
  });

  if (fullResult.status === "exact_match") {
    const dealers = await candidatesToSearchResults(supabase, [fullResult.dealer]);
    if (dealers[0]) {
      return { status: "exact_match", dealer: dealers[0] };
    }
  }

  if (fullResult.status === "possible_matches" && fullResult.candidates.length > 0) {
    const dealers = await candidatesToSearchResults(
      supabase,
      fullResult.candidates.slice(0, MAX_POSSIBLE_DUPLICATE_CANDIDATES),
    );
    if (dealers.length > 0) {
      return { status: "possible_matches", candidates: dealers };
    }
  }

  return { status: "no_match" };
}
