// EventForm: the one form behind Create event and Edit event.
//
//   <EventForm mode="create" submitLabel="Create event" onSubmit={async (body) => { … }} />
//   <EventForm mode="edit" event={event} submitLabel="Save changes" onSubmit={async (changes, helpers) => { … }} />
//
// - Same fields and rules for both (eventSchema). Create sends every field; edit sends only
//   the fields that changed. Nothing changed → a short note and no request.
// - Edit starts from the event as it was when the page opened. A refetch later (after a 409)
//   doesn't overwrite what the organiser has typed.
// - onSubmit throws on failure. VALIDATION_FAILED → each message under its field; anything
//   else → FormAlert at the top with "Reference: <requestId>". errorMessage can swap the words.
// - Times are typed in Lagos time (see eventSchema for the conversion).

import { Form, Formik, useFormikContext, type FormikHelpers } from "formik";
import { useEffect, useRef, useState, type RefObject } from "react";
import { ApiError, toApiError } from "../../api/client";
import type { EventCreate, EventUpdate, FairEvent } from "../../api/types";
import { applyApiError } from "../../components/form/applyApiError";
import { FormAlert } from "../../components/form/FormAlert";
import { FormikField } from "../../components/form/FormikField";
import { FormikSelect } from "../../components/form/FormikSelect";
import { FormikTextarea } from "../../components/form/FormikTextarea";
import { CATEGORY_OPTIONS } from "../../lib/labels";
import { Button } from "../../shared/ui/button";
import {
  changedFields,
  DESCRIPTION_MAX,
  EMPTY_EVENT_VALUES,
  EVENT_FIELDS,
  eventSchema,
  eventToFormValues,
  LOCATION_MAX,
  SEATS_MAX,
  SEATS_MIN,
  TITLE_MAX,
  toEventCreate,
  type EventFormValues,
} from "./eventSchema";

type CommonProps = {
  submitLabel: string;
  /** Replaces the service's message in the top alert, e.g. friendlier words for a 409. */
  errorMessage?: (error: ApiError) => string | undefined;
};

type CreateProps = CommonProps & {
  mode: "create";
  onSubmit: (body: EventCreate) => Promise<void>;
};

type EditProps = CommonProps & {
  mode: "edit";
  event: FairEvent;
  /** helpers lets the page put its own error on a field (SEATS_BELOW_TAKEN on seats). */
  onSubmit: (changes: EventUpdate, helpers: FormikHelpers<EventFormValues>) => Promise<void>;
};

export type EventFormProps = CreateProps | EditProps;

const LAGOS_HINT = "Lagos time (WAT).";

export function EventForm(props: EventFormProps) {
  // Read once: Formik ignores later changes to initialValues, and so do we.
  const [initialValues] = useState(() =>
    props.mode === "edit" ? eventToFormValues(props.event) : EMPTY_EVENT_VALUES,
  );
  const [formError, setFormError] = useState<ApiError | null>(null);
  const [unmapped, setUnmapped] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // seatsTaken is read fresh each render, so the rule follows a refetched event.
  const schema =
    props.mode === "edit" ? eventSchema({ initial: initialValues, seatsTaken: props.event.seatsTaken }) : eventSchema();

  async function handleSubmit(values: EventFormValues, helpers: FormikHelpers<EventFormValues>) {
    setFormError(null);
    setUnmapped({});
    setNotice(null);
    try {
      if (props.mode === "create") {
        await props.onSubmit(toEventCreate(values));
        return;
      }
      const changes = changedFields(initialValues, values);
      if (Object.keys(changes).length === 0) {
        setNotice("You haven't changed anything yet, so there's nothing to save.");
        return;
      }
      await props.onSubmit(changes, helpers);
    } catch (e) {
      const error = toApiError(e);
      if (error.code === "VALIDATION_FAILED") {
        const rest = applyApiError(error, EVENT_FIELDS, helpers.setFieldError);
        // Show the box too when some (or all) messages had no field to sit under.
        if (Object.keys(rest).length > 0 || Object.keys(error.fieldErrors).length === 0) {
          setUnmapped(rest);
          setFormError(error);
        }
        return;
      }
      setFormError(error);
    }
  }

  return (
    <Formik<EventFormValues> initialValues={initialValues} validationSchema={schema} onSubmit={handleSubmit}>
      {({ isSubmitting, isValidating }) => {
        // Busy only while the request is in flight, not during the quick validation pass.
        const busy = isSubmitting && !isValidating;
        return (
          <Form ref={formRef} noValidate className="flex flex-col gap-5">
            <FocusFirstError formRef={formRef} />

            <FormAlert
              error={formError}
              message={formError ? props.errorMessage?.(formError) : undefined}
              issues={unmapped}
            />

            <FormikField name="title" label="Title" maxLength={TITLE_MAX} required />

            <FormikTextarea
              name="description"
              label="Description"
              hint="Optional. What will happen, who it's for, what to bring."
              maxLength={DESCRIPTION_MAX}
              rows={5}
            />

            <FormikSelect name="category" label="Category" options={CATEGORY_OPTIONS} required />

            <FormikField
              name="location"
              label="Location"
              hint="For example, Yaba, Lagos."
              maxLength={LOCATION_MAX}
              required
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <FormikField
                name="startsAt"
                label="Starts"
                type="datetime-local"
                hint={LAGOS_HINT}
                hintPlacement="below"
                required
              />
              <FormikField
                name="endsAt"
                label="Ends"
                type="datetime-local"
                hint={LAGOS_HINT}
                hintPlacement="below"
                required
              />
            </div>

            <FormikField
              name="seats"
              label="Seats"
              type="number"
              inputMode="numeric"
              min={SEATS_MIN}
              max={SEATS_MAX}
              step={1}
              hint={`From ${SEATS_MIN} to ${SEATS_MAX}. When it's full, people join the waiting list.`}
              className="sm:max-w-xs"
              required
            />

            {/* Always rendered: a live region must exist before its text changes to be announced. */}
            <p role="status" className="-mt-5 text-sm text-(--color-text-muted)">
              {notice}
            </p>

            {/* loading keeps focus on the button (aria-disabled) and blocks a second submit. */}
            <Button type="submit" size="lg" loading={busy} className="w-full sm:w-auto sm:self-start">
              {props.submitLabel}
            </Button>
          </Form>
        );
      }}
    </Formik>
  );
}

/** After each submit attempt (client or server errors), move focus to the first invalid field. */
function FocusFirstError({ formRef }: { formRef: RefObject<HTMLFormElement | null> }) {
  const { submitCount, isSubmitting, errors } = useFormikContext<EventFormValues>();
  const handledCount = useRef(0);

  useEffect(() => {
    if (isSubmitting || submitCount === handledCount.current) return;
    handledCount.current = submitCount;
    const first = EVENT_FIELDS.find((f) => errors[f]);
    const el = first ? formRef.current?.elements.namedItem(first) : null;
    if (el instanceof HTMLElement) el.focus();
  }, [submitCount, isSubmitting, errors, formRef]);

  return null;
}
