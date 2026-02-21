import { describe, expect, it } from "vitest";
import {
  clearResumeEntry,
  formatPositionLabel,
  getResumeForJuz,
  shouldAutoComplete,
  upsertResumeEntry
} from "../lib/audioProgress";
import type { AudioProgressState } from "../types/app";

function createAudioState(): AudioProgressState {
  return {
    byJuzId: {},
    lastPlayedJuzId: null
  };
}

describe("audio progress helpers", () => {
  it("formate les durées en mm:ss ou hh:mm:ss", () => {
    expect(formatPositionLabel(5)).toBe("00:05");
    expect(formatPositionLabel(75)).toBe("01:15");
    expect(formatPositionLabel(3661)).toBe("1:01:01");
  });

  it("détecte le seuil d'auto-complétion à 95%", () => {
    expect(shouldAutoComplete(95, 100)).toBe(true);
    expect(shouldAutoComplete(94.9, 100)).toBe(false);
    expect(shouldAutoComplete(50, null)).toBe(false);
  });

  it("upsert une reprise valide et la récupère", () => {
    const base = createAudioState();
    const next = upsertResumeEntry(base, {
      juzId: 4,
      positionSec: 33,
      durationSec: 300,
      updatedAtISO: "2026-02-20T10:00:00.000Z"
    });

    expect(next.lastPlayedJuzId).toBe(4);
    expect(getResumeForJuz(next, 4)?.positionSec).toBe(33);
  });

  it("ignore les reprises invalides et supprime celles quasi finies", () => {
    const base = createAudioState();
    const ignored = upsertResumeEntry(base, {
      juzId: 99,
      positionSec: 10,
      durationSec: 100,
      updatedAtISO: "2026-02-20T10:00:00.000Z"
    });
    expect(ignored).toEqual(base);

    const withEntry = upsertResumeEntry(base, {
      juzId: 3,
      positionSec: 20,
      durationSec: 100,
      updatedAtISO: "2026-02-20T10:00:00.000Z"
    });

    const clearedByThreshold = upsertResumeEntry(withEntry, {
      juzId: 3,
      positionSec: 95,
      durationSec: 100,
      updatedAtISO: "2026-02-20T10:02:00.000Z"
    });

    expect(getResumeForJuz(clearedByThreshold, 3)).toBeUndefined();
  });

  it("supprime explicitement une reprise", () => {
    const withEntry = upsertResumeEntry(createAudioState(), {
      juzId: 2,
      positionSec: 44,
      durationSec: 200,
      updatedAtISO: "2026-02-20T10:00:00.000Z"
    });

    const cleared = clearResumeEntry(withEntry, 2);
    expect(cleared.byJuzId[2]).toBeUndefined();
    expect(cleared.lastPlayedJuzId).toBeNull();
  });
});
