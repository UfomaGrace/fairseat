import { describe, expect, it } from "vitest";
import * as Yup from "yup";
import { ApiError } from "../api/client";
import { applyApiError } from "../components/form/applyApiError";
import { EMAIL_MAX, emailAddress, password, PASSWORD_MAX } from "./validation";

/** The first error message, or null when valid. */
function errorOf(schema: Yup.Schema, value: unknown): string | null {
  try {
    schema.validateSync(value);
    return null;
  } catch (e) {
    return e instanceof Yup.ValidationError ? e.message : String(e);
  }
}

describe("emailAddress", () => {
  it("accepts a valid address, ignoring spaces around it", () => {
    expect(errorOf(emailAddress(), "amaka.attendee@fairseat.demo")).toBeNull();
    expect(errorOf(emailAddress(), "  amaka.attendee@fairseat.demo  ")).toBeNull();
  });

  it("asks for an address when empty or only spaces", () => {
    expect(errorOf(emailAddress(), "")).toBe("Enter your email address.");
    expect(errorOf(emailAddress(), "   ")).toBe("Enter your email address.");
  });

  it("rejects a malformed address", () => {
    expect(errorOf(emailAddress(), "amaka")).toBe("Enter a valid email address, like name@example.com.");
  });

  it("rejects more than 254 characters", () => {
    // Well-formed (each domain part under 64 characters), just too long overall.
    const long = `${"a".repeat(64)}@${`${"b".repeat(60)}.`.repeat(4)}demo`;
    expect(long.length).toBeGreaterThan(EMAIL_MAX);
    expect(errorOf(emailAddress(), long)).toMatch(/at most 254/);
  });
});

describe("password", () => {
  it("accepts 1 to 128 characters, with no minimum of 8", () => {
    expect(errorOf(password(), "x")).toBeNull();
    expect(errorOf(password(), "x".repeat(PASSWORD_MAX))).toBeNull();
  });

  it("asks for a password when empty", () => {
    expect(errorOf(password(), "")).toBe("Enter your password.");
  });

  it("rejects more than 128 characters", () => {
    expect(errorOf(password(), "x".repeat(PASSWORD_MAX + 1))).toMatch(/at most 128/);
  });
});

describe("applyApiError", () => {
  const fields = ["email", "password"] as const;

  function validationError(details: Record<string, unknown>): ApiError {
    return new ApiError({ status: 400, code: "VALIDATION_FAILED", message: "Some fields need attention.", requestId: "req-1", details });
  }

  it("puts known fields on the form and returns the rest", () => {
    const set: Record<string, string> = {};
    const rest = applyApiError(
      validationError({ email: "Enter a valid email.", captcha: "Try again." }),
      fields,
      (field, message) => {
        set[field] = message;
      },
    );
    expect(set).toEqual({ email: "Enter a valid email." });
    expect(rest).toEqual({ captcha: "Try again." });
  });

  it("ignores details that are not text", () => {
    const rest = applyApiError(validationError({ email: 42 }), fields, () => {
      throw new Error("should not be called");
    });
    expect(rest).toEqual({});
  });

  it("does nothing for other error codes", () => {
    const error = new ApiError({
      status: 401,
      code: "INVALID_CREDENTIALS",
      message: "Email or password is wrong.",
      requestId: "req-2",
      details: { email: "x" },
    });
    const rest = applyApiError(error, fields, () => {
      throw new Error("should not be called");
    });
    expect(rest).toEqual({});
  });
});
