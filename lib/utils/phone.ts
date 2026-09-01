/**
 * Indian mobile phone normalization for storage/matching.
 *
 * Canonical format: digits-only country code + 10-digit mobile,
 * e.g. "919876543210".
 *
 * Invalid inputs return null — never invent a valid number from garbage.
 */

export function normalizeIndianMobile(input: string): string | null {
  if (typeof input !== "string") return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  // Keep a leading + only long enough to strip it; drop spaces/dashes/parens.
  let digits = trimmed.replace(/[+\s().\-]/g, "");
  if (!/^\d+$/.test(digits)) return null;

  // 0091… international prefix
  if (digits.startsWith("0091") && digits.length === 14) {
    digits = digits.slice(2);
  }

  // 0XXXXXXXXXX (trunk prefix + 10-digit mobile)
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  // Bare 10-digit mobile
  if (digits.length === 10) {
    if (!/^[6-9]\d{9}$/.test(digits)) return null;
    return `91${digits}`;
  }

  // 91 + 10-digit mobile
  if (digits.length === 12 && digits.startsWith("91")) {
    const local = digits.slice(2);
    if (!/^[6-9]\d{9}$/.test(local)) return null;
    return digits;
  }

  return null;
}

export function phonesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  if (a == null || b == null) return false;
  const na = normalizeIndianMobile(a);
  const nb = normalizeIndianMobile(b);
  if (!na || !nb) return false;
  return na === nb;
}

/** Uppercase + trim GST; empty → null. */
export function normalizeGst(input: string | null | undefined): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim().toUpperCase();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Normalize a business name for strong matching: lowercase, strip trivial
 * punctuation, collapse whitespace.
 */
export function normalizeBusinessName(input: string | null | undefined): string | null {
  if (typeof input !== "string") return null;
  const normalized = input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized.length > 0 ? normalized : null;
}

export function normalizeCity(input: string | null | undefined): string | null {
  if (typeof input !== "string") return null;
  const normalized = input.toLowerCase().replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized : null;
}
