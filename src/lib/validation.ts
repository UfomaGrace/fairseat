// Validation: Yup pieces that match the rules in contract/openapi.yaml.
// Build a form's schema from these so every form checks the same thing the same way.
//
//   Yup.object({ email: emailAddress(), password: password() })
//
// - Messages are plain English and say what to do ("Enter your email address.").
// - Limits come from the yaml (SessionRequest), so the service never rejects what we let through.

import * as Yup from "yup";

export const EMAIL_MAX = 254;
export const PASSWORD_MAX = 128;

/** Required, a valid address, at most 254 characters. Spaces around it are ignored. */
export const emailAddress = () =>
  Yup.string()
    .trim()
    .required("Enter your email address.")
    .email("Enter a valid email address, like name@example.com.")
    .max(EMAIL_MAX, `Your email address can be at most ${EMAIL_MAX} characters.`);

/**
 * Required, at most 128 characters. Not trimmed: spaces can be part of a password.
 * The yaml only asks for 1 character, so there is no "at least 8" rule here.
 */
export const password = () =>
  Yup.string()
    .required("Enter your password.")
    .max(PASSWORD_MAX, `Your password can be at most ${PASSWORD_MAX} characters.`);
