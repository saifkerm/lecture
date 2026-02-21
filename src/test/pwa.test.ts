import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("PWA manifest", () => {
  it("expose un manifest valide avec 2 icônes", () => {
    const manifestPath = path.resolve(process.cwd(), "public/manifest.webmanifest");
    const raw = readFileSync(manifestPath, "utf-8");
    const parsed = JSON.parse(raw) as { name: string; icons: Array<{ src: string }> };

    expect(parsed.name).toContain("Suivi Ramadan");
    expect(parsed.icons.length).toBeGreaterThanOrEqual(2);
    expect(parsed.icons[0].src).toContain("icon-192");
  });
});
