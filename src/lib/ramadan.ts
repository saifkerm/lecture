import type { RamadanPhase } from "../types/app";

const DAY_MS = 24 * 60 * 60 * 1000;
export const TOTAL_JUZ = 30;

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
