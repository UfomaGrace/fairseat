// Avatar logic: initials from a display name, and a colour pair picked from an id.
//
// - initials: first letter of the first and last word, upper-cased, at most two. Letters are
//   read as whole characters (Array.from), so names outside the Basic Latin range keep theirs.
// - avatarPalette: the same id always gives the same pair, so an organiser keeps one colour
//   everywhere. FNV-1a spreads similar ids (…0101, …0102) across the pairs.

export const AVATAR_PALETTES = [
  { background: "var(--color-avatar-1-bg)", color: "var(--color-avatar-1-text)" },
  { background: "var(--color-avatar-2-bg)", color: "var(--color-avatar-2-text)" },
  { background: "var(--color-avatar-3-bg)", color: "var(--color-avatar-3-text)" },
] as const;

export type AvatarPalette = (typeof AVATAR_PALETTES)[number];

/** "Amaka Obi" → "AO", "Tolu" → "T", "  " → "". */
export function initials(displayName: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const first = Array.from(words[0])[0];
  const last = words.length > 1 ? Array.from(words[words.length - 1])[0] : "";
  return (first + last).toLocaleUpperCase();
}

/** 32-bit FNV-1a hash of a string. */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function avatarPaletteIndex(id: string): number {
  return hashString(id) % AVATAR_PALETTES.length;
}

export function avatarPalette(id: string): AvatarPalette {
  return AVATAR_PALETTES[avatarPaletteIndex(id)];
}
