// Role names for the UI, and a check for values read from storage.
import type { Role } from "../api/types";

// Record<Role, …> makes TypeScript complain if a new role is added without a label.
export const ROLE_LABEL: Record<Role, string> = {
  ATTENDEE: "Attendee",
  ORGANISER: "Organiser",
  ADMIN: "Admin",
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && value in ROLE_LABEL;
}
