import { describe, expect, it } from "vitest";
import { getRamadanDay, getRamadanPhase, getSuggestedJuzId } from "../lib/ramadan";

describe("ramadan helpers", () => {
  it("calcule le jour 1 correctement", () => {
    const day = getRamadanDay("2026-02-18", new Date(2026, 1, 18, 12, 0, 0));
    expect(day).toBe(1);
  });

  it("retourne le jour 30 pour la fin de période", () => {
    const day = getRamadanDay("2026-02-18", new Date(2026, 2, 19, 12, 0, 0));
    expect(day).toBe(30);
  });

  it("retourne null avant le début", () => {
    const day = getRamadanDay("2026-02-18", new Date(2026, 1, 17, 12, 0, 0));
    expect(day).toBeNull();
  });

  it("retourne null après 30 jours", () => {
    const day = getRamadanDay("2026-02-18", new Date(2026, 2, 20, 12, 0, 0));
    expect(day).toBeNull();
  });

  it("mappe correctement la partie suggérée", () => {
    expect(getSuggestedJuzId(5)).toBe(5);
    expect(getSuggestedJuzId(null)).toBeNull();
    expect(getSuggestedJuzId(31)).toBeNull();
  });

  it("détermine la phase de Ramadan", () => {
    expect(getRamadanPhase("2026-02-18", new Date(2026, 1, 17, 12, 0, 0))).toBe("before");
    expect(getRamadanPhase("2026-02-18", new Date(2026, 1, 20, 12, 0, 0))).toBe("during");
    expect(getRamadanPhase("2026-02-18", new Date(2026, 2, 25, 12, 0, 0))).toBe("after");
  });
});
