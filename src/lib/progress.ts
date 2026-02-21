import type { RecitationLog } from "../types/app";
import { TOTAL_JUZ, atStartOfDay } from "./ramadan";

const DAY_MS = 24 * 60 * 60 * 1000;

export function toLocalDateKey(input: Date | string): string {
  const date = typeof input === "string" ? new Date(input) : input;
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKeyToLocalDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function computeProgress(completedCount: number): {
  done: number;
  total: number;
  percent: number;
} {
  const done = Math.min(Math.max(0, completedCount), TOTAL_JUZ);
  return {
    done,
    total: TOTAL_JUZ,
    percent: Math.round((done / TOTAL_JUZ) * 100)
  };
}

export function computeStreak(logs: RecitationLog[], now: Date = new Date()): number {
  if (logs.length === 0) {
    return 0;
  }

  const uniqueDateKeys = Array.from(new Set(logs.map((log) => toLocalDateKey(log.completedAtISO))));
  uniqueDateKeys.sort((a, b) => b.localeCompare(a));

  if (uniqueDateKeys.length === 0) {
    return 0;
  }

  const latestDate = parseDateKeyToLocalDate(uniqueDateKeys[0]);
  const daysSinceLatest = Math.floor(
    (atStartOfDay(now).getTime() - atStartOfDay(latestDate).getTime()) / DAY_MS
  );

  if (daysSinceLatest > 1) {
    return 0;
  }

  let streak = 1;
  let previous = latestDate;

  for (let index = 1; index < uniqueDateKeys.length; index += 1) {
    const current = parseDateKeyToLocalDate(uniqueDateKeys[index]);
    const gap = Math.floor((previous.getTime() - current.getTime()) / DAY_MS);

    if (gap === 1) {
      streak += 1;
      previous = current;
      continue;
    }

    break;
  }

  return streak;
}

export function computeWeeklyProgress(
  logs: RecitationLog[],
  now: Date,
  target: number
): { count: number; target: number; met: boolean } {
  const normalizedTarget = Number.isFinite(target) && target > 0 ? Math.floor(target) : 1;
  const nowDay = atStartOfDay(now).getTime();
  const lowerBound = nowDay - 6 * DAY_MS;

  const uniqueRecitations = new Set<string>();
  for (const log of logs) {
    const completionDay = atStartOfDay(new Date(log.completedAtISO)).getTime();
    if (completionDay >= lowerBound && completionDay <= nowDay) {
      uniqueRecitations.add(`${toLocalDateKey(log.completedAtISO)}::${log.juzId}`);
    }
  }

  const count = uniqueRecitations.size;
  return {
    count,
    target: normalizedTarget,
    met: count >= normalizedTarget
  };
}

export function getLastCompletionISO(logs: RecitationLog[], juzId: number): string | undefined {
  const relevant = logs
    .filter((log) => log.juzId === juzId)
    .sort((a, b) => new Date(b.completedAtISO).getTime() - new Date(a.completedAtISO).getTime());

  return relevant[0]?.completedAtISO;
}

export function pickSuggestedJuzId(completedJuzIds: number[]): number | null {
  const sanitizedCompleted = completedJuzIds
    .filter((id) => Number.isInteger(id) && id >= 1 && id <= TOTAL_JUZ)
    .sort((a, b) => a - b);
  const completedSet = new Set(sanitizedCompleted);

  if (completedSet.size >= TOTAL_JUZ) {
    return null;
  }

  const lastCompleted = sanitizedCompleted[sanitizedCompleted.length - 1];
  if (typeof lastCompleted === "number") {
    const nextAfterLastCompleted = lastCompleted + 1;
    if (nextAfterLastCompleted >= 1 && nextAfterLastCompleted <= TOTAL_JUZ) {
      return nextAfterLastCompleted;
    }
  }

  for (let id = 1; id <= TOTAL_JUZ; id += 1) {
    if (!completedSet.has(id)) {
      return id;
    }
  }

  return null;
}
