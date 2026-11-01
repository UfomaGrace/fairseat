// LoginPage: sign in with a demonstration account.
//
// - Its own frame (not Layout): a header with the logo and "Explore events", a seat pattern
//   behind, and the form in a white panel. Phone: seats are a strip at the top and the form is
//   a sheet filling the rest. From 768px: seats fill the page and the panel is centred, with a
//   24px halo in the page colour so no seat touches it. From 1100px: a "seat opened up" note.
// - Formik + Yup check the fields before anything is sent (rules from lib/validation).
// - POST /sessions (useCreateSessionMutation) → signIn(session) → ?returnTo= if it's a safe
//   internal path, else the page a guard sent us from (state.from), else /events.
//   Already signed in → straight there.
// - 401 INVALID_CREDENTIALS: an error under Password, the email kept, focus on Password. The
//   error stays until either field changes (validate below), so a blur doesn't wipe it.
// - VALIDATION_FAILED puts each message on its field. No connection: "You're offline…" with
//   Retry. Anything else: a role="alert" box with the service's message and "Reference: <requestId>".
// - While the request is in flight the inputs are read-only and the button reads "Signing in…".
// - Mock only (IS_MOCK): "Sign in as" swaps the mock session's role, because Prism
//   always returns the same example user.

import { Form, Formik, useFormikContext, type FormikHelpers } from "formik";
import { useEffect, useRef, useState, type RefObject } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router";
import * as Yup from "yup";
import { ApiError, IS_MOCK, toApiError } from "../api/client";
import type { Role, Session } from "../api/types";
import { safeReturnPath } from "../auth/returnPath";
import { useAuth } from "../auth/useAuth";
import { FairSeatLogo } from "../components/FairSeatLogo";
import { applyApiError } from "../components/form/applyApiError";
import { FormAlert } from "../components/form/FormAlert";
import { FormikField } from "../components/form/FormikField";
import { emailAddress, password } from "../lib/validation";
import { cn } from "../lib/cn";
import { Button } from "../components/ui/button";
import { FormField } from "../components/ui/form-field";
import { Select, type SelectOption } from "../components/ui/select";
import { useCreateSessionMutation } from "../features/auth/sessionApi";

// Not built yet. Flip these on when the pages exist.
const SHOW_FORGOT_PASSWORD = false;
const SHOW_SIGN_UP = false;

type LoginValues = { email: string; password: string };

const LOGIN_FIELDS = ["email", "password"] as const satisfies readonly (keyof LoginValues)[];

const initialValues: LoginValues = { email: "", password: "" };

const loginSchema = Yup.object({ email: emailAddress(), password: password() });

const DEFAULT_RETURN = "/events";

const WRONG_CREDENTIALS = "That email and password don't match. Try again.";
const OFFLINE = "You're offline. Check your connection and try again.";

type MockRole = Extract<Role, "ATTENDEE" | "ORGANISER">;

const MOCK_ROLE_OPTIONS = [
  { value: "ATTENDEE", label: "Attendee" },
  { value: "ORGANISER", label: "Organiser" },
] as const satisfies readonly (SelectOption & { value: MockRole })[];

function isMockRole(value: string | undefined): value is MockRole {
  return MOCK_ROLE_OPTIONS.some((o) => o.value === value);
}

const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;

/**
 * Mock only: give Prism's example user the chosen role (and a matching demo name).
 * Prism's expiresAt is a fixed example date that may already be past, which would sign
 * us out at once, so the mock session gets the real rule instead: 8 hours from now.
 */
function withMockRole(session: Session, role: MockRole): Session {
  const expiresAt = new Date(Date.now() + EIGHT_HOURS_MS).toISOString();
  if (role === "ATTENDEE") return { ...session, expiresAt, user: { ...session.user, role } };
  return {
    ...session,
    expiresAt,
    user: { ...session.user, role, displayName: "Tolu Adebayo (demo)", email: "tolu.organiser@fairseat.demo" },
  };
}

/** The page a guard (RequireAuth, the header's Sign in) sent us from, as "/path?query#hash". */
function pathFromState(state: unknown): string | null {
  if (typeof state !== "object" || state === null || !("from" in state)) return null;
  const from = state.from;
  if (typeof from !== "object" || from === null || !("pathname" in from)) return null;
  const pathname = typeof from.pathname === "string" ? from.pathname : "";
  const search = "search" in from && typeof from.search === "string" ? from.search : "";
  const hash = "hash" in from && typeof from.hash === "string" ? from.hash : "";
  return pathname + search + hash;
}

const focusRing =
  "focus-visible:outline-(length:--focus-ring-width) focus-visible:outline-offset-(--focus-ring-offset) focus-visible:outline-(--color-focus) focus-visible:outline-solid";

export default function LoginPage() {
  const { user, signIn, notice } = useAuth();
  const [createSession] = useCreateSessionMutation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [formError, setFormError] = useState<ApiError | null>(null);
  const [unmapped, setUnmapped] = useState<Record<string, string>>({});
  // The email + password the service just rejected; see validate below.
  const [rejected, setRejected] = useState<LoginValues | null>(null);
  const [mockRole, setMockRole] = useState<MockRole>("ATTENDEE");
  const formRef = useRef<HTMLFormElement>(null);

  const target =
    safeReturnPath(searchParams.get("returnTo")) ?? safeReturnPath(pathFromState(location.state)) ?? DEFAULT_RETURN;

  if (user) return <Navigate to={target} replace />;

  // Runs alongside the Yup schema (Formik merges both), so the "don't match" error survives
  // blur and re-validation until the user changes the email or the password.
  function validate(values: LoginValues) {
    if (rejected && values.email === rejected.email && values.password === rejected.password) {
      return { password: WRONG_CREDENTIALS };
    }
    return {};
  }

  async function handleSubmit(values: LoginValues, helpers: FormikHelpers<LoginValues>) {
    setFormError(null);
    setUnmapped({});
    try {
      // unwrap() returns the data, or throws the endpoint's { status, data } error.
      const session = await createSession({ email: values.email.trim(), password: values.password }).unwrap();
      signIn(IS_MOCK ? withMockRole(session, mockRole) : session);
      navigate(target, { replace: true });
    } catch (e) {
      const error = toApiError(e);
      if (error.code === "INVALID_CREDENTIALS") {
        // FocusFirstError then moves focus to Password, the first field with an error.
        setRejected(values);
        helpers.setFieldError("password", WRONG_CREDENTIALS);
        return;
      }
      if (error.code === "VALIDATION_FAILED") {
        const rest = applyApiError(error, LOGIN_FIELDS, helpers.setFieldError);
        // Show the box too when some (or all) messages had no field to sit under.
        if (Object.keys(rest).length > 0 || Object.keys(error.fieldErrors).length === 0) {
          setUnmapped(rest);
          setFormError(error);
        }
        return;
      }
      // NETWORK_ERROR, TIMEOUT, INTERNAL_ERROR, …: the message is written for users.
      setFormError(error);
    }
  }

  return (
    <div className="relative isolate flex min-h-dvh flex-col bg-(--color-surface) font-(family-name:--font-sans) text-(--color-text)">
      <SeatPattern />

      <header className="flex items-center justify-between gap-4 px-4 py-2 md:px-8 md:py-5">
        <Link to="/events" className={cn("flex min-h-11 items-center rounded-(--radius-sm)", focusRing)}>
          <FairSeatLogo size={24} withWordmark />
        </Link>
        <Link
          to="/events"
          className={cn(
            "flex min-h-11 items-center rounded-(--radius-md) px-3 text-sm font-medium text-(--color-text-muted) hover:text-(--color-text)",
            focusRing,
          )}
        >
          Explore events
        </Link>
      </header>

      <main className="flex flex-1 flex-col pt-12 md:items-center md:justify-center md:px-8 md:pt-6 md:pb-20">
        <div className="relative flex flex-1 flex-col md:w-full md:max-w-110 md:flex-none">
          <section
            aria-labelledby="login-title"
            className={cn(
              "flex flex-1 flex-col rounded-t-[28px] bg-(--color-bg) px-5 pt-8 pb-6 sm:px-8",
              "md:rounded-[28px] md:border md:border-(--color-border) md:p-10 md:shadow-[0_0_0_24px_var(--color-surface)]",
            )}
          >
            <h1 id="login-title" className="text-[1.75rem] leading-tight font-semibold">
              Welcome back
            </h1>
            <p className="mt-1.5 text-sm text-(--color-text-muted)">Sign in to book seats and see your offers.</p>

            {notice && !formError && (
              <div
                role="status"
                className="mt-6 rounded-md border border-l-4 border-(--color-border) border-l-(--color-primary) bg-(--color-bg) p-3 text-sm"
              >
                {notice}
              </div>
            )}

            <Formik<LoginValues>
              initialValues={initialValues}
              validationSchema={loginSchema}
              validate={validate}
              onSubmit={handleSubmit}
            >
              {({ isSubmitting, isValidating, submitForm }) => {
                // Busy only while the request is in flight, not during the quick validation pass.
                const busy = isSubmitting && !isValidating;
                // Read-only fields look settled, like the design's grey inputs.
                const settled = busy ? "[&_input]:bg-(--color-surface) [&_input]:text-(--color-text-muted)" : undefined;
                return (
                  <Form ref={formRef} noValidate className="mt-7 flex flex-1 flex-col">
                    <FocusFirstError formRef={formRef} />

                    <FormAlert
                      error={formError}
                      message={formError?.code === "NETWORK_ERROR" ? OFFLINE : undefined}
                      issues={unmapped}
                      className="mb-5"
                    >
                      {formError?.isConnectionProblem && (
                        <Button
                          variant="secondary"
                          className="mt-3 min-h-11"
                          onClick={() => void submitForm()}
                        >
                          Retry
                        </Button>
                      )}
                    </FormAlert>

                    <div className="flex flex-col gap-5">
                      <FormikField
                        name="email"
                        label="Email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        readOnly={busy}
                        className={settled}
                      />

                      <div className="flex flex-col gap-2">
                        <FormikField
                          name="password"
                          label="Password"
                          type="password"
                          autoComplete="current-password"
                          revealable
                          capsLockHint
                          readOnly={busy}
                          className={settled}
                        />
                        {SHOW_FORGOT_PASSWORD && (
                          <Link
                            to="/forgot-password"
                            className={cn(
                              "self-end rounded-(--radius-sm) text-sm font-medium text-(--color-copper) underline-offset-4 hover:underline",
                              focusRing,
                            )}
                          >
                            Forgot password?
                          </Link>
                        )}
                      </div>
                    </div>

                    {IS_MOCK && (
                      <div className="mt-5 rounded-md border border-dashed border-(--color-warning) bg-(--color-copper-wash) p-3">
                        <p className="mb-2 text-sm font-semibold text-(--color-text)">
                          Mock server only: simulated sign-in
                        </p>
                        <FormField
                          label="Sign in as"
                          hint="Any valid email and password work on the mock. Not shown when connected to the real service."
                        >
                          {(field) => (
                            <Select
                              {...field}
                              className="min-h-11"
                              options={[...MOCK_ROLE_OPTIONS]}
                              value={mockRole}
                              onValueChange={(next) => {
                                if (isMockRole(next)) setMockRole(next);
                              }}
                            />
                          )}
                        </FormField>
                      </div>
                    )}

                    {/* loading keeps focus on the button (aria-disabled) and blocks a second submit.
                        The shared Button hides its label and shows a bare spinner while loading; the two
                        aria-busy classes show our own spinner + "Signing in…" instead. */}
                    <Button
                      type="submit"
                      size="lg"
                      loading={busy}
                      className="mt-7 w-full rounded-full aria-busy:[&>span+span]:hidden aria-busy:[&>span:first-child]:opacity-100"
                    >
                      {busy ? (
                        <>
                          <span
                            aria-hidden="true"
                            className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
                          />
                          Signing in…
                        </>
                      ) : (
                        "Sign in"
                      )}
                    </Button>

                    <p className="mt-auto pt-10 text-center text-sm text-(--color-text-muted) md:pt-8">
                      {SHOW_SIGN_UP ? (
                        <>
                          New to FairSeat?{" "}
                          <Link
                            to="/sign-up"
                            className={cn(
                              "rounded-(--radius-sm) font-medium text-(--color-copper) underline-offset-4 hover:underline",
                              focusRing,
                            )}
                          >
                            Create an account
                          </Link>
                        </>
                      ) : (
                        "Trouble signing in? Contact your organiser."
                      )}
                    </p>
                  </Form>
                );
              }}
            </Formik>
          </section>

          <SeatOpenedNote />
        </div>
      </main>
    </div>
  );
}

/** After each submit attempt (client or server errors), move focus to the first invalid field. */
function FocusFirstError({ formRef }: { formRef: RefObject<HTMLFormElement | null> }) {
  const { submitCount, isSubmitting, errors } = useFormikContext<LoginValues>();
  const handledCount = useRef(0);

  useEffect(() => {
    if (isSubmitting || submitCount === handledCount.current) return;
    handledCount.current = submitCount;
    const first = LOGIN_FIELDS.find((f) => errors[f]);
    const el = first ? formRef.current?.elements.namedItem(first) : null;
    if (el instanceof HTMLElement) el.focus();
  }, [submitCount, isSubmitting, errors, formRef]);

  return null;
}

// ---- Decoration (aria-hidden) ----

// One seat per 36×28px tile, drawn by a CSS mask so the colour comes from the tokens.
const SEAT_W = 36;
const SEAT_H = 28;
const SEAT_MASK = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${SEAT_W}" height="${SEAT_H}"><rect x="5" y="5" width="26" height="18" rx="5"/></svg>`,
)}")`;

type Seat = { col: number; row: number; copper?: boolean };

// Phone: a short strip, tints down the left edge, the copper seat just under "Explore events".
const PHONE_SEATS: readonly Seat[] = [
  { col: 0, row: 1 },
  { col: 0, row: 2 },
  { col: 0, row: 3 },
  { col: 0, row: 4 },
  { col: 7, row: 2, copper: true },
];

// 768px and up: a few tints scattered around the panel, the copper seat to its left.
const WIDE_SEATS: readonly Seat[] = [
  { col: 3, row: 5 },
  { col: 4, row: 5 },
  { col: 30, row: 3 },
  { col: 31, row: 3 },
  { col: 6, row: 24 },
  { col: 34, row: 22 },
  { col: 35, row: 22 },
  { col: 9, row: 17, copper: true },
];

function SeatPattern() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-40 overflow-hidden animate-[seat-fade-in_700ms_ease-out_both] motion-reduce:animate-none md:inset-y-0 md:h-auto"
    >
      <div
        className="absolute inset-0 bg-(--color-border)"
        style={{ maskImage: SEAT_MASK, maskSize: `${SEAT_W}px ${SEAT_H}px`, maskRepeat: "repeat" }}
      />
      <SeatSet seats={PHONE_SEATS} className="md:hidden" />
      <SeatSet seats={WIDE_SEATS} className="hidden md:block" />
    </div>
  );
}

function SeatSet({ seats, className }: { seats: readonly Seat[]; className: string }) {
  return (
    <div className={className}>
      {seats.map(({ col, row, copper }) => (
        <span
          key={`${col}-${row}`}
          className={cn(
            "absolute h-4.5 w-6.5 rounded-[5px]",
            copper
              ? "bg-(--color-copper) animate-[seat-pulse_1.4s_ease-out_700ms_1] motion-reduce:animate-none"
              : "bg-(--color-copper-wash)",
          )}
          style={{ left: col * SEAT_W + 5, top: row * SEAT_H + 5 }}
        />
      ))}
    </div>
  );
}

/** "A seat opened up": a sample offer floating beside the panel. Wide screens only, decorative. */
function SeatOpenedNote() {
  return (
    <div
      aria-hidden="true"
      className="absolute top-14 left-[calc(100%-2.5rem)] hidden -rotate-3 items-center gap-3 rounded-2xl border border-(--color-border) bg-(--color-bg) py-3 pr-5 pl-3 shadow-[0_10px_30px_rgb(17_17_17/0.08)] min-[1100px]:flex"
    >
      <span className="flex size-8 items-center justify-center rounded-full bg-(--color-copper-wash)">
        <span className="h-2.5 w-3.5 rounded-[3px] bg-(--color-copper)" />
      </span>
      <span className="flex flex-col whitespace-nowrap">
        <span className="text-sm font-medium">A seat opened up</span>
        <span className="text-xs font-medium text-(--color-copper)">23h left to accept</span>
      </span>
    </div>
  );
}
