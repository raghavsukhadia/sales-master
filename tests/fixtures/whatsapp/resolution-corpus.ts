/**
 * Lightweight evaluation corpus for deterministic business resolution.
 * These use stored validated extractions — no OpenAI calls.
 */

import { WHATSAPP_EXTRACTION_SCHEMA_VERSION } from "@/lib/validations/whatsapp-extraction";
import type { WhatsAppExtraction } from "@/lib/validations/whatsapp-extraction";

export type ResolutionFixture = {
  id: string;
  description: string;
  /** Session last_message_at ISO (UTC). */
  referenceInstant: string;
  extraction: WhatsAppExtraction;
  /** Optional dealer match stub outcome for service-level tests. */
  dealerMatch?:
    | { status: "exact_match"; dealerId: string }
    | { status: "possible_matches"; dealerIds: string[] }
    | { status: "no_match" }
    | { status: "skip_match" };
  expect: {
    dealerStatus?: "matched" | "ambiguous" | "not_found" | "insufficient_data";
    visitReady?: boolean;
    followUpReady?: boolean;
    visitDate?: string | null;
    followUpDate?: string | null;
    overallStatus: "ready_for_confirmation" | "needs_clarification" | "not_actionable";
  };
};

function extraction(
  partial: Partial<WhatsAppExtraction> &
    Pick<WhatsAppExtraction, "conversationIntent" | "summary">,
): WhatsAppExtraction {
  const {
    dealer: dealerPartial,
    visit: visitPartial,
    followUp: followUpPartial,
    ...rest
  } = partial;

  return {
    schemaVersion: WHATSAPP_EXTRACTION_SCHEMA_VERSION,
    dealer: {
      name: null,
      phone: null,
      locality: null,
      city: null,
      address: null,
      ...dealerPartial,
    },
    visit: {
      occurred: null,
      dateText: null,
      timeText: null,
      outcome: null,
      notes: null,
      ...visitPartial,
    },
    followUp: {
      requested: null,
      dateText: null,
      reason: null,
      ...followUpPartial,
    },
    products: [],
    missingFields: [],
    ambiguities: [],
    confidence: { overall: 0.8 },
    ...rest,
  };
}

const REF = "2026-08-20T06:30:00.000Z";
const DEALER = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const DEALER_B = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

export const WHATSAPP_RESOLUTION_FIXTURES: ResolutionFixture[] = [
  {
    id: "01-simple-english-visit",
    description: "Simple English visit today",
    referenceInstant: REF,
    dealerMatch: { status: "exact_match", dealerId: DEALER },
    extraction: extraction({
      conversationIntent: "visit_report",
      summary: "Visited Sharma Auto today.",
      dealer: { name: "Sharma Auto", phone: null, locality: null, city: "Indore", address: null },
      visit: {
        occurred: true,
        dateText: "today",
        timeText: null,
        outcome: "interested",
        notes: null,
      },
    }),
    expect: {
      dealerStatus: "matched",
      visitReady: true,
      followUpReady: false,
      visitDate: "2026-08-20",
      overallStatus: "ready_for_confirmation",
    },
  },
  {
    id: "02-hinglish-visit",
    description: "Hinglish visit with aaj",
    referenceInstant: REF,
    dealerMatch: { status: "exact_match", dealerId: DEALER },
    extraction: extraction({
      conversationIntent: "visit_report",
      summary: "Aaj Patel Accessories gaya.",
      dealer: {
        name: "Patel Accessories",
        phone: null,
        locality: null,
        city: null,
        address: null,
      },
      visit: {
        occurred: true,
        dateText: "aaj",
        timeText: null,
        outcome: "PPF discuss",
        notes: null,
      },
    }),
    expect: {
      dealerStatus: "matched",
      visitReady: true,
      visitDate: "2026-08-20",
      overallStatus: "ready_for_confirmation",
    },
  },
  {
    id: "03-dealer-name-typo",
    description: "Name typo may still match via matcher or stay not_found",
    referenceInstant: REF,
    dealerMatch: { status: "no_match" },
    extraction: extraction({
      conversationIntent: "visit_report",
      summary: "Visited Sharam Auto",
      dealer: {
        name: "Sharam Auto",
        phone: null,
        locality: null,
        city: "Indore",
        address: null,
      },
      visit: {
        occurred: true,
        dateText: "today",
        timeText: null,
        outcome: null,
        notes: null,
      },
    }),
    expect: {
      dealerStatus: "not_found",
      visitReady: false,
      overallStatus: "needs_clarification",
    },
  },
  {
    id: "04-dealer-phone",
    description: "Dealer phone included",
    referenceInstant: REF,
    dealerMatch: { status: "exact_match", dealerId: DEALER },
    extraction: extraction({
      conversationIntent: "visit_report",
      summary: "Met dealer by phone",
      dealer: {
        name: "Royal Auto",
        phone: "9876543210",
        locality: null,
        city: null,
        address: null,
      },
      visit: {
        occurred: true,
        dateText: "today",
        timeText: null,
        outcome: null,
        notes: null,
      },
    }),
    expect: {
      dealerStatus: "matched",
      visitReady: true,
      overallStatus: "ready_for_confirmation",
    },
  },
  {
    id: "05-visited-today",
    description: "Visited today phrase",
    referenceInstant: REF,
    dealerMatch: { status: "exact_match", dealerId: DEALER },
    extraction: extraction({
      conversationIntent: "visit_report",
      summary: "Visited today",
      dealer: {
        name: "Gupta Electricals",
        phone: null,
        locality: null,
        city: null,
        address: null,
      },
      visit: {
        occurred: true,
        dateText: "today",
        timeText: null,
        outcome: null,
        notes: null,
      },
    }),
    expect: {
      visitDate: "2026-08-20",
      overallStatus: "ready_for_confirmation",
    },
  },
  {
    id: "06-follow-up-tomorrow",
    description: "Follow up tomorrow",
    referenceInstant: REF,
    dealerMatch: { status: "exact_match", dealerId: DEALER },
    extraction: extraction({
      conversationIntent: "follow_up",
      summary: "Follow up tomorrow",
      dealer: {
        name: "Gupta Electricals",
        phone: null,
        locality: null,
        city: null,
        address: null,
      },
      followUp: {
        requested: true,
        dateText: "tomorrow",
        reason: "Send quotation",
      },
    }),
    expect: {
      followUpReady: true,
      followUpDate: "2026-08-21",
      overallStatus: "ready_for_confirmation",
    },
  },
  {
    id: "07-next-monday",
    description: "Next Monday follow-up",
    referenceInstant: REF,
    dealerMatch: { status: "exact_match", dealerId: DEALER },
    extraction: extraction({
      conversationIntent: "mixed",
      summary: "Visit + next Monday",
      dealer: {
        name: "Gupta Electricals",
        phone: null,
        locality: null,
        city: null,
        address: null,
      },
      visit: {
        occurred: true,
        dateText: "today",
        timeText: null,
        outcome: "interested",
        notes: null,
      },
      followUp: {
        requested: true,
        dateText: "next Monday",
        reason: "Discuss order",
      },
    }),
    expect: {
      visitDate: "2026-08-20",
      followUpDate: "2026-08-24",
      overallStatus: "ready_for_confirmation",
    },
  },
  {
    id: "08-multiple-dealers",
    description: "Multiple possible dealers",
    referenceInstant: REF,
    dealerMatch: { status: "possible_matches", dealerIds: [DEALER, DEALER_B] },
    extraction: extraction({
      conversationIntent: "visit_report",
      summary: "Ambiguous dealer",
      dealer: {
        name: "Gupta Electricals",
        phone: null,
        locality: null,
        city: null,
        address: null,
      },
      visit: {
        occurred: true,
        dateText: "today",
        timeText: null,
        outcome: null,
        notes: null,
      },
    }),
    expect: {
      dealerStatus: "ambiguous",
      visitReady: false,
      overallStatus: "needs_clarification",
    },
  },
  {
    id: "09-unknown-dealer",
    description: "Unknown dealer",
    referenceInstant: REF,
    dealerMatch: { status: "no_match" },
    extraction: extraction({
      conversationIntent: "visit_report",
      summary: "New shop",
      dealer: {
        name: "Brand New Traders",
        phone: null,
        locality: null,
        city: "Pune",
        address: null,
      },
      visit: {
        occurred: true,
        dateText: "today",
        timeText: null,
        outcome: null,
        notes: null,
      },
    }),
    expect: {
      dealerStatus: "not_found",
      overallStatus: "needs_clarification",
    },
  },
  {
    id: "10-missing-dealer",
    description: "Missing dealer identity",
    referenceInstant: REF,
    dealerMatch: { status: "skip_match" },
    extraction: extraction({
      conversationIntent: "visit_report",
      summary: "Visited someone",
      visit: {
        occurred: true,
        dateText: "today",
        timeText: null,
        outcome: null,
        notes: null,
      },
    }),
    expect: {
      dealerStatus: "insufficient_data",
      overallStatus: "needs_clarification",
    },
  },
  {
    id: "11-missing-date",
    description: "Missing visit date",
    referenceInstant: REF,
    dealerMatch: { status: "exact_match", dealerId: DEALER },
    extraction: extraction({
      conversationIntent: "visit_report",
      summary: "Visited without date",
      dealer: {
        name: "Sharma Auto",
        phone: null,
        locality: null,
        city: null,
        address: null,
      },
      visit: {
        occurred: true,
        dateText: null,
        timeText: null,
        outcome: null,
        notes: null,
      },
    }),
    expect: {
      visitReady: false,
      overallStatus: "needs_clarification",
    },
  },
  {
    id: "12-visit-and-follow-up",
    description: "Combined visit + follow-up",
    referenceInstant: REF,
    dealerMatch: { status: "exact_match", dealerId: DEALER },
    extraction: extraction({
      conversationIntent: "mixed",
      summary: "Visit and follow-up",
      dealer: {
        name: "Sharma Auto",
        phone: null,
        locality: null,
        city: null,
        address: null,
      },
      visit: {
        occurred: true,
        dateText: "today",
        timeText: null,
        outcome: "ok",
        notes: null,
      },
      followUp: {
        requested: true,
        dateText: "this Friday",
        reason: "Call back",
      },
    }),
    expect: {
      visitDate: "2026-08-20",
      followUpDate: "2026-08-21",
      overallStatus: "ready_for_confirmation",
    },
  },
  {
    id: "13-correction-style",
    description: "Salesman corrects earlier message (final extraction wins)",
    referenceInstant: REF,
    dealerMatch: { status: "exact_match", dealerId: DEALER },
    extraction: extraction({
      conversationIntent: "visit_report",
      summary: "Correction: dealer is Sharma Auto not Patel",
      dealer: {
        name: "Sharma Auto",
        phone: null,
        locality: null,
        city: "Indore",
        address: null,
      },
      visit: {
        occurred: true,
        dateText: "today",
        timeText: null,
        outcome: null,
        notes: "Corrected name",
      },
    }),
    expect: {
      overallStatus: "ready_for_confirmation",
    },
  },
  {
    id: "14-multi-message-session",
    description: "Multi-message session already condensed by AI",
    referenceInstant: REF,
    dealerMatch: { status: "exact_match", dealerId: DEALER },
    extraction: extraction({
      conversationIntent: "mixed",
      summary: "Card + voice + location condensed",
      dealer: {
        name: "Sharma Auto",
        phone: "919876543210",
        locality: null,
        city: "Indore",
        address: null,
      },
      visit: {
        occurred: true,
        dateText: "today",
        timeText: "10:30",
        outcome: "interested",
        notes: null,
      },
      followUp: {
        requested: true,
        dateText: "tomorrow",
        reason: "Quotation",
      },
    }),
    expect: {
      overallStatus: "ready_for_confirmation",
    },
  },
  {
    id: "15-media-only",
    description: "Media-only — little structured signal",
    referenceInstant: REF,
    dealerMatch: { status: "skip_match" },
    extraction: extraction({
      conversationIntent: "unknown",
      summary: "Image only; no text",
      missingFields: ["dealer.name", "visit.occurred"],
    }),
    expect: {
      overallStatus: "not_actionable",
    },
  },
  {
    id: "16-non-business",
    description: "Non-business conversation",
    referenceInstant: REF,
    dealerMatch: { status: "skip_match" },
    extraction: extraction({
      conversationIntent: "unknown",
      summary: "Good morning",
    }),
    expect: {
      overallStatus: "not_actionable",
    },
  },
  {
    id: "17-ambiguous-date",
    description: "Ambiguous kal date",
    referenceInstant: REF,
    dealerMatch: { status: "exact_match", dealerId: DEALER },
    extraction: extraction({
      conversationIntent: "follow_up",
      summary: "Follow up kal",
      dealer: {
        name: "Sharma Auto",
        phone: null,
        locality: null,
        city: null,
        address: null,
      },
      followUp: {
        requested: true,
        dateText: "kal",
        reason: "Call",
      },
    }),
    expect: {
      followUpReady: false,
      overallStatus: "needs_clarification",
    },
  },
  {
    id: "18-month-year-boundary",
    description: "Tomorrow across year boundary",
    referenceInstant: "2026-12-31T18:00:00.000Z",
    dealerMatch: { status: "exact_match", dealerId: DEALER },
    extraction: extraction({
      conversationIntent: "follow_up",
      summary: "Follow up tomorrow",
      dealer: {
        name: "Sharma Auto",
        phone: null,
        locality: null,
        city: null,
        address: null,
      },
      followUp: {
        requested: true,
        dateText: "tomorrow",
        reason: "New year call",
      },
    }),
    expect: {
      followUpDate: "2027-01-01",
      overallStatus: "ready_for_confirmation",
    },
  },
  {
    id: "19-phone-variant",
    description: "Phone written with spaces / +91",
    referenceInstant: REF,
    dealerMatch: { status: "exact_match", dealerId: DEALER },
    extraction: extraction({
      conversationIntent: "visit_report",
      summary: "Phone variant",
      dealer: {
        name: null,
        phone: "+91 98765-43210",
        locality: null,
        city: null,
        address: null,
      },
      visit: {
        occurred: true,
        dateText: "today",
        timeText: null,
        outcome: null,
        notes: null,
      },
    }),
    expect: {
      dealerStatus: "matched",
      overallStatus: "ready_for_confirmation",
    },
  },
  {
    id: "20-product-interest-only",
    description: "Product interest with no actionable visit",
    referenceInstant: REF,
    dealerMatch: { status: "skip_match" },
    extraction: extraction({
      conversationIntent: "unknown",
      summary: "Someone mentioned PPF prices",
      products: [
        {
          name: "PPF",
          quantityText: null,
          priceText: null,
          notes: "curious",
        },
      ],
    }),
    expect: {
      overallStatus: "not_actionable",
    },
  },
];
