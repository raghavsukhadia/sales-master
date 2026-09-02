import { describe, expect, it, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { lookupDuplicateDealer } from "./dealers";
import { matchDealer, type DealerMatchCandidate } from "./dealer-matching";

vi.mock("./dealer-matching", () => ({
  matchDealer: vi.fn(),
}));

const candidate = (
  overrides: Partial<DealerMatchCandidate> & Pick<DealerMatchCandidate, "id" | "business_name">,
): DealerMatchCandidate => ({
  city: null,
  state: null,
  phone_number: null,
  whatsapp_number: null,
  gst_number: null,
  ...overrides,
});

function createMockSupabase(): SupabaseClient {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        in: vi.fn(() => ({
          order: vi.fn(async () => ({ data: [], error: null })),
        })),
      })),
    })),
  } as unknown as SupabaseClient;
}

describe("lookupDuplicateDealer", () => {
  beforeEach(() => {
    vi.mocked(matchDealer).mockReset();
  });

  it("returns exact_match when a secondary phone matches", async () => {
    const dealer = candidate({
      id: "dealer-1",
      business_name: "Car Editing & Detailing",
      phone_number: "9934755469",
      city: "Nagpur",
    });

    vi.mocked(matchDealer)
      .mockResolvedValueOnce({ status: "no_match" })
      .mockResolvedValueOnce({ status: "exact_match", dealer });

    const result = await lookupDuplicateDealer(createMockSupabase(), {
      phone: "9022779628",
      phones: ["9022779628", "9934755469"],
    });

    expect(result).toEqual({
      status: "exact_match",
      dealer: {
        id: "dealer-1",
        business_name: "Car Editing & Detailing",
        city: "Nagpur",
        state: null,
        phone_number: "9934755469",
        address: null,
        last_visit_at: null,
      },
    });
    expect(matchDealer).toHaveBeenCalledTimes(2);
    expect(matchDealer).toHaveBeenNthCalledWith(1, expect.anything(), { phone: "9022779628" });
    expect(matchDealer).toHaveBeenNthCalledWith(2, expect.anything(), { phone: "9934755469" });
  });

  it("falls back to name and city when phones do not match", async () => {
    const dealer = candidate({
      id: "dealer-2",
      business_name: "Car Editing & Detailing",
      city: "Nagpur",
      state: "Maharashtra",
    });

    vi.mocked(matchDealer)
      .mockResolvedValueOnce({ status: "no_match" })
      .mockResolvedValueOnce({
        status: "exact_match",
        dealer,
      });

    const result = await lookupDuplicateDealer(createMockSupabase(), {
      phone: "9022779628",
      phones: ["9022779628"],
      businessName: "Car Editing & Detailing",
      city: "Nagpur",
    });

    expect(result.status).toBe("exact_match");
    if (result.status === "exact_match") {
      expect(result.dealer.business_name).toBe("Car Editing & Detailing");
    }
    expect(matchDealer).toHaveBeenLastCalledWith(expect.anything(), {
      phone: "9022779628",
      businessName: "Car Editing & Detailing",
      city: "Nagpur",
    });
  });

  it("returns possible_matches when only similar dealers are found", async () => {
    const dealers = [
      candidate({ id: "a", business_name: "Sharma Auto", city: "Nagpur" }),
      candidate({ id: "b", business_name: "Sharma Auto", city: "Nagpur" }),
    ];

    vi.mocked(matchDealer)
      .mockResolvedValueOnce({ status: "no_match" })
      .mockResolvedValueOnce({ status: "possible_matches", candidates: dealers });

    const result = await lookupDuplicateDealer(createMockSupabase(), {
      phone: "9876543210",
      phones: ["9876543210"],
      businessName: "Sharma Auto",
      city: "Nagpur",
    });

    expect(result.status).toBe("possible_matches");
    if (result.status === "possible_matches") {
      expect(result.candidates).toHaveLength(2);
      expect(result.candidates[0].business_name).toBe("Sharma Auto");
    }
  });

  it("returns no_match when nothing matches", async () => {
    vi.mocked(matchDealer).mockResolvedValue({ status: "no_match" });

    const result = await lookupDuplicateDealer(createMockSupabase(), {
      phone: "9876543210",
      businessName: "New Dealer",
      city: "Indore",
    });

    expect(result).toEqual({ status: "no_match" });
  });
});
