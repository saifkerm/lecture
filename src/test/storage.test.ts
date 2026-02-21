import { describe, expect, it } from "vitest";
import {
  createDefaultState,
  getLegacyStorageKey,
  getStorageKey,
  loadState,
  migrateState,
  saveState
} from "../lib/storage";

describe("storage", () => {
  it("charge un état par défaut si localStorage est vide", () => {
    const state = loadState(new Date(2026, 1, 20, 10, 0, 0));
    expect(state.version).toBe(2);
    expect(state.completedJuzIds).toHaveLength(0);
    expect(state.settings.weeklyTarget).toBe(5);
    expect(state.audio.byJuzId).toEqual({});
    expect(state.audio.lastPlayedJuzId).toBeNull();
  });

  it("sauvegarde et recharge correctement l'état", () => {
    const state = createDefaultState(new Date(2026, 1, 20, 10, 0, 0));
    state.completedJuzIds = [1, 2];
    state.audio.byJuzId[1] = {
      juzId: 1,
      positionSec: 42,
      durationSec: 300,
      updatedAtISO: "2026-02-20T10:00:00.000Z"
    };
    state.audio.lastPlayedJuzId = 1;

    saveState(state);
    const loaded = loadState(new Date(2026, 1, 20, 10, 0, 0));

    expect(loaded.completedJuzIds).toEqual([1, 2]);
    expect(loaded.audio.byJuzId[1]?.positionSec).toBe(42);
    expect(loaded.audio.lastPlayedJuzId).toBe(1);
  });

  it("migre un état incomplet vers une version stable et nettoie les reprises invalides", () => {
    const migrated = migrateState(
      {
        completedJuzIds: [1, 1, 3],
        logs: [{ juzId: 1, completedAtISO: "2026-02-20T10:00:00.000Z", playbackMode: "in_app" }],
        notesByDate: { "2026-02-20": "test" },
        settings: { weeklyTarget: 8 },
        audio: {
          byJuzId: {
            1: {
              juzId: 1,
              positionSec: 95,
              durationSec: 100,
              updatedAtISO: "2026-02-20T10:00:00.000Z"
            },
            2: {
              juzId: 2,
              positionSec: -15,
              durationSec: 200,
              updatedAtISO: "invalid"
            },
            41: {
              juzId: 41,
              positionSec: 20,
              durationSec: 100,
              updatedAtISO: "2026-02-20T10:00:00.000Z"
            }
          },
          lastPlayedJuzId: 2
        }
      },
      new Date(2026, 1, 20, 10, 0, 0)
    );

    expect(migrated.version).toBe(2);
    expect(migrated.completedJuzIds).toEqual([1, 3]);
    expect(migrated.settings.weeklyTarget).toBe(8);
    expect(migrated.audio.byJuzId[1]).toBeUndefined();
    expect(migrated.audio.byJuzId[2]?.positionSec).toBe(0);
    expect(migrated.audio.byJuzId[41]).toBeUndefined();
    expect(migrated.audio.lastPlayedJuzId).toBe(2);
  });

  it("retombe sur défaut si JSON localStorage invalide", () => {
    localStorage.setItem(getStorageKey(), "invalid-json");
    const loaded = loadState(new Date(2026, 1, 20, 10, 0, 0));
    expect(loaded.version).toBe(2);
    expect(loaded.completedJuzIds).toEqual([]);
  });

  it("migre automatiquement la clé legacy vers la clé v2", () => {
    localStorage.setItem(
      getLegacyStorageKey(),
      JSON.stringify({
        version: 1,
        completedJuzIds: [3],
        logs: [],
        notesByDate: {},
        settings: { ramadanStartDateISO: "2026-02-20", weeklyTarget: 5, reminderTimeHHmm: "21:00", reminderEnabled: false }
      })
    );

    const loaded = loadState(new Date(2026, 1, 20, 10, 0, 0));

    expect(loaded.version).toBe(2);
    expect(loaded.completedJuzIds).toEqual([3]);
    expect(localStorage.getItem(getStorageKey())).toContain("\"version\":2");
    expect(localStorage.getItem(getLegacyStorageKey())).toBeNull();
  });
});
