import { describe, expect, it } from "vitest";
import { computeProgress, computeStreak, computeWeeklyProgress, pickSuggestedJuzId } from "../lib/progress";
import type { RecitationLog } from "../types/app";

function log(juzId: number, date: Date): RecitationLog {
  return {
    juzId,
    completedAtISO: date.toISOString(),
    playbackMode: "in_app"
  };
}

describe("progress helpers", () => {
  it("calcule la progression sur 30", () => {
    expect(computeProgress(6)).toEqual({ done: 6, total: 30, percent: 20 });
  });

  it("calcule un streak de jours consécutifs", () => {
    const logs = [
      log(1, new Date(2026, 1, 20, 8, 0, 0)),
      log(2, new Date(2026, 1, 19, 9, 0, 0)),
      log(3, new Date(2026, 1, 18, 10, 0, 0))
    ];

    expect(computeStreak(logs, new Date(2026, 1, 20, 18, 0, 0))).toBe(3);
  });

  it("renvoie un streak nul quand la dernière récitation est trop ancienne", () => {
    const logs = [log(1, new Date(2026, 1, 10, 8, 0, 0))];
    expect(computeStreak(logs, new Date(2026, 1, 20, 18, 0, 0))).toBe(0);
  });

  it("calcule l'objectif hebdomadaire glissant", () => {
    const now = new Date(2026, 1, 20, 18, 0, 0);
    const logs = [
      log(1, new Date(2026, 1, 20, 8, 0, 0)),
      log(2, new Date(2026, 1, 19, 8, 0, 0)),
      log(3, new Date(2026, 1, 18, 8, 0, 0)),
      log(4, new Date(2026, 1, 14, 8, 0, 0)),
      log(5, new Date(2026, 1, 12, 8, 0, 0))
    ];

    expect(computeWeeklyProgress(logs, now, 4)).toEqual({ count: 4, target: 4, met: true });
  });

  it("propose la partie suivante de la dernière terminée", () => {
    expect(pickSuggestedJuzId([1, 2, 3])).toBe(4);
  });

  it("retombe sur la première non terminée quand la dernière est 30", () => {
    expect(pickSuggestedJuzId([1, 2, 30])).toBe(3);
  });

  it("propose 1 quand aucune partie n'est terminée", () => {
    expect(pickSuggestedJuzId([])).toBe(1);
  });

  it("renvoie null si tout est terminé", () => {
    const completed = Array.from({ length: 30 }, (_, index) => index + 1);
    expect(pickSuggestedJuzId(completed)).toBeNull();
  });
});
