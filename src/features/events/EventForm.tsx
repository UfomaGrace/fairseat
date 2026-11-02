import { Form, Formik, useField, useFormikContext, type FormikHelpers } from "formik";
import { ChevronDown, ChevronUp, Minus, Plus } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { Link, useBlocker, useLocation } from "react-router";
import { ApiError, toApiError } from "../../api/client";
import type { Category, EventCreate, EventUpdate, FairEvent, User } from "../../api/types";
import { Avatar } from "../../components/avatar/Avatar";
import { EventImage } from "../../components/event-image/EventImage";
import { applyApiError } from "../../components/form/applyApiError";
import { FormAlert } from "../../components/form/FormAlert";
import { FormikField } from "../../components/form/FormikField";
import { FormField } from "../../components/ui/form-field";
import { Button } from "../../components/ui/button";
import { Dialog } from "../../components/ui/dialog";
import { CATEGORY_LABELS, CATEGORY_OPTIONS } from "../../lib/labels";
import { formatDateTime, formatRangeEnd } from "../../lib/format";
import { cn } from "../../lib/cn";
import {
  changedFields,
  DESCRIPTION_MAX,
  EMPTY_EVENT_VALUES,
  EVENT_FIELDS,
  eventSchema,
  eventToFormValues,
  fromLagosInput,
  isEventSaveDisabled,
  LOCATION_MAX,
  SEATS_MAX,
  SEATS_MIN,
  seatsOfferedByIncrease,
  TITLE_MAX,
  toEventCreate,
  type EventFormValues,
} from "./eventSchema";

type CommonProps = {
  submitLabel: string;
  cancelPath: string;
  organiser: Pick<User, "id" | "displayName"> | null;
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
  cancelSection?: ReactNode;
  /** helpers lets the page put its own error on a field (SEATS_BELOW_TAKEN on seats). */
  onSubmit: (changes: EventUpdate, helpers: FormikHelpers<EventFormValues>) => Promise<void>;
};

export type EventFormProps = CreateProps | EditProps;

const SHOW_IMAGE_UPLOAD = false;

const inputClass = cn(
  "h-11 w-full min-w-0 rounded-[var(--radius-md)] border border-[var(--color-border-input)]",
  "bg-[var(--color-bg)] px-3 text-sm text-[var(--color-text)]",
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]",
  "aria-[invalid=true]:border-2 aria-[invalid=true]:border-[var(--color-danger)]",
);

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]";

export function EventForm(props: EventFormProps) {
  const location = useLocation();
  const [initialValues] = useState(() =>
    props.mode === "edit" ? eventToFormValues(props.event) : EMPTY_EVENT_VALUES,
  );
  const [formError, setFormError] = useState<ApiError | null>(null);
  const [unmapped, setUnmapped] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const schema =
    props.mode === "edit" ? eventSchema({ initial: initialValues, seatsTaken: props.event.seatsTaken }) : eventSchema();

  useEffect(() => {
    if (new URLSearchParams(location.search).get("focus") !== "seats") return;
    const seats = formRef.current?.elements.namedItem("seats");
    if (seats instanceof HTMLElement) seats.focus();
  }, [location.search]);

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
    <Formik<EventFormValues>
      initialValues={initialValues}
      validationSchema={schema}
      onSubmit={handleSubmit}
      validateOnMount={false}
    >
      {({ isSubmitting, isValidating }) => (
        <EventFormBody
          props={props}
          initialValues={initialValues}
          formRef={formRef}
          formError={formError}
          unmapped={unmapped}
          notice={notice}
          setNotice={setNotice}
          mobilePreviewOpen={mobilePreviewOpen}
          setMobilePreviewOpen={setMobilePreviewOpen}
          errorMessage={formError ? props.errorMessage?.(formError) : undefined}
          busy={isSubmitting && !isValidating}
        />
      )}
    </Formik>
  );
}

function EventFormBody({
  props,
  initialValues,
  formRef,
  formError,
  unmapped,
  notice,
  setNotice,
  mobilePreviewOpen,
  setMobilePreviewOpen,
  errorMessage,
  busy,
}: {
  props: EventFormProps;
  initialValues: EventFormValues;
  formRef: RefObject<HTMLFormElement | null>;
  formError: ApiError | null;
  unmapped: Record<string, string>;
  notice: string | null;
  setNotice: (notice: string | null) => void;
  mobilePreviewOpen: boolean;
  setMobilePreviewOpen: (open: boolean) => void;
  errorMessage?: string;
  busy: boolean;
}) {
  const { values, errors, submitCount } = useFormikContext<EventFormValues>();
  const dirty = !isEventSaveDisabled("edit", initialValues, values);
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    dirty && !busy && currentLocation.key !== nextLocation.key,
  );
  const headingId = useId();

  useEffect(() => {
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirty || busy) return;
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [dirty, busy]);

  useEffect(() => {
    if (!formError && !notice) return;
    if (submitCount > 0) setNotice(null);
  }, [submitCount, formError, notice, setNotice]);

  const preview = (
    <EventPreview values={values} event={props.mode === "edit" ? props.event : undefined} organiser={props.organiser} />
  );

  return (
    <div className="grid gap-6 pb-24 md:grid-cols-[minmax(0,1fr)_360px] md:gap-8">
      <Form id="event-form" ref={formRef} noValidate className="flex min-w-0 flex-col gap-5">
        <FocusFirstError formRef={formRef} />
        <FormAlert error={formError} message={errorMessage} issues={unmapped}>
          {(formError?.code === "EVENT_STARTED" || formError?.code === "EVENT_CANCELLED") && (
            <p className="mt-2">
              <Link to="/organiser/events" className={cn("font-medium underline underline-offset-2", focusRing)}>
                Back to Your events
              </Link>
            </p>
          )}
        </FormAlert>

        <section aria-labelledby={`${headingId}-basics`} className="rounded-[var(--radius-card)] bg-(--color-bg) p-5 sm:p-6">
          <h2 id={`${headingId}-basics`} className="text-xl font-semibold text-(--color-text)">The basics</h2>
          <div className="mt-5 flex flex-col gap-5">
            <FormikField name="title" label="Event name" maxLength={TITLE_MAX} required />
            <CategoryField />
            <DescriptionField />
          </div>
        </section>

        <section aria-labelledby={`${headingId}-when`} className="rounded-[var(--radius-card)] bg-(--color-bg) p-5 sm:p-6">
          <h2 id={`${headingId}-when`} className="text-xl font-semibold text-(--color-text)">When and where</h2>
          <div className="mt-5 flex flex-col gap-5">
            <LagosDateTimeFields />
            <p className="text-sm text-(--color-text-muted)">
              Lagos time. The event must start in the future and end after it starts.
            </p>
            <FormikField
              name="location"
              label="Area"
              hint="The area people search for. Put the full address and directions in the description."
              maxLength={LOCATION_MAX}
              required
            />
          </div>
        </section>

        <section aria-labelledby={`${headingId}-seats`} className="rounded-[var(--radius-card)] bg-(--color-bg) p-5 sm:p-6">
          <h2 id={`${headingId}-seats`} className="text-xl font-semibold text-(--color-text)">Seats</h2>
          {props.mode === "edit" && (
            <p className="mt-2 text-sm text-(--color-text-muted)">
              {props.event.seatsTaken} taken now · {props.event.waitingCount} in line
            </p>
          )}
          <div className="mt-5">
            <SeatsField event={props.mode === "edit" ? props.event : undefined} />
          </div>
          {props.mode === "create" ? (
            <p className="mt-3 text-sm text-(--color-text-muted)">
              You can raise this later. Lowering it below the seats already taken isn&apos;t allowed.
            </p>
          ) : null}
          {props.mode === "edit" &&
            typeof values.seats === "number" &&
            values.seats > props.event.seats &&
            props.event.waitingCount > 0 && (
              <p className="mt-3 rounded-md bg-(--color-copper-wash) p-3 text-sm font-medium text-(--color-copper-deep)">
                Raising seats from {props.event.seats} to {values.seats} offers{" "}
                {seatsOfferedByIncrease(props.event.seats, values.seats, props.event.waitingCount)} seats to the people in line
                straight away, in order.
              </p>
            )}
        </section>

        <section aria-labelledby={`${headingId}-cover`} className="rounded-[var(--radius-card)] bg-(--color-bg) p-5 sm:p-6">
          <h2 id={`${headingId}-cover`} className="text-xl font-semibold text-(--color-text)">Cover image</h2>
          <div className="mt-4 overflow-hidden rounded-[var(--radius-md)]">
            <EventImage category={values.category || "TECH"} ratio="16 / 9" />
          </div>
          <p className="mt-3 text-sm text-(--color-text-muted)">
            Until you add one, your event uses the {CATEGORY_LABELS[values.category || "TECH"]} cover.
          </p>
          {SHOW_IMAGE_UPLOAD && (
            <button type="button" className={cn("mt-4 min-h-11 rounded-md border border-dashed px-4 text-sm", focusRing)}>
              Add a cover image
            </button>
          )}
        </section>

        {props.mode === "edit" && props.cancelSection}

        <p role="status" className="min-h-5 text-sm text-(--color-text-muted)">
          {notice}
        </p>

        <button
          type="button"
          aria-expanded={mobilePreviewOpen}
          aria-controls={`${headingId}-mobile-preview`}
          onClick={() => setMobilePreviewOpen(!mobilePreviewOpen)}
          className={cn("flex min-h-11 items-center justify-between rounded-md border border-(--color-border-input) bg-(--color-bg) px-4 text-sm font-medium md:hidden", focusRing)}
        >
          Preview
          {mobilePreviewOpen ? <ChevronUp aria-hidden="true" className="size-4" /> : <ChevronDown aria-hidden="true" className="size-4" />}
        </button>
        {mobilePreviewOpen && <div id={`${headingId}-mobile-preview`} className="md:hidden">{preview}</div>}

        <div className="sr-only" aria-live="polite">
          {dirty ? "You have unsaved changes." : ""}
        </div>
        {Object.keys(errors).length > 0 && submitCount > 0 && <span className="sr-only">Some fields need attention.</span>}
      </Form>

      <aside aria-label="Discover preview" className="hidden md:block">
        <div className="sticky top-6">
          <h2 className="mb-3 text-sm font-semibold text-(--color-text-muted)">Preview on Discover</h2>
          {preview}
        </div>
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-(--color-border) bg-(--color-bg) px-3 py-3 shadow-[0_-8px_24px_-20px_var(--color-text)] sm:px-6">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-3">
          <p className="hidden text-sm text-(--color-text-muted) sm:block">
            {props.mode === "create"
              ? "You can edit or cancel the event after publishing."
              : "Everyone booked or in line gets a notice about your changes."}
          </p>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Link
              to={props.cancelPath}
              className={cn(
                "inline-flex min-h-11 items-center rounded-md border border-(--color-border-input) bg-(--color-bg) px-4 text-sm font-medium text-(--color-text) hover:bg-(--color-surface)",
                focusRing,
              )}
            >
              {props.mode === "create" ? "Cancel" : "Discard changes"}
            </Link>
            <Button
              type="submit"
              form="event-form"
              size="lg"
              loading={busy}
              disabled={isEventSaveDisabled(props.mode, initialValues, values)}
              className="min-h-11 px-4 sm:px-6"
            >
              {props.submitLabel}
            </Button>
          </div>
        </div>
      </div>

      <Dialog
        open={blocker.state === "blocked"}
        onOpenChange={(open) => {
          if (!open && blocker.state === "blocked") blocker.reset();
        }}
        title="Leave without saving?"
        description="Your changes will be lost if you leave this page."
        footer={
          <>
            <Button variant="secondary" onClick={() => blocker.state === "blocked" && blocker.reset()}>
              Stay on this page
            </Button>
            <Button variant="danger" onClick={() => blocker.state === "blocked" && blocker.proceed()}>
              Leave page
            </Button>
          </>
        }
      />
    </div>
  );
}

function CategoryField() {
  const [field, meta, helpers] = useField<Category | "">("category");
  const fieldsetId = useId();
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const error = meta.touched ? meta.error : undefined;

  function choose(index: number) {
    const category = CATEGORY_OPTIONS[(index + CATEGORY_OPTIONS.length) % CATEGORY_OPTIONS.length];
    if (category) {
      void helpers.setValue(category.value);
      void helpers.setTouched(true, false);
    }
  }

  return (
    <fieldset>
      <legend className="text-sm font-medium text-(--color-text)">Category<span aria-hidden="true" className="ml-0.5 text-(--color-danger)">*</span></legend>
      <div
        id={fieldsetId}
        role="radiogroup"
        aria-label="Category"
        aria-required="true"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldsetId}-error` : undefined}
        className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3"
        onKeyDown={(event) => {
          const currentIndex = CATEGORY_OPTIONS.findIndex((option) => option.value === field.value);
          let nextIndex: number | null = null;
          if (event.key === "ArrowRight" || event.key === "ArrowDown") {
            nextIndex = currentIndex + 1;
          } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
            nextIndex = currentIndex < 0 ? CATEGORY_OPTIONS.length - 1 : currentIndex - 1;
          } else if (event.key === "Home") {
            nextIndex = 0;
          } else if (event.key === "End") {
            nextIndex = CATEGORY_OPTIONS.length - 1;
          }
          if (nextIndex !== null) {
            event.preventDefault();
            const index = (nextIndex + CATEGORY_OPTIONS.length) % CATEGORY_OPTIONS.length;
            choose(index);
            buttons.current[index]?.focus();
          }
        }}
      >
        {CATEGORY_OPTIONS.map((option, index) => {
          const selected = field.value === option.value;
          return (
            <button
              key={option.value}
              ref={(element) => { buttons.current[index] = element; }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected || (!field.value && index === 0) ? 0 : -1}
              onClick={() => choose(index)}
              className={cn(
                "min-h-11 rounded-full border px-4 text-sm font-medium",
                selected
                  ? "border-(--color-primary) bg-(--color-primary) text-(--color-on-primary)"
                  : "border-(--color-border-input) bg-(--color-bg) text-(--color-text) hover:bg-(--color-surface)",
                focusRing,
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {error && <p id={`${fieldsetId}-error`} className="mt-2 text-sm font-medium text-(--color-danger)">{error}</p>}
    </fieldset>
  );
}

function DescriptionField() {
  const [field, meta] = useField<string>("description");
  const id = useId();
  const error = meta.touched ? meta.error : undefined;
  const describedBy = [error ? `${id}-error` : null, `${id}-count`].filter(Boolean).join(" ");

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-(--color-text)">Description</label>
      <textarea
        {...field}
        id={id}
        maxLength={DESCRIPTION_MAX}
        rows={5}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className="min-h-32 w-full resize-y rounded-[var(--radius-md)] border border-[var(--color-border-input)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-focus)] aria-[invalid=true]:border-2 aria-[invalid=true]:border-[var(--color-danger)]"
      />
      {error && <p id={`${id}-error`} className="text-sm font-medium text-(--color-danger)">{error}</p>}
      <p id={`${id}-count`} className="text-right text-sm text-(--color-text-muted)">
        {(field.value ?? "").length} / {DESCRIPTION_MAX}
      </p>
    </div>
  );
}

function LagosDateTimeFields() {
  const [startField, startMeta, startHelpers] = useField<string>("startsAt");
  const [endField, endMeta, endHelpers] = useField<string>("endsAt");
  const date = startField.value.slice(0, 10) || endField.value.slice(0, 10);
  const startTime = startField.value.slice(11, 16);
  const endTime = endField.value.slice(11, 16);
  const dateId = useId();

  function setDate(nextDate: string) {
    void startHelpers.setValue(`${nextDate}T${startTime}`);
    void endHelpers.setValue(`${nextDate}T${endTime}`);
  }

  function setTime(which: "start" | "end", time: string) {
    const next = `${date}T${time}`;
    if (which === "start") void startHelpers.setValue(next);
    else void endHelpers.setValue(next);
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
      <FormField label="Date" required className="col-span-2 sm:col-span-1">
        {(control) => (
          <input
            {...control}
            id={dateId}
            type="date"
            required
            value={date}
            onChange={(event) => setDate(event.currentTarget.value)}
            className={inputClass}
          />
        )}
      </FormField>
      <FormField label="Starts" error={startMeta.touched ? startMeta.error : undefined} required>
        {(control) => (
          <input
            {...control}
            name={startField.name}
            type="time"
            required
            value={startTime}
            onChange={(event) => setTime("start", event.currentTarget.value)}
            onBlur={startField.onBlur}
            className={inputClass}
          />
        )}
      </FormField>
      <FormField label="Ends" error={endMeta.touched ? endMeta.error : undefined} required>
        {(control) => (
          <input
            {...control}
            name={endField.name}
            type="time"
            required
            value={endTime}
            onChange={(event) => setTime("end", event.currentTarget.value)}
            onBlur={endField.onBlur}
            className={inputClass}
          />
        )}
      </FormField>
    </div>
  );
}

function SeatsField({ event }: { event?: FairEvent }) {
  const [field, meta, helpers] = useField<number | "">("seats");
  const inputRef = useRef<HTMLInputElement>(null);
  const isBelowTaken = event && typeof field.value === "number" && field.value < event.seatsTaken;
  const error = isBelowTaken
    ? `${event.seatsTaken} ${event.seatsTaken === 1 ? "seat is" : "seats are"} already taken. Choose ${event.seatsTaken} or more.`
    : meta.error && (meta.touched || meta.initialValue !== field.value)
      ? meta.error
      : undefined;

  function step(amount: number) {
    const current = typeof field.value === "number" ? field.value : SEATS_MIN;
    void helpers.setValue(Math.min(SEATS_MAX, Math.max(SEATS_MIN, current + amount)));
    void helpers.setTouched(true, false);
  }

  return (
    <FormField label="Number of seats" error={error}>
      {(control) => (
        <div className="mx-auto flex max-w-sm items-center justify-center gap-3">
          <Button
            type="button"
            variant="secondary"
            iconOnly
            aria-label="Remove one seat"
            disabled={typeof field.value === "number" && field.value <= SEATS_MIN}
            onClick={() => step(-1)}
            className="size-11 rounded-full"
          >
            <Minus aria-hidden="true" className="size-4" />
          </Button>
          <input
            {...control}
            {...field}
            ref={inputRef}
            type="number"
            inputMode="numeric"
            min={SEATS_MIN}
            max={SEATS_MAX}
            step={1}
            required
            value={field.value}
            onChange={(event) => {
              const next = event.currentTarget.value;
              void helpers.setValue(next === "" ? "" : Number(next));
            }}
            onBlur={field.onBlur}
            className={cn(inputClass, "h-16 max-w-36 border-0 bg-transparent text-center text-4xl font-semibold tabular-nums focus-visible:outline-offset-0")}
          />
          <Button
            type="button"
            variant="secondary"
            iconOnly
            aria-label="Add one seat"
            disabled={typeof field.value === "number" && field.value >= SEATS_MAX}
            onClick={() => step(1)}
            className="size-11 rounded-full"
          >
            <Plus aria-hidden="true" className="size-4" />
          </Button>
        </div>
      )}
    </FormField>
  );
}

function EventPreview({
  values,
  event,
  organiser,
}: {
  values: EventFormValues;
  event?: FairEvent;
  organiser: Pick<User, "id" | "displayName"> | null;
}) {
  const category = values.category || event?.category || "TECH";
  const startsAt = fromLagosInput(values.startsAt);
  const endsAt = fromLagosInput(values.endsAt);
  const seats = typeof values.seats === "number" ? values.seats : null;
  const available = seats === null ? null : Math.max(0, seats - (event?.seatsTaken ?? 0));

  return (
    <article className="overflow-hidden rounded-[var(--radius-card)] border border-(--color-border) bg-(--color-bg)">
      <EventImage category={category} ratio="16 / 10" />
      <div className="flex flex-col gap-3 p-4">
        <p className="text-sm text-(--color-text-muted)">
          {startsAt && endsAt ? (
            <>
              <time dateTime={startsAt}>{formatDateTime(startsAt)}</time>
              {" – "}
              <time dateTime={endsAt}>{formatRangeEnd(startsAt, endsAt)}</time>
            </>
          ) : (
            "Date and time"
          )}
        </p>
        <h3 className="line-clamp-2 text-lg font-semibold leading-snug text-(--color-text)">
          {values.title.trim() || "Your event name"}
        </h3>
        <div className="flex min-w-0 items-center gap-2">
          <Avatar
            id={organiser?.id ?? event?.organiser.id ?? "preview"}
            name={organiser?.displayName ?? event?.organiser.displayName ?? "Organiser"}
            size={28}
            decorative
          />
          <p className="min-w-0 truncate text-sm text-(--color-text-muted)">
            {organiser?.displayName ?? event?.organiser.displayName ?? "Organiser"} · {values.location.trim() || "Area"}
          </p>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-(--color-text-muted)">
            {available === null
              ? "Seat status"
              : available === 0
                ? "Full · waitlist open"
                : `${available} ${available === 1 ? "seat" : "seats"} available`}
          </p>
          <span className="inline-flex min-h-9 items-center rounded-full bg-(--color-primary) px-4 text-sm font-medium text-(--color-on-primary)">
            Book
          </span>
        </div>
      </div>
    </article>
  );
}

function FocusFirstError({ formRef }: { formRef: RefObject<HTMLFormElement | null> }) {
  const { submitCount, isSubmitting, errors } = useFormikContext<EventFormValues>();
  const handledCount = useRef(0);

  useEffect(() => {
    if (isSubmitting || submitCount === handledCount.current) return;
    handledCount.current = submitCount;
    const first = EVENT_FIELDS.find((field) => errors[field]);
    const element =
      first === "category"
        ? formRef.current?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]') ??
          formRef.current?.querySelector<HTMLElement>('[role="radio"]')
        : first
          ? formRef.current?.elements.namedItem(first)
          : null;
    if (element instanceof HTMLElement) element.focus();
  }, [submitCount, isSubmitting, errors, formRef]);

  return null;
}
