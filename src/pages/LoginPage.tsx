// LoginPage: sign in with a demonstration account.
//
// - Formik + Yup check the fields before anything is sent (rules from lib/validation).
// - POST /sessions (useCreateSessionMutation) → signIn(session) → back to the page the user came from (default /events).
//   Already signed in → straight there.
// - VALIDATION_FAILED puts each message on its field; any other failure shows a
//   role="alert" box with the service's message and "Reference: <requestId>".
// - Mock only (IS_MOCK): "Sign in as" swaps the mock session's role, because Prism
//   always returns the same example user.

import { Form, Formik, useFormikContext, type FormikHelpers } from "formik";
import { useEffect, useRef, useState, type RefObject } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import * as Yup from "yup";
import { ApiError, IS_MOCK, toApiError } from "../api/client";
import type { Role, Session } from "../api/types";
import { useAuth } from "../auth/useAuth";
import { applyApiError } from "../components/form/applyApiError";
import { FormAlert } from "../components/form/FormAlert";
import { FormikField } from "../components/form/FormikField";
import { emailAddress, password } from "../lib/validation";
import { Button } from "../shared/ui/button";
import { Card, CardBody, CardHeader } from "../shared/ui/card";
import { FormField } from "../shared/ui/form-field";
import { Select, type SelectOption } from "../shared/ui/select";
import { useCreateSessionMutation } from "../features/auth/sessionApi";

type LoginValues = { email: string; password: string };

const LOGIN_FIELDS = ["email", "password"] as const satisfies readonly (keyof LoginValues)[];

const initialValues: LoginValues = { email: "", password: "" };

const loginSchema = Yup.object({ email: emailAddress(), password: password() });

const DEFAULT_RETURN = "/events";

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

/**
 * Where to go after sign-in: the page RequireAuth (or the Navbar) sent us from.
 * Only a path inside this app ("/…", not "//…" which would leave the site), and never /login itself.
 */
function returnPath(state: unknown): string {
  if (typeof state !== "object" || state === null || !("from" in state)) return DEFAULT_RETURN;
  const from = state.from;
  if (typeof from !== "object" || from === null || !("pathname" in from)) return DEFAULT_RETURN;
  const { pathname } = from;
  if (typeof pathname !== "string" || !pathname.startsWith("/") || pathname.startsWith("//")) return DEFAULT_RETURN;
  if (pathname === "/login") return DEFAULT_RETURN;
  const search = "search" in from && typeof from.search === "string" ? from.search : "";
  const hash = "hash" in from && typeof from.hash === "string" ? from.hash : "";
  return pathname + search + hash;
}

export default function LoginPage() {
  const { user, signIn, notice } = useAuth();
  const [createSession] = useCreateSessionMutation();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<ApiError | null>(null);
  const [unmapped, setUnmapped] = useState<Record<string, string>>({});
  const [mockRole, setMockRole] = useState<MockRole>("ATTENDEE");
  const formRef = useRef<HTMLFormElement>(null);

  const target = returnPath(location.state);

  if (user) return <Navigate to={target} replace />;

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
      if (error.code === "VALIDATION_FAILED") {
        const rest = applyApiError(error, LOGIN_FIELDS, helpers.setFieldError);
        // Show the box too when some (or all) messages had no field to sit under.
        if (Object.keys(rest).length > 0 || Object.keys(error.fieldErrors).length === 0) {
          setUnmapped(rest);
          setFormError(error);
        }
        return;
      }
      // INVALID_CREDENTIALS, NETWORK_ERROR, TIMEOUT, INTERNAL_ERROR, …:
      // the message is written for users, so show it as is.
      setFormError(error);
    }
  }

  return (
    <main className="flex min-h-[calc(100dvh-4.5rem)] items-start justify-center bg-(--color-bg) px-4 py-10 sm:items-center sm:py-16">
      {/* Card always draws an image placeholder when no image is given; hide it here. */}
      <Card className="w-full max-w-md shadow-sm [&>div:first-child]:hidden">
        <div className="p-2 sm:p-4">
          <CardHeader className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Sign in to FairSeat</h1>
            <p className="mt-2 text-(--color-text-muted)">Sign up for meetups and manage your seats.</p>
          </CardHeader>

          <CardBody>
            {notice && !formError && (
              <div
                role="status"
                className="mb-5 rounded-md border border-l-4 border-(--color-border) border-l-(--color-primary) bg-(--color-surface) p-3 text-sm"
              >
                {notice}
              </div>
            )}

            <FormAlert error={formError} issues={unmapped} className="mb-5" />

            <Formik<LoginValues> initialValues={initialValues} validationSchema={loginSchema} onSubmit={handleSubmit}>
              {({ isSubmitting, isValidating }) => {
                // Busy only while the request is in flight, not during the quick validation pass.
                const busy = isSubmitting && !isValidating;
                return (
                  <Form ref={formRef} noValidate className="flex flex-col gap-5">
                    <FocusFirstError formRef={formRef} />

                    <FormikField name="email" label="Email" type="email" autoComplete="email" required />

                    <FormikField
                      name="password"
                      label="Password"
                      type="password"
                      autoComplete="current-password"
                      required
                    />

                    {IS_MOCK && (
                      <div className="rounded-md border border-dashed border-(--color-warning) bg-(--color-warning-subtle) p-3">
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

                    {/* loading keeps focus on the button (aria-disabled) and blocks a second submit. */}
                    <Button type="submit" size="lg" loading={busy} className="mt-1 w-full">
                      Sign in
                    </Button>
                  </Form>
                );
              }}
            </Formik>
          </CardBody>
        </div>
      </Card>
    </main>
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
