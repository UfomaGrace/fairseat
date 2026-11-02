// Caps Lock detection for the password field's hint.
//
// Read on every key event, so the hint follows the key as it toggles. Returns null when the
// browser can't tell (no getModifierState), and the hint then keeps its last state.

type ModifierSource = { getModifierState?: (key: "CapsLock") => boolean };

export function capsLockState(event: ModifierSource): boolean | null {
  if (typeof event.getModifierState !== "function") return null;
  return event.getModifierState("CapsLock");
}
