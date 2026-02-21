import type { RamadanPhase } from "../types/app";

const DAY_MS = 24 * 60 * 60 * 1000;
export const TOTAL_JUZ = 30;
const RAMADAN_HIJRI_MONTH = 9;

export function atStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseISODateToLocalStart(isoDate: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    return null;
  }

  const [yearRaw, monthRaw, dayRaw] = isoDate.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function getDiffInDays(start: Date, end: Date): number {
  return Math.floor((atStartOfDay(end).getTime() - start.getTime()) / DAY_MS);
}

function getIslamicDateParts(
  now: Date,
  timeZone?: string
): { month: number; day: number; year: number } | null {
  try {
    const formatter = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
      timeZone
    });

    const parts = formatter.formatToParts(now);
    const month = Number(parts.find((part) => part.type === "month")?.value);
    const day = Number(parts.find((part) => part.type === "day")?.value);
    const year = Number(parts.find((part) => part.type === "year")?.value);

    if (!Number.isFinite(month) || !Number.isFinite(day) || !Number.isFinite(year)) {
      return null;
    }

    return { month, day, year };
  } catch {
    return null;
  }
}

export function getCurrentRamadanDay(now: Date = new Date(), timeZone?: string): number | null {
  const islamicDate = getIslamicDateParts(now, timeZone);
  if (!islamicDate || islamicDate.month !== RAMADAN_HIJRI_MONTH) {
    return null;
  }

  if (islamicDate.day < 1 || islamicDate.day > TOTAL_JUZ) {
    return null;
  }

  return islamicDate.day;
}

export function getCurrentRamadanPhase(now: Date = new Date(), timeZone?: string): RamadanPhase {
  const islamicDate = getIslamicDateParts(now, timeZone);
  if (!islamicDate) {
    return "unknown";
  }

  if (islamicDate.month === RAMADAN_HIJRI_MONTH) {
    return "during";
  }

  return islamicDate.month < RAMADAN_HIJRI_MONTH ? "before" : "after";
}

export function getRamadanDay(startDateISO: string, now: Date): number | null {
  const start = parseISODateToLocalStart(startDateISO);
  if (!start) {
    return null;
  }

  const diff = getDiffInDays(start, now);
  if (diff < 0 || diff >= TOTAL_JUZ) {
    return null;
  }

  return diff + 1;
}

export function getSuggestedJuzId(ramadanDay: number | null): number | null {
  if (!ramadanDay || ramadanDay < 1 || ramadanDay > TOTAL_JUZ) {
    return null;
  }
  return ramadanDay;
}

export function getRamadanPhase(startDateISO: string, now: Date): RamadanPhase {
  const start = parseISODateToLocalStart(startDateISO);
  if (!start) {
    return "unknown";
  }

  const diff = getDiffInDays(start, now);
  if (diff < 0) {
    return "before";
  }
  if (diff >= TOTAL_JUZ) {
    return "after";
  }
  return "during";
}
