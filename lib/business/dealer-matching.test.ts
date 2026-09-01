import { describe, expect, it } from "vitest";
import {
  escapeIlike,
  resolveNameMatchStatus,
  type DealerMatchCandidate,
} from "./dealer-matching";

const dealer = (
  overrides: Partial<DealerMatchCandidate> & Pick<DealerMatchCandidate, "id" | "business_name">,
): DealerMatchCandidate => ({
  city: null,
  state: null,
  phone_number: null,
  whatsapp_number: null,
  gst_number: null,
  ...overrides,
});

describe("resolveNameMatchStatus", () => {
  it("returns exact_match for a single name+city hit", () => {
    const one = dealer({ id: "1", business_name: "Sharma Auto", city: "Indore" });
    expect(resolveNameMatchStatus([one], [])).toEqual({
      status: "exact_match",
      dealer: one,
    });
  });

  it("returns possible_matches for multiple name+city hits", () => {
    const a = dealer({ id: "1", business_name: "Sharma Auto", city: "Indore" });
    const b = dealer({ id: "2", business_name: "Sharma Auto", city: "Indore" });
    const result = resolveNameMatchStatus([a, b], []);
    expect(result.status).toBe("possible_matches");
  });

  it("falls back to name-only possibles", () => {
    const a = dealer({ id: "1", business_name: "Sharma Auto" });
    expect(resolveNameMatchStatus([], [a])).toEqual({
      status: "possible_matches",
      candidates: [a],
    });
  });

  it("returns no_match when empty", () => {
    expect(resolveNameMatchStatus([], [])).toEqual({ status: "no_match" });
  });
});

describe("escapeIlike", () => {
  it("escapes wildcards", () => {
    expect(escapeIlike("100%_off")).toBe("100\\%\\_off");
  });
});
