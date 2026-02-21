import { TOTAL_JUZ } from "./ramadan";
import type { AudioProgressState, AudioResumeEntry } from "../types/app";

const AUTO_COMPLETE_RATIO = 0.95;
export const MIN_RESUME_SECONDS = 3;

function isValidJuzId(juzId: number): boolean {
  return Number.isInteger(juzId) && juzId >= 1 && juzId <= TOTAL_JUZ;
}

function normalizeDuration(durationSec: number | null): number | null {
  if (durationSec === null) {
    return null;
  }

  return Number.isFinite(durationSec) && durationSec > 0 ? durationSec : null;
}

export function formatPositionLabel(seconds: number): string {
  const total = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainingSeconds = total % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function shouldAutoComplete(positionSec: number, durationSec: number | null): boolean {
  if (durationSec === null || !Number.isFinite(durationSec) || durationSec <= 0) {
    return false;
  }

  const safePosition = Math.max(0, positionSec);
  return safePosition >= durationSec * AUTO_COMPLETE_RATIO;
}

export function getResumeForJuz(
  progressState: AudioProgressState,
  juzId: number
): AudioResumeEntry | undefined {
  const entry = progressState.byJuzId[juzId];
  if (!entry) {
    return undefined;
  }

  if (!isValidJuzId(entry.juzId)) {
    return undefined;
  }

  if (!Number.isFinite(entry.positionSec) || entry.positionSec < 0) {
    return undefined;
  }

  if (entry.positionSec < MIN_RESUME_SECONDS) {
    return undefined;
  }

  const durationSec = normalizeDuration(entry.durationSec);
  if (shouldAutoComplete(entry.positionSec, durationSec)) {
    return undefined;
  }

  return {
    ...entry,
    positionSec: Math.max(0, entry.positionSec),
    durationSec
  };
}

export function clearResumeEntry(progressState: AudioProgressState, juzId: number): AudioProgressState {
  if (!progressState.byJuzId[juzId]) {
    return progressState;
  }

  const byJuzId = { ...progressState.byJuzId };
  delete byJuzId[juzId];

  return {
    byJuzId,
    lastPlayedJuzId: progressState.lastPlayedJuzId === juzId ? null : progressState.lastPlayedJuzId
  };
}

export function upsertResumeEntry(
  progressState: AudioProgressState,
  entry: AudioResumeEntry
): AudioProgressState {
  if (!isValidJuzId(entry.juzId) || !Number.isFinite(entry.positionSec)) {
    return progressState;
  }

  const normalizedEntry: AudioResumeEntry = {
    ...entry,
    positionSec: Math.max(0, entry.positionSec),
    durationSec: normalizeDuration(entry.durationSec)
  };

  if (shouldAutoComplete(normalizedEntry.positionSec, normalizedEntry.durationSec)) {
    return clearResumeEntry(progressState, normalizedEntry.juzId);
  }

  return {
    byJuzId: {
      ...progressState.byJuzId,
      [normalizedEntry.juzId]: normalizedEntry
    },
    lastPlayedJuzId: normalizedEntry.juzId
  };
}
