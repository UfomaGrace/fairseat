import { describe, expect, it } from "vitest";
import { capsLockState } from "./capsLock";

const keyEvent = (on: Record<string, boolean>) => ({ getModifierState: (key: string) => on[key] ?? false });

describe("capsLockState", () => {
  it("is true while Caps Lock is on", () => {
    expect(capsLockState(keyEvent({ CapsLock: true }))).toBe(true);
  });

  it("is false while Caps Lock is off", () => {
    expect(capsLockState(keyEvent({}))).toBe(false);
  });

  it("ignores other modifiers such as Shift", () => {
    expect(capsLockState(keyEvent({ Shift: true }))).toBe(false);
  });

  it("is null when the event can't report modifiers", () => {
    expect(capsLockState({})).toBeNull();
  });
});
