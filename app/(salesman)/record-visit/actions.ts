"use server";

import { createClient } from "@/lib/supabase/server";
import { searchDealers, findDealerByExactPhone, type DealerSearchResult } from "@/lib/business/dealers";
import { matchDealer } from "@/lib/business/dealer-matching";
import { uploadVisitAttachment } from "@/lib/business/attachments";
import { extractFromVisitingCardImages } from "@/lib/ai/visiting-card-extractor";
import { normalizeIndianMobile } from "@/lib/utils/phone";
import {
  normalizeOrderLines,
  parseRecordVisitPayload,
  type RecordVisitInput,
} from "@/lib/validations/record-visit";
import {
  visitingCardExtractionToFormFields,
  type VisitingCardExtraction,
} from "@/lib/validations/visiting-card-extraction";
import { ZodError } from "zod";

const MAX_CARD_IMAGES = 2;
const MAX_CARD_IMAGE_BYTES = 900 * 1024;

export async function searchDealersAction(query: string): Promise<DealerSearchResult[]> {
  const supabase = await createClient();
  return searchDealers(supabase, query);
}

export async function lookupDealerByPhoneAction(
  phone: string,
): Promise<DealerSearchResult | null> {
  const trimmed = phone.trim();
  if (trimmed.length < 10) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return findDealerByExactPhone(supabase, trimmed);
}

export interface ScanVisitingCardResult {
  success: boolean;
  error?: string;
  fields?: ReturnType<typeof visitingCardExtractionToFormFields>;
  extraction?: VisitingCardExtraction;
  matchedDealer?: DealerSearchResult | null;
}

export async function scanVisitingCardAction(formData: FormData): Promise<ScanVisitingCardResult> {
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

  const images: { mimeType: string; base64: string }[] = [];
  for (let i = 0; i < MAX_CARD_IMAGES; i++) {
    const file = formData.get(`cardImage${i}`);
    if (!(file instanceof File) || file.size === 0) continue;
    if (!file.type.startsWith("image/")) {
      return { success: false, error: "Only image files are supported." };
    }
    if (file.size > MAX_CARD_IMAGE_BYTES) {
      return { success: false, error: "Image is too large. Try a smaller photo." };
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    images.push({ mimeType: file.type, base64: buffer.toString("base64") });
  }

  if (images.length === 0) {
    return { success: false, error: "Upload at least one visiting card photo." };
  }

  const result = await extractFromVisitingCardImages(images);
  if (!result.ok) {
    return { success: false, error: result.message || "Could not read the visiting card." };
  }

  let matchedDealer: DealerSearchResult | null = null;
  const phonesToCheck =
    result.phones.length > 0
      ? result.phones
      : result.data.phone
        ? [result.data.phone]
        : [];
  for (const phone of phonesToCheck) {
    matchedDealer = await findDealerByExactPhone(supabase, phone);
    if (matchedDealer) break;
  }

  return {
    success: true,
    fields: visitingCardExtractionToFormFields(result.data, {
      phones: result.phones,
      fieldConfidence: result.fieldConfidence,
    }),
    extraction: result.data,
    matchedDealer,
  };
}

export interface SubmitRecordVisitResult {
  success: boolean;
  error?: string;
  visitNumber?: string;
  itemCount?: number;
}

function parseFormData(formData: FormData): RecordVisitInput {
  const dealerMode = formData.get("dealerMode");
  const hasOrder = formData.get("hasOrder") === "true";
  const orderLinesRaw = formData.get("orderLines");
  let orderRows: {
    productId: string | null;
    productName: string;
    quantity: number | string;
  }[] = [];
  if (typeof orderLinesRaw === "string" && orderLinesRaw) {
    orderRows = JSON.parse(orderLinesRaw) as {
      productId: string | null;
      productName: string;
      quantity: number | string;
    }[];
  }

  const orderLines = hasOrder ? normalizeOrderLines(orderRows) : [];

  if (dealerMode === "existing") {
    return parseRecordVisitPayload({
      dealerMode: "existing",
      dealerId: formData.get("dealerId"),
      hasOrder,
      orderLines,
    });
  }

  const latitudeRaw = formData.get("latitude");
  const longitudeRaw = formData.get("longitude");
  const phonesRaw = formData.get("phones");
  let phones: string[] = [];
  if (typeof phonesRaw === "string" && phonesRaw) {
    try {
      const parsed = JSON.parse(phonesRaw) as unknown;
      if (Array.isArray(parsed)) {
        phones = parsed.filter((p): p is string => typeof p === "string");
      }
    } catch {
      phones = [];
    }
  }

  return parseRecordVisitPayload({
    dealerMode: "new",
    dealerName: formData.get("dealerName"),
    phone: formData.get("phone"),
    phones,
    address: formData.get("address") || undefined,
    city: formData.get("city") || undefined,
    state: formData.get("state") || undefined,
    pincode: formData.get("pincode") || undefined,
    latitude:
      typeof latitudeRaw === "string" && latitudeRaw ? Number(latitudeRaw) : undefined,
    longitude:
      typeof longitudeRaw === "string" && longitudeRaw ? Number(longitudeRaw) : undefined,
    hasOrder,
    orderLines,
  });
}

function collectVisitingCardPhotos(formData: FormData): File[] {
  const photos: File[] = [];
  for (let i = 0; i < MAX_CARD_IMAGES; i++) {
    const file = formData.get(`cardImage${i}`);
    if (file instanceof File && file.size > 0) {
      photos.push(file);
    }
  }
  return photos;
}

export async function submitRecordVisitAction(
  formData: FormData,
): Promise<SubmitRecordVisitResult> {
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

  let payload: RecordVisitInput;
  try {
    payload = parseFormData(formData);
  } catch (err) {
    if (err instanceof ZodError) {
      const first = err.issues[0];
      return { success: false, error: first?.message ?? "Invalid form data." };
    }
    return { success: false, error: "Invalid form data." };
  }

  let dealerId: string;

  if (payload.dealerMode === "existing") {
    dealerId = payload.dealerId;
  } else {
    const phoneNormalized = normalizeIndianMobile(payload.phone);
    const secondaryPhone = payload.phones.find(
      (p) => normalizeIndianMobile(p) !== phoneNormalized,
    );
    const whatsappNormalized = secondaryPhone
      ? normalizeIndianMobile(secondaryPhone)
      : null;
    const addressRaw = payload.address?.trim() || null;
    const cityRaw = payload.city?.trim() || null;
    const stateRaw = payload.state?.trim() || null;
    const pincodeRaw = payload.pincode?.trim() || null;

    const match = await matchDealer(supabase, {
      phone: payload.phone.trim(),
      businessName: payload.dealerName.trim(),
      city: cityRaw,
    });

    if (match.status === "exact_match") {
      dealerId = match.dealer.id;

      const { data: existingDealer } = await supabase
        .from("dealers")
        .select("address, city, state, pincode, phone_number, whatsapp_number")
        .eq("id", dealerId)
        .single();

      const updates: {
        address?: string;
        city?: string;
        state?: string;
        pincode?: string;
        phone_number?: string;
        phone_number_normalized?: string;
        whatsapp_number?: string;
        whatsapp_number_normalized?: string;
      } = {};
      if (addressRaw && !existingDealer?.address) updates.address = addressRaw;
      if (cityRaw && !existingDealer?.city) updates.city = cityRaw;
      if (stateRaw && !existingDealer?.state) updates.state = stateRaw;
      if (pincodeRaw && !existingDealer?.pincode) updates.pincode = pincodeRaw;
      if (payload.phone.trim() && !existingDealer?.phone_number) {
        updates.phone_number = payload.phone.trim();
        if (phoneNormalized) updates.phone_number_normalized = phoneNormalized;
      }
      if (secondaryPhone?.trim() && !existingDealer?.whatsapp_number) {
        updates.whatsapp_number = secondaryPhone.trim();
        if (whatsappNormalized) updates.whatsapp_number_normalized = whatsappNormalized;
      }

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from("dealers")
          .update(updates)
          .eq("id", dealerId);
        if (updateError) {
          console.error("[submitRecordVisitAction] dealer update failed", updateError);
        }
      }
    } else {
      const { data: newDealer, error: dealerError } = await supabase
        .from("dealers")
        .insert({
          business_name: payload.dealerName.trim(),
          phone_number: payload.phone.trim(),
          phone_number_normalized: phoneNormalized,
          whatsapp_number: secondaryPhone?.trim() || null,
          whatsapp_number_normalized: whatsappNormalized,
          address: addressRaw,
          city: cityRaw,
          state: stateRaw,
          pincode: pincodeRaw,
          primary_salesman_id: salesmanId,
          source: "web",
          created_by: user.id,
        })
        .select("id")
        .single();

      if (dealerError || !newDealer) {
        console.error("[submitRecordVisitAction] dealer insert failed", dealerError);
        return { success: false, error: "Could not create the dealer." };
      }
      dealerId = newDealer.id;
    }
  }

  const latitude = payload.dealerMode === "new" ? payload.latitude : undefined;
  const longitude = payload.dealerMode === "new" ? payload.longitude : undefined;

  const hasGps =
    latitude !== undefined &&
    longitude !== undefined &&
    !Number.isNaN(latitude) &&
    !Number.isNaN(longitude);

  const addressRaw =
    payload.dealerMode === "new" ? payload.address?.trim() || null : null;

  const locationSource = hasGps
    ? ("browser_location" as const)
    : addressRaw
      ? ("manual" as const)
      : null;

  const { data: visit, error: visitError } = await supabase
    .from("visits")
    .insert({
      dealer_id: dealerId,
      salesman_id: salesmanId,
      source: "web",
      latitude: hasGps ? latitude : null,
      longitude: hasGps ? longitude : null,
      location_source: locationSource,
      created_by: user.id,
    })
    .select("id, visit_number")
    .single();

  if (visitError || !visit) {
    console.error("[submitRecordVisitAction] visit insert failed", visitError);
    return { success: false, error: "Could not save the visit." };
  }

  const visitNumber = `V-${visit.visit_number}`;
  const itemCount = payload.orderLines.length;

  if (payload.hasOrder && payload.orderLines.length > 0) {
    const rows = payload.orderLines.map((line, index) => ({
      visit_id: visit.id,
      product_id: line.productId,
      product_name: line.productName,
      unit_price: line.unitPrice ?? 0,
      quantity: line.quantity,
      unit: line.unit ?? "pcs",
      line_number: index + 1,
    }));
    const { error: orderError } = await supabase.from("visit_order_items").insert(rows);
    if (orderError) {
      console.error("[submitRecordVisitAction] visit_order_items insert failed", orderError);
      if (orderError.code === "23505") {
        return {
          success: false,
          error: "A product appears more than once in this order. Remove duplicates and try again.",
        };
      }
      return { success: false, error: "Could not save order items." };
    }
  }

  const cardPhotos = collectVisitingCardPhotos(formData);
  for (const photo of cardPhotos) {
    const result = await uploadVisitAttachment(supabase, {
      userId: user.id,
      dealerId,
      visitId: visit.id,
      file: photo,
    });
    if (!result.ok) {
      console.error("[submitRecordVisitAction] card photo attachment failed", result.error);
    }
  }

  return { success: true, visitNumber, itemCount };
}
