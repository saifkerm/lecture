import { describe, expect, it } from "vitest";
import { juzLinks } from "../data/juzLinks";

describe("juzLinks local audio mapping", () => {
  it("contient 30 parties avec des URLs audio locales", () => {
    expect(juzLinks).toHaveLength(30);

    for (const juz of juzLinks) {
      expect(juz.url.startsWith("audio/")).toBe(true);
      expect(juz.url.endsWith(".mp3")).toBe(true);
    }
  });
});
