import { describe, expect, it } from "vitest";
import { AVATAR_PALETTES, avatarPalette, avatarPaletteIndex, hashString, initials } from "./avatarParts";

describe("initials", () => {
  it("takes the first letter of the first and last word", () => {
    expect(initials("Amaka Obi")).toBe("AO");
    expect(initials("Tolu Grace Adebayo")).toBe("TA");
  });

  it("gives one letter for a single word", () => {
    expect(initials("Tolu")).toBe("T");
  });

  it("upper-cases and ignores extra spaces", () => {
    expect(initials("  ada   lovelace ")).toBe("AL");
  });

  it("returns an empty string for a blank name", () => {
    expect(initials("")).toBe("");
    expect(initials("   ")).toBe("");
  });

  it("keeps characters outside Basic Latin whole", () => {
    expect(initials("Ọlá Ẹ̀kọ́")).toBe("ỌẸ");
    expect(initials("😀 Smile")).toBe("😀S");
  });
});

describe("avatar colour", () => {
  it("is stable for the same id", () => {
    const id = "6d1f9a10-0000-4000-8000-000000000101";
    expect(avatarPalette(id)).toBe(avatarPalette(id));
    expect(hashString(id)).toBe(hashString(id));
  });

  it("always picks one of the three pairs", () => {
    for (let n = 0; n < 50; n++) {
      const index = avatarPaletteIndex(`organiser-${n}`);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(AVATAR_PALETTES.length);
    }
  });

  it("spreads similar ids across all three pairs", () => {
    const used = new Set<number>();
    for (let n = 101; n < 131; n++) {
      used.add(avatarPaletteIndex(`6d1f9a10-0000-4000-8000-000000000${n}`));
    }
    expect(used.size).toBe(3);
  });

  it("matches a known FNV-1a value", () => {
    expect(hashString("")).toBe(0x811c9dc5);
    expect(hashString("a")).toBe(0xe40c292c);
  });
});
