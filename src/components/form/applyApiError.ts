// applyApiError: put a VALIDATION_FAILED error's field messages onto the matching Formik fields.
//
//   const unmapped = applyApiError(error, LOGIN_FIELDS, helpers.setFieldError);
//   // → details { email: "Enter a valid email." } shows under Email
//   // → messages for fields the form doesn't have come back, to show in the FormAlert
//
// FairSeat's details is an object (field name → message), read through error.fieldErrors.
// Any other error code has no field errors, so this does nothing and returns {}.

import type { ApiError } from "../../api/client";

export function applyApiError<F extends string>(
  error: ApiError,
  fields: readonly F[],
  setFieldError: (field: F, message: string) => void,
): Record<string, string> {
  const unmapped: Record<string, string> = {};
  for (const [name, message] of Object.entries(error.fieldErrors)) {
    const field = fields.find((f) => f === name);
    if (field) setFieldError(field, message);
    else unmapped[name] = message;
  }
  return unmapped;
}
