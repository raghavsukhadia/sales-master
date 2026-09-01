/**
 * Deterministic relative/absolute date resolution for WhatsApp extractions.
 * Reference date comes from session/message context (Asia/Kolkata), never
 * from the worker's wall clock alone.
 */

export const BUSINESS_TIMEZONE = "Asia/Kolkata" as const;

export type DateResolution =
  | {
      status: "resolved";
      value: string; // YYYY-MM-DD in Asia/Kolkata calendar
      sourceText: string;
    }
  | {
      status: "ambiguous";
      value: null;
      sourceText: string;
      reason: string;
    }
  | {
      status: "unresolved";
      value: null;
      sourceText: string;
      reason: string;
    };

export type CalendarDate = {
  year: number;
  month: number; // 1-12
  day: number;
};

const WEEKDAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const MONTH_NAMES: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

/** Calendar Y-M-D for an instant in Asia/Kolkata. */
export function calendarDateInTimeZone(
  instant: Date | string,
  timeZone: string = BUSINESS_TIMEZONE,
): CalendarDate {
  const date = typeof instant === "string" ? new Date(instant) : instant;
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid instant: ${String(instant)}`);
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  return { year, month, day };
}

export function formatCalendarDate(d: CalendarDate): string {
  return `${String(d.year).padStart(4, "0")}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
}

export function addDays(d: CalendarDate, days: number): CalendarDate {
  // Construct noon UTC-ish from YMD then shift — use Date.UTC and re-read in TZ
  // via a fixed offset approach: treat calendar as civil date in IST (+05:30).
  const utcMs = Date.UTC(d.year, d.month - 1, d.day, 6, 30, 0) + days * 86_400_000;
  return calendarDateInTimeZone(new Date(utcMs), BUSINESS_TIMEZONE);
}

export function weekdayOf(d: CalendarDate): number {
  // Noon IST as UTC instant
  const utcMs = Date.UTC(d.year, d.month - 1, d.day, 6, 30, 0);
  return new Date(utcMs).getUTCDay();
}

function isValidYmd(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

function normalizeSource(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[.!,]+$/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Resolve human date text against a reference instant (session last message).
 */
export function resolveBusinessDate(
  sourceText: string | null | undefined,
  referenceInstant: Date | string,
): DateResolution {
  if (sourceText == null || !String(sourceText).trim()) {
    return {
      status: "unresolved",
      value: null,
      sourceText: sourceText ?? "",
      reason: "No date text provided",
    };
  }

  const original = String(sourceText).trim();
  const text = normalizeSource(original);
  let reference: CalendarDate;
  try {
    reference = calendarDateInTimeZone(referenceInstant);
  } catch {
    return {
      status: "unresolved",
      value: null,
      sourceText: original,
      reason: "Invalid reference timestamp",
    };
  }

  // Relative keywords (EN + common Hinglish)
  if (text === "today" || text === "aaj") {
    return { status: "resolved", value: formatCalendarDate(reference), sourceText: original };
  }
  if (text === "tomorrow" || text === "kal") {
    // Note: Hindi "kal" can mean yesterday OR tomorrow — treat as ambiguous.
    if (text === "kal") {
      return {
        status: "ambiguous",
        value: null,
        sourceText: original,
        reason: 'Hinglish "kal" can mean yesterday or tomorrow',
      };
    }
    return {
      status: "resolved",
      value: formatCalendarDate(addDays(reference, 1)),
      sourceText: original,
    };
  }
  if (text === "yesterday" || text === "parso" /* sometimes used loosely */) {
    if (text === "parso") {
      return {
        status: "ambiguous",
        value: null,
        sourceText: original,
        reason: '"parso" is ambiguous without more context',
      };
    }
    return {
      status: "resolved",
      value: formatCalendarDate(addDays(reference, -1)),
      sourceText: original,
    };
  }

  // next <weekday>
  const nextWeekday = text.match(
    /^next\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/,
  );
  if (nextWeekday) {
    const target = WEEKDAY_INDEX[nextWeekday[1]];
    const current = weekdayOf(reference);
    let delta = (target - current + 7) % 7;
    if (delta === 0) delta = 7; // strictly next occurrence
    return {
      status: "resolved",
      value: formatCalendarDate(addDays(reference, delta)),
      sourceText: original,
    };
  }

  // this <weekday> — Friday of the current week (Mon–Sun), may be past or future
  const thisWeekday = text.match(
    /^this\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/,
  );
  if (thisWeekday) {
    const target = WEEKDAY_INDEX[thisWeekday[1]];
    const current = weekdayOf(reference);
    // Week starts Monday
    const mondayBasedCurrent = (current + 6) % 7; // Mon=0
    const mondayBasedTarget = (target + 6) % 7;
    const delta = mondayBasedTarget - mondayBasedCurrent;
    return {
      status: "resolved",
      value: formatCalendarDate(addDays(reference, delta)),
      sourceText: original,
    };
  }

  // ISO YYYY-MM-DD
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    if (!isValidYmd(year, month, day)) {
      return {
        status: "unresolved",
        value: null,
        sourceText: original,
        reason: "Invalid calendar date",
      };
    }
    return {
      status: "resolved",
      value: formatCalendarDate({ year, month, day }),
      sourceText: original,
    };
  }

  // DD/MM or DD/MM/YYYY (India-first)
  const dmy = text.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    let year = dmy[3] ? Number(dmy[3]) : reference.year;
    if (dmy[3] && dmy[3].length === 2) {
      year = 2000 + year;
    }
    // Ambiguous when both parts <= 12 and no year — prefer DD/MM (India)
    if (!dmy[3] && day <= 12 && month <= 12 && day !== month) {
      // still prefer DD/MM
    }
    if (!isValidYmd(year, month, day)) {
      return {
        status: "unresolved",
        value: null,
        sourceText: original,
        reason: "Invalid DD/MM date",
      };
    }
    return {
      status: "resolved",
      value: formatCalendarDate({ year, month, day }),
      sourceText: original,
    };
  }

  // "25 Aug" / "25 August" / "Aug 25" / "August 25, 2026"
  const dayMonth = text.match(
    /^(\d{1,2})\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s*,?\s*(\d{4}))?$/,
  );
  if (dayMonth) {
    const day = Number(dayMonth[1]);
    const month = MONTH_NAMES[dayMonth[2]];
    const year = dayMonth[3] ? Number(dayMonth[3]) : reference.year;
    if (!month || !isValidYmd(year, month, day)) {
      return {
        status: "unresolved",
        value: null,
        sourceText: original,
        reason: "Invalid day-month date",
      };
    }
    return {
      status: "resolved",
      value: formatCalendarDate({ year, month, day }),
      sourceText: original,
    };
  }

  const monthDay = text.match(
    /^(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:\s*,?\s*(\d{4}))?$/,
  );
  if (monthDay) {
    const month = MONTH_NAMES[monthDay[1]];
    const day = Number(monthDay[2]);
    const year = monthDay[3] ? Number(monthDay[3]) : reference.year;
    if (!month || !isValidYmd(year, month, day)) {
      return {
        status: "unresolved",
        value: null,
        sourceText: original,
        reason: "Invalid month-day date",
      };
    }
    return {
      status: "resolved",
      value: formatCalendarDate({ year, month, day }),
      sourceText: original,
    };
  }

  return {
    status: "unresolved",
    value: null,
    sourceText: original,
    reason: "Unrecognized date expression",
  };
}
