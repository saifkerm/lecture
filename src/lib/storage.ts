import type { AppSettings, AppState, AudioProgressState, AudioResumeEntry } from "../types/app";
import { shouldAutoComplete } from "./audioProgress";
import { TOTAL_JUZ } from "./ramadan";

const STORAGE_KEY = "ramadan_tracker_state_v2";
const LEGACY_STORAGE_KEY = "ramadan_tracker_state_v1";
const APP_VERSION = 2;
const DEFAULT_WEEKLY_TARGET = 5;

function todayISO(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function sanitizeDateISO(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return fallback;
  }

  return value;
}

function sanitizeTimeHHmm(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(value)) {
    return fallback;
  }

  return value;
}

function sanitizeSettings(raw: unknown, now: Date): AppSettings {
  const fallback: AppSettings = {
    ramadanStartDateISO: todayISO(now),
    weeklyTarget: DEFAULT_WEEKLY_TARGET,
    reminderTimeHHmm: "21:00",
    reminderEnabled: false
  };

  if (!raw || typeof raw !== "object") {
    return fallback;
  }

  const settings = raw as Partial<AppSettings>;
  return {
    ramadanStartDateISO: sanitizeDateISO(settings.ramadanStartDateISO, fallback.ramadanStartDateISO),
    weeklyTarget:
      typeof settings.weeklyTarget === "number" && settings.weeklyTarget > 0
        ? Math.floor(settings.weeklyTarget)
        : fallback.weeklyTarget,
    reminderTimeHHmm: sanitizeTimeHHmm(settings.reminderTimeHHmm, fallback.reminderTimeHHmm),
    reminderEnabled: Boolean(settings.reminderEnabled)
  };
}

function createDefaultAudioState(): AudioProgressState {
  return {
    byJuzId: {},
    lastPlayedJuzId: null
  };
}

function sanitizeUpdatedAtISO(value: unknown, fallbackISO: string): string {
  if (typeof value !== "string") {
    return fallbackISO;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallbackISO;
  }

  return parsed.toISOString();
}

function toValidJuzId(value: unknown): number | null {
  if (!Number.isInteger(value)) {
    return null;
  }

  const asNumber = Number(value);
  if (asNumber < 1 || asNumber > TOTAL_JUZ) {
    return null;
  }

  return asNumber;
}

function sanitizeAudio(raw: unknown, now: Date): AudioProgressState {
  if (!raw || typeof raw !== "object") {
    return createDefaultAudioState();
  }

  const fallbackUpdatedAtISO = now.toISOString();
  const rawAudio = raw as Partial<AudioProgressState>;
  const byJuzId: AudioProgressState["byJuzId"] = {};

  if (rawAudio.byJuzId && typeof rawAudio.byJuzId === "object") {
    for (const [entryKey, entryValue] of Object.entries(rawAudio.byJuzId)) {
      if (!entryValue || typeof entryValue !== "object") {
        continue;
      }

      const parsedKey = Number(entryKey);
      const keyJuzId = toValidJuzId(parsedKey);
      const valueAsEntry = entryValue as Partial<AudioResumeEntry>;
      const valueJuzId = toValidJuzId(valueAsEntry.juzId);
      const juzId = valueJuzId ?? keyJuzId;

      if (juzId === null || !Number.isFinite(valueAsEntry.positionSec)) {
        continue;
      }

      const positionSec = Math.max(0, Number(valueAsEntry.positionSec));
      const durationSec =
        valueAsEntry.durationSec === null
          ? null
          : Number.isFinite(valueAsEntry.durationSec) && Number(valueAsEntry.durationSec) > 0
            ? Number(valueAsEntry.durationSec)
            : null;

      if (shouldAutoComplete(positionSec, durationSec)) {
        continue;
      }

      byJuzId[juzId] = {
        juzId,
        positionSec,
        durationSec,
        updatedAtISO: sanitizeUpdatedAtISO(valueAsEntry.updatedAtISO, fallbackUpdatedAtISO)
      };
    }
  }

  const requestedLastPlayedJuzId = toValidJuzId(rawAudio.lastPlayedJuzId);
  const hasRequestedLastPlayed =
    requestedLastPlayedJuzId !== null && Boolean(byJuzId[requestedLastPlayedJuzId]);

  return {
    byJuzId,
    lastPlayedJuzId: hasRequestedLastPlayed ? requestedLastPlayedJuzId : null
  };
}

export function createDefaultState(now: Date = new Date()): AppState {
  return {
    version: APP_VERSION,
    completedJuzIds: [],
    logs: [],
    notesByDate: {},
    settings: sanitizeSettings(undefined, now),
    audio: createDefaultAudioState()
  };
}

export function migrateState(rawState: unknown, now: Date = new Date()): AppState {
  if (!rawState || typeof rawState !== "object") {
    return createDefaultState(now);
  }

  const base = rawState as Partial<AppState>;
  const completed = Array.isArray(base.completedJuzIds)
    ? Array.from(new Set(base.completedJuzIds.filter((id): id is number => typeof id === "number")))
        .sort((a, b) => a - b)
    : [];

  const logs = Array.isArray(base.logs)
    ? base.logs.filter(
        (entry): entry is AppState["logs"][number] =>
          Boolean(entry) &&
          typeof entry.juzId === "number" &&
          typeof entry.completedAtISO === "string" &&
          (entry.playbackMode === "in_app" || entry.playbackMode === "external")
      )
    : [];

  const notesByDate =
    base.notesByDate && typeof base.notesByDate === "object"
      ? Object.fromEntries(
          Object.entries(base.notesByDate)
            .filter(([key, value]) => /^\d{4}-\d{2}-\d{2}$/.test(key) && typeof value === "string")
            .map(([key, value]) => [key, value.trim()])
            .filter(([, value]) => value.length > 0)
        )
      : {};

  return {
    version: APP_VERSION,
    completedJuzIds: completed,
    logs,
    notesByDate,
    settings: sanitizeSettings(base.settings, now),
    audio: sanitizeAudio((base as { audio?: unknown }).audio, now)
  };
}

export function loadState(now: Date = new Date()): AppState {
  if (typeof window === "undefined") {
    return createDefaultState(now);
  }

  const rawCurrent = window.localStorage.getItem(STORAGE_KEY);
  if (rawCurrent) {
    try {
      return migrateState(JSON.parse(rawCurrent), now);
    } catch {
      // Fallthrough to legacy key if current key is corrupted.
    }
  }

  const rawLegacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
  if (rawLegacy) {
    try {
      const migrated = migrateState(JSON.parse(rawLegacy), now);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      return migrated;
    } catch {
      return createDefaultState(now);
    }
  }

  return createDefaultState(now);
}

export function saveState(state: AppState): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getStorageKey(): string {
  return STORAGE_KEY;
}

export function getLegacyStorageKey(): string {
  return LEGACY_STORAGE_KEY;
}
