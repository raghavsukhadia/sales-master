import { normalizeIndianMobile } from "@/lib/utils/phone";
import {
  VISITING_CARD_EXTRACTION_SCHEMA_VERSION,
  type VisitingCardExtraction,
} from "@/lib/validations/visiting-card-extraction";

const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_REGEX = /(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}|\b[6-9]\d{9}\b/g;
const PHONE_TEST_REGEX = /(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}|\b[6-9]\d{9}\b/;
const PINCODE_REGEX = /\b\d{6}\b/;
const CITY_PIN_PARTIAL_REGEX = /\b([A-Za-z][A-Za-z\s]+?)[\s,-]+(\d{2})\b/;

const ADDRESS_KEYWORDS =
  /\b(shop\s*no|near|nagar|road|rd|street|st|complex|colony|sector|plot|floor|building|bldg|market|chowk|marg|lane|area|pincode|pin)\b/i;

const CONTACT_HONORIFIC_REGEX = /\b(mr\.?|mrs\.?|ms\.?|shri|smt|proprietor|owner|manager)\b/i;

const BUSINESS_NAME_KEYWORDS =
  /\b(auto|accessories|parts|detailing|editing|motors|garage|workshop|traders|enterprises|agency|distributor|dealer)\b/i;

const INDIAN_STATES: Record<string, string> = {
  "andhra pradesh": "Andhra Pradesh",
  ap: "Andhra Pradesh",
  "arunachal pradesh": "Arunachal Pradesh",
  assam: "Assam",
  bihar: "Bihar",
  chhattisgarh: "Chhattisgarh",
  cg: "Chhattisgarh",
  goa: "Goa",
  gujarat: "Gujarat",
  gj: "Gujarat",
  haryana: "Haryana",
  hr: "Haryana",
  "himachal pradesh": "Himachal Pradesh",
  hp: "Himachal Pradesh",
  jharkhand: "Jharkhand",
  jh: "Jharkhand",
  karnataka: "Karnataka",
  ka: "Karnataka",
  kerala: "Kerala",
  kl: "Kerala",
  "madhya pradesh": "Madhya Pradesh",
  mp: "Madhya Pradesh",
  maharashtra: "Maharashtra",
  mh: "Maharashtra",
  manipur: "Manipur",
  meghalaya: "Meghalaya",
  mizoram: "Mizoram",
  nagaland: "Nagaland",
  odisha: "Odisha",
  orissa: "Odisha",
  punjab: "Punjab",
  pb: "Punjab",
  rajasthan: "Rajasthan",
  rj: "Rajasthan",
  sikkim: "Sikkim",
  "tamil nadu": "Tamil Nadu",
  tn: "Tamil Nadu",
  telangana: "Telangana",
  ts: "Telangana",
  tripura: "Tripura",
  "uttar pradesh": "Uttar Pradesh",
  up: "Uttar Pradesh",
  uttarakhand: "Uttarakhand",
  uk: "Uttarakhand",
  "west bengal": "West Bengal",
  wb: "West Bengal",
  delhi: "Delhi",
  dl: "Delhi",
  "jammu and kashmir": "Jammu and Kashmir",
  jk: "Jammu and Kashmir",
  ladakh: "Ladakh",
  puducherry: "Puducherry",
  chandigarh: "Chandigarh",
};

/** Common field-sales cities → state (used when OCR state text is wrong). */
const CITY_TO_STATE: Record<string, string> = {
  nagpur: "Maharashtra",
  mumbai: "Maharashtra",
  pune: "Maharashtra",
  indore: "Madhya Pradesh",
  bhopal: "Madhya Pradesh",
  delhi: "Delhi",
  bangalore: "Karnataka",
  bengaluru: "Karnataka",
  hyderabad: "Telangana",
  chennai: "Tamil Nadu",
  kolkata: "West Bengal",
  ahmedabad: "Gujarat",
  jaipur: "Rajasthan",
  lucknow: "Uttar Pradesh",
};

const STATE_KEYS_SORTED = Object.keys(INDIAN_STATES).sort((a, b) => b.length - a.length);

function cleanLine(line: string): string {
  return line.replace(/\s+/g, " ").trim();
}

function splitLines(text: string): string[] {
  return text
    .split(/\n|---/)
    .map(cleanLine)
    .filter((line) => line.length > 0);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractEmail(text: string): string | null {
  const match = text.match(EMAIL_REGEX);
  return match?.[0] ?? null;
}

function extractPhone(text: string): string | null {
  const phones = extractAllPhones(text);
  return phones[0] ?? null;
}

/** Extract all valid Indian mobile numbers from OCR text. */
export function extractAllPhones(text: string): string[] {
  const matches = text.match(PHONE_REGEX);
  if (!matches?.length) return [];

  const seen = new Set<string>();
  const phones: string[] = [];
  for (const raw of matches) {
    const normalized = normalizeIndianMobile(raw.replace(/[\s-]/g, ""));
    if (!normalized) continue;
    const local = normalized.slice(2);
    if (!seen.has(local)) {
      seen.add(local);
      phones.push(local);
    }
  }
  return phones;
}

function extractPincode(text: string, city: string | null): string | null {
  const match = text.match(PINCODE_REGEX);
  if (match?.[0]) return match[0];

  if (city?.toLowerCase() === "nagpur") {
    const partial = text.match(CITY_PIN_PARTIAL_REGEX);
    if (partial?.[1]?.toLowerCase().includes("nagpur") && partial[2]) {
      return `4400${partial[2]}`;
    }
  }

  return null;
}

function stateKeyRegex(key: string): RegExp {
  const escaped = escapeRegex(key);
  return new RegExp(`\\b${escaped}\\b`, "i");
}

/** Exported for unit tests. */
export function extractState(text: string): string | null {
  const lower = text.toLowerCase();
  let best: { state: string; index: number } | null = null;

  for (const key of STATE_KEYS_SORTED) {
    const regex = stateKeyRegex(key);
    const match = lower.match(regex);
    if (!match || match.index === undefined) continue;
    if (!best || match.index > best.index) {
      best = { state: INDIAN_STATES[key], index: match.index };
    }
  }

  return best?.state ?? null;
}

export function inferStateFromCity(city: string | null): string | null {
  if (!city) return null;
  return CITY_TO_STATE[city.toLowerCase().trim()] ?? null;
}

function resolveState(text: string, city: string | null): string | null {
  const fromText = extractState(text);
  const fromCity = inferStateFromCity(city);

  if (fromCity && fromText && fromCity !== fromText) {
    return fromCity;
  }

  return fromCity ?? fromText;
}

function extractCity(text: string, state: string | null): string | null {
  const pincodeMatch = text.match(PINCODE_REGEX);
  if (pincodeMatch?.[0]) {
    const beforePincode = text.split(pincodeMatch[0])[0];
    const tokens = beforePincode
      .split(/[,\n]/)
      .map(cleanLine)
      .filter(Boolean);
    const last = tokens.at(-1);
    if (last && last.length >= 2 && last.length <= 40 && !ADDRESS_KEYWORDS.test(last)) {
      return last.replace(/\b\d{2,3}\b/g, "").trim() || null;
    }
  }

  const partial = text.match(CITY_PIN_PARTIAL_REGEX);
  if (partial?.[1]) {
    return cleanLine(partial[1]);
  }

  if (state) {
    const stateIndex = text.toLowerCase().lastIndexOf(state.toLowerCase());
    if (stateIndex > 0) {
      const beforeState = text.slice(0, stateIndex);
      const tokens = beforeState
        .split(/[,\n]/)
        .map(cleanLine)
        .filter(Boolean);
      const candidate = tokens.at(-1);
      if (candidate && candidate.length >= 2 && candidate.length <= 40) {
        return candidate;
      }
    }
  }

  return null;
}

function digitRatio(line: string): number {
  const digits = (line.match(/\d/g) ?? []).length;
  return line.length > 0 ? digits / line.length : 0;
}

function isAddressLine(line: string): boolean {
  return ADDRESS_KEYWORDS.test(line) || /\d{1,4}[\s,/\-]/.test(line);
}

function isLikelyBusinessName(line: string): boolean {
  if (line.length < 2 || line.length > 80) return false;
  if (EMAIL_REGEX.test(line) || PHONE_TEST_REGEX.test(line)) return false;
  if (digitRatio(line) > 0.25) return false;
  if (CONTACT_HONORIFIC_REGEX.test(line) && line.split(" ").length <= 4) return false;
  if (isAddressLine(line) && line.length > 40 && !/[&]/.test(line)) return false;
  return true;
}

function scoreBusinessNameLine(line: string): number {
  if (!isLikelyBusinessName(line)) return -1;

  let score = 0;
  if (/&/.test(line)) score += 3;
  if (BUSINESS_NAME_KEYWORDS.test(line)) score += 2;
  if (line.length >= 8 && line.length <= 60) score += 1;

  const letters = (line.match(/[A-Za-z]/g) ?? []).length;
  const letterRatio = line.length > 0 ? letters / line.length : 0;
  if (letterRatio >= 0.6) score += 2;
  if (isAddressLine(line) && !/[&]/.test(line)) score -= 2;

  return score;
}

function extractAddress(lines: string[], businessName: string | null, phones: string[]): string | null {
  const addressLines = lines.filter((line) => {
    if (businessName && line.toLowerCase() === businessName.toLowerCase()) return false;
    if (PHONE_TEST_REGEX.test(line) && !ADDRESS_KEYWORDS.test(line)) return false;
    return isAddressLine(line);
  });

  let address: string | null;
  if (addressLines.length > 0) {
    address = addressLines.join(", ");
  } else {
    const candidates = lines.filter((line) => {
      if (businessName && line.toLowerCase() === businessName.toLowerCase()) return false;
      if (EMAIL_REGEX.test(line) || PHONE_TEST_REGEX.test(line)) return false;
      if (CONTACT_HONORIFIC_REGEX.test(line)) return false;
      return line.length > 20;
    });
    address = candidates.sort((a, b) => b.length - a.length)[0] ?? null;
  }

  return address ? trimAddressToKeywordStart(stripPhonesFromText(address, phones)) : null;
}

function stripPhonesFromText(text: string, phones: string[]): string {
  let cleaned = text;
  for (const phone of phones) {
    const spaced = phone.replace(/(\d{5})(\d{5})/, "$1 $2");
    cleaned = cleaned.replace(new RegExp(escapeRegex(phone), "g"), " ");
    cleaned = cleaned.replace(new RegExp(escapeRegex(spaced), "g"), " ");
    cleaned = cleaned.replace(new RegExp(`\\+91[\\s-]?${escapeRegex(phone)}`, "g"), " ");
  }

  cleaned = cleaned
    .replace(PHONE_TEST_REGEX, " ")
    .replace(/^[\s,;:|()\-0-9]+/, "")
    .replace(/\s+/g, " ")
    .replace(/,\s*,/g, ",")
    .trim();

  return cleaned;
}

function trimAddressToKeywordStart(text: string): string {
  const match = ADDRESS_KEYWORDS.exec(text);
  if (match?.index === undefined) return text;
  return text.slice(match.index).replace(/^[,\s|]+/, "").trim();
}

function extractBusinessName(lines: string[]): string | null {
  let bestLine: string | null = null;
  let bestScore = -1;

  for (const line of lines) {
    const score = scoreBusinessNameLine(line);
    if (score > bestScore) {
      bestScore = score;
      bestLine = line;
    }
  }

  if (bestLine && bestScore >= 1) return bestLine;

  for (const line of lines) {
    if (isLikelyBusinessName(line) && !isAddressLine(line)) return line;
  }

  return lines[0] ?? null;
}

function extractContactPerson(lines: string[], businessName: string | null): string | null {
  for (const line of lines) {
    if (!CONTACT_HONORIFIC_REGEX.test(line)) continue;
    if (businessName && line.toLowerCase() === businessName.toLowerCase()) continue;
    return line;
  }
  return null;
}

function computeConfidence(
  extraction: Omit<VisitingCardExtraction, "confidence" | "schemaVersion">,
  ocrConfidence: number,
): number {
  let score = ocrConfidence * 0.35;
  if (extraction.businessName) score += 0.25;
  if (extraction.phone) score += 0.2;
  if (extraction.address || extraction.city) score += 0.15;
  if (extraction.state || extraction.pincode) score += 0.05;
  return Math.min(1, Math.max(0, score));
}

export type VisitingCardFieldConfidence = {
  businessName: number;
  phone: number;
  address: number;
  city: number;
  state: number;
  pincode: number;
};

export interface VisitingCardParseResult {
  extraction: VisitingCardExtraction;
  phones: string[];
  fieldConfidence: VisitingCardFieldConfidence;
}

function fieldConfidence(value: string | null, ocrConfidence: number): number {
  if (!value?.trim()) return 0;
  return Math.min(1, Math.max(0.5, ocrConfidence * 0.85 + 0.15));
}

/**
 * Parse raw OCR text from a visiting card into structured dealer fields.
 */
export function parseVisitingCardText(
  text: string,
  ocrConfidence = 0,
): VisitingCardExtraction {
  return parseVisitingCardTextWithMeta(text, ocrConfidence).extraction;
}

export function parseVisitingCardTextWithMeta(
  text: string,
  ocrConfidence = 0,
): VisitingCardParseResult {
  const normalizedText = text.trim();
  const lines = splitLines(normalizedText);

  const email = extractEmail(normalizedText);
  const phones = extractAllPhones(normalizedText);
  const phone = phones[0] ?? extractPhone(normalizedText);

  const preliminaryState = extractState(normalizedText);
  const city = extractCity(normalizedText, preliminaryState);
  const state = resolveState(normalizedText, city);
  const pincode = extractPincode(normalizedText, city);
  const businessName = extractBusinessName(lines);
  const address = extractAddress(lines, businessName, phones);
  const contactPerson = extractContactPerson(lines, businessName);

  const partial: Omit<VisitingCardExtraction, "confidence" | "schemaVersion"> = {
    businessName,
    phone,
    address,
    city,
    state,
    pincode,
    contactPerson,
    email,
  };

  const extraction: VisitingCardExtraction = {
    schemaVersion: VISITING_CARD_EXTRACTION_SCHEMA_VERSION,
    ...partial,
    confidence: computeConfidence(partial, ocrConfidence),
  };

  return {
    extraction,
    phones,
    fieldConfidence: {
      businessName: fieldConfidence(businessName, ocrConfidence),
      phone: fieldConfidence(phone, ocrConfidence),
      address: fieldConfidence(address, ocrConfidence),
      city: fieldConfidence(city, ocrConfidence),
      state: fieldConfidence(state, ocrConfidence),
      pincode: fieldConfidence(pincode, ocrConfidence),
    },
  };
}
