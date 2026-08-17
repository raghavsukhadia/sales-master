"use server";

import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { searchDealers, findDealerByExactPhone, type DealerSearchResult } from "@/lib/business/dealers";
import { uploadVisitAttachment } from "@/lib/business/attachments";
import type { Json } from "@/types/database.types";

export async function searchDealersAction(query: string): Promise<DealerSearchResult[]> {
  const supabase = await createClient();
  return searchDealers(supabase, query);
}

export interface SubmitVisitResult {
  success: boolean;
  error?: string;
}

interface ProductInterestInput {
  productId: string;
  interestLevel: "low" | "medium" | "high";
}

export async function submitVisitAction(formData: FormData): Promise<SubmitVisitResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not signed in." };
  }

  const { data: salesmanId } = await supabase.rpc("current_salesman_id");
  if (!salesmanId) {
    return { success: false, error: "Your account isn't linked to a salesman profile." };
  }

  const dealerMode = formData.get("dealerMode");
  const existingDealerId = formData.get("dealerId");
  const newDealerName = formData.get("newDealerName");
  const newDealerCity = formData.get("newDealerCity");
  const newDealerState = formData.get("newDealerState");
  const newDealerPhone = formData.get("newDealerPhone");

  const notes = formData.get("notes");
  const followupDescription = formData.get("followupDescription");
  const followupDueDate = formData.get("followupDueDate");
  const latitudeRaw = formData.get("latitude");
  const longitudeRaw = formData.get("longitude");
  const latitude = typeof latitudeRaw === "string" && latitudeRaw ? Number(latitudeRaw) : null;
  const longitude = typeof longitudeRaw === "string" && longitudeRaw ? Number(longitudeRaw) : null;

  let productInterests: ProductInterestInput[] = [];
  const productInterestsRaw = formData.get("productInterests");
  if (typeof productInterestsRaw === "string" && productInterestsRaw) {
    try {
      productInterests = JSON.parse(productInterestsRaw);
    } catch {
      // Malformed client payload -- proceed without product interest rows
      // rather than failing the whole visit.
    }
  }

  const photo = formData.get("photo");
  const voiceNote = formData.get("voiceNote");

  let dealerId: string;

  if (dealerMode === "existing" && typeof existingDealerId === "string" && existingDealerId) {
    dealerId = existingDealerId;
  } else if (dealerMode === "new" && typeof newDealerName === "string" && newDealerName.trim()) {
    const phone = typeof newDealerPhone === "string" && newDealerPhone.trim() ? newDealerPhone.trim() : null;

    // Server-side duplicate safety net (CLAUDE.md §31/§32): re-check right
    // before insert in case another submission just created this exact
    // dealer between this salesman's search and their submit.
    const existingMatch = phone ? await findDealerByExactPhone(supabase, phone) : null;

    if (existingMatch) {
      dealerId = existingMatch.id;
    } else {
      const { data: newDealer, error: dealerError } = await supabase
        .from("dealers")
        .insert({
          business_name: newDealerName.trim(),
          city: typeof newDealerCity === "string" && newDealerCity.trim() ? newDealerCity.trim() : null,
          state: typeof newDealerState === "string" && newDealerState.trim() ? newDealerState.trim() : null,
          phone_number: phone,
          primary_salesman_id: salesmanId,
          source: "web",
          created_by: user.id,
        })
        .select("id")
        .single();

      if (dealerError || !newDealer) {
        console.error("[submitVisitAction] dealer insert failed", dealerError);
        return { success: false, error: "Could not create the dealer." };
      }
      dealerId = newDealer.id;
    }
  } else {
    return { success: false, error: "Select an existing dealer or fill in the new dealer's name." };
  }

  const { data: visit, error: visitError } = await supabase
    .from("visits")
    .insert({
      dealer_id: dealerId,
      salesman_id: salesmanId,
      notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
      source: "web",
      latitude,
      longitude,
      location_source: latitude !== null && longitude !== null ? "browser_location" : null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (visitError || !visit) {
    console.error("[submitVisitAction] visit insert failed", visitError);
    return { success: false, error: "Could not save the visit." };
  }

  // Everything below is secondary to the visit record itself: log and
  // move on rather than failing a visit that's already safely stored.

  if (productInterests.length > 0) {
    const rows = productInterests.map((p) => ({
      visit_id: visit.id,
      product_id: p.productId,
      interest_level: p.interestLevel,
    }));
    const { error: vpError } = await supabase.from("visit_products").insert(rows);
    if (vpError) {
      console.error("[submitVisitAction] visit_products insert failed", vpError);
    }
  }

  if (
    typeof followupDescription === "string" &&
    followupDescription.trim() &&
    typeof followupDueDate === "string" &&
    followupDueDate
  ) {
    const { error: followupError } = await supabase.from("followups").insert({
      dealer_id: dealerId,
      salesman_id: salesmanId,
      description: followupDescription.trim(),
      due_date: followupDueDate,
      created_from_visit_id: visit.id,
      source: "web",
      created_by: user.id,
    });
    if (followupError) {
      console.error("[submitVisitAction] followup insert failed", followupError);
    }
  }

  if (photo instanceof File && photo.size > 0) {
    const result = await uploadVisitAttachment(supabase, {
      userId: user.id,
      dealerId,
      visitId: visit.id,
      file: photo,
    });
    if (!result.ok) {
      console.error("[submitVisitAction] photo attachment failed", result.error);
    }
  }

  if (voiceNote instanceof File && voiceNote.size > 0) {
    await recordVoiceNote(supabase, {
      userId: user.id,
      salesmanId,
      dealerId,
      visitId: visit.id,
      file: voiceNote,
    });
  }

  return { success: true };
}

/**
 * Voice notes get two records, same as a real WhatsApp voice message
 * eventually will once Phase 2's media pipeline exists:
 *  1. An `attachments` row (via the shared helper, same as a photo) so
 *     the file shows up wherever visit attachments are browsed.
 *  2. A `whatsapp_messages` row with processing_status='received' and
 *     source='web', so Phase 2's future transcription/extraction pass
 *     can scan ONE queue regardless of whether the audio came in via the
 *     webhook or this form (CLAUDE.md §55 ADR-005 Revised).
 *
 * (2) is written with the service-role client, not the user's own
 * session: whatsapp_messages is deliberately backend-only under RLS
 * (Phase 0 design -- see the rls_policies migration), and a synthetic
 * ingestion record is exactly the kind of write that boundary was meant
 * for. This does not add salesman-writable RLS access to that table.
 */
async function recordVoiceNote(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: {
    userId: string;
    salesmanId: string;
    dealerId: string;
    visitId: string;
    file: File;
  },
) {
  const { userId, salesmanId, dealerId, visitId, file } = params;

  const attachmentResult = await uploadVisitAttachment(supabase, {
    userId,
    dealerId,
    visitId,
    file,
  });

  if (!attachmentResult.ok) {
    console.error("[recordVoiceNote] voice note attachment failed", attachmentResult.error);
    return;
  }

  const { data: salesman } = await supabase
    .from("salesmen")
    .select("phone_number")
    .eq("id", salesmanId)
    .maybeSingle();

  const serviceClient = createServiceClient();
  const { error: messageError } = await serviceClient.from("whatsapp_messages").insert({
    external_message_id: `web-${randomUUID()}`,
    channel_id: "web",
    salesman_id: salesmanId,
    sender_number: salesman?.phone_number ?? "unknown",
    receiver_number: "web-form",
    direction: "in",
    item_type: "voice",
    file_name: file.name,
    file_path: attachmentResult.path,
    message_timestamp: new Date().toISOString(),
    raw_payload: {
      source: "web",
      visit_id: visitId,
      salesman_id: salesmanId,
      file_name: file.name,
      mime_type: file.type || null,
      uploaded_via: "log-visit-form",
    } satisfies Json,
    processing_status: "received",
    source: "web",
  });

  if (messageError) {
    console.error("[recordVoiceNote] whatsapp_messages insert failed", messageError);
  }
}
