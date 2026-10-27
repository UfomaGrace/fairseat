// One place where every call to the service is made. It adds the agreed headers:
//   Authorization: Bearer <token>   passed in by the caller (baseApi reads it from the store)
//   X-Request-Id: <uuid>            new on every call, shown in errors as "Reference: ..."
//   Prefer: code=<n>                mock only, to pick one response when the contract has several
// and turns every failure into an ApiError the screens can switch on (error.code).

import type { ApiErrorCode } from './types';

export type ClientErrorCode = ApiErrorCode | 'NETWORK_ERROR' | 'TIMEOUT' | 'UNEXPECTED_RESPONSE';

export class ApiError extends Error {
  readonly status: number;
  readonly code: ClientErrorCode;
  readonly requestId: string;
  readonly details: Record<string, unknown>;

  constructor(init: {
    status: number;
    code: ClientErrorCode;
    message: string;
    requestId: string;
    details?: Record<string, unknown>;
  }) {
    super(init.message);
    this.name = 'ApiError';
    this.status = init.status;
    this.code = init.code;
    this.requestId = init.requestId;
    this.details = init.details ?? {};
  }

  /** True when we could not tell whether the service received the request. */
  get isConnectionProblem(): boolean {
    return this.code === 'NETWORK_ERROR' || this.code === 'TIMEOUT';
  }

  /** VALIDATION_FAILED only: field name → message, ready for Formik's setErrors. Empty otherwise. */
  get fieldErrors(): Record<string, string> {
    if (this.code !== 'VALIDATION_FAILED') return {};
    const errors: Record<string, string> = {};
    for (const [field, message] of Object.entries(this.details)) {
      if (typeof message === 'string') errors[field] = message;
    }
    return errors;
  }
}

/** An ApiError as plain data, the shape baseApi returns (Redux state must be serializable). */
export interface ApiErrorData {
  code: ClientErrorCode;
  message: string;
  requestId: string;
  details?: Record<string, unknown>;
}

export interface ApiErrorResult {
  status: number;
  data: ApiErrorData;
}

function isApiErrorResult(value: unknown): value is ApiErrorResult {
  if (typeof value !== 'object' || value === null) return false;
  if (!('status' in value) || typeof value.status !== 'number') return false;
  if (!('data' in value) || typeof value.data !== 'object' || value.data === null) return false;
  const data = value.data;
  return (
    'code' in data &&
    typeof data.code === 'string' &&
    'message' in data &&
    typeof data.message === 'string' &&
    'requestId' in data &&
    typeof data.requestId === 'string'
  );
}

/** Accepts an ApiError, or what an RTK Query hook's .unwrap() throws ({ status, data }). */
export function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e;
  if (isApiErrorResult(e)) return new ApiError({ status: e.status, ...e.data });
  return new ApiError({
    status: 0,
    code: 'INTERNAL_ERROR',
    message: 'Something unexpected happened in the app. Please try again.',
    requestId: '—',
  });
}

const BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

/** True when pointing at the Prism mock. Enables the mock-only controls; never true in production. */
export const IS_MOCK = import.meta.env.VITE_MOCK === 'true';

let forcedMockCode: number | null = null;

/** Mock only: ask Prism for this status code on every call (`Prefer: code=409`). */
export function setForcedMockCode(code: number | null): void {
  forcedMockCode = code;
}

export function getForcedMockCode(): number | null {
  return forcedMockCode;
}

export function newId(): string {
  return crypto.randomUUID();
}

type QueryValue = string | number | boolean | undefined | null;
export type QueryMap = Record<string, QueryValue>;

/**
 * Who may call the operation (from `security` in the yaml):
 *   'none'      never send the token (sign in, health)
 *   'optional'  public, but send the token when signed in (events)
 *   'required'  must be signed in; fails at once with UNAUTHENTICATED when there is no token
 */
export type AuthMode = 'none' | 'optional' | 'required';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH';
  query?: QueryMap;
  body?: unknown;
  signal?: AbortSignal;
  /** Default 'required'. */
  auth?: AuthMode;
  /** The signed-in user's token, or null when signed out. Sent unless auth is 'none'. */
  token?: string | null;
  /** Mock only: status Prism should return when no code is forced. */
  mockPreferCode?: number;
  timeoutMs?: number;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  requestId: string;
  headers: Headers;
}

interface ErrorFields {
  code: ApiErrorCode;
  message: string;
  requestId?: string;
  details?: Record<string, unknown>;
}

function readErrorBody(value: unknown): ErrorFields | null {
  if (typeof value !== 'object' || value === null) return null;
  if (!('code' in value) || typeof value.code !== 'string') return null;
  if (!('message' in value) || typeof value.message !== 'string') return null;
  const requestId = 'requestId' in value && typeof value.requestId === 'string' ? value.requestId : undefined;
  const details =
    'details' in value && typeof value.details === 'object' && value.details !== null && !Array.isArray(value.details)
      ? Object.fromEntries(Object.entries(value.details))
      : undefined;
  // The contract lists every code the service sends, so we trust the string here.
  return { code: value.code as ApiErrorCode, message: value.message, requestId, details };
}

function fallbackMessage(status: number): string {
  if (status === 400) return 'Some fields need attention.';
  if (status === 401) return 'Sign in to continue.';
  if (status === 403) return 'You do not have permission to do this.';
  if (status === 404) return 'We could not find that.';
  if (status === 409) return 'This changed while you were looking at it. Refresh and try again.';
  if (status >= 500) return 'Something went wrong on our side. Please try again.';
  return 'The request could not be completed.';
}

function fallbackCode(status: number): ClientErrorCode {
  if (status === 400) return 'VALIDATION_FAILED';
  if (status === 401) return 'UNAUTHENTICATED';
  if (status === 404) return 'NOT_FOUND';
  if (status >= 500) return 'INTERNAL_ERROR';
  return 'UNEXPECTED_RESPONSE';
}

export async function apiFetch<T>(path: string, opts: RequestOptions = {}): Promise<ApiResponse<T>> {
  const requestId = newId();
  const auth = opts.auth ?? 'required';
  const token = opts.token ?? null;

  if (auth === 'required' && !token) {
    throw new ApiError({ status: 401, code: 'UNAUTHENTICATED', message: fallbackMessage(401), requestId });
  }

  const url = new URL(BASE_URL + path, window.location.origin);
  for (const [key, value] of Object.entries(opts.query ?? {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }

  const headers = new Headers({ Accept: 'application/json', 'X-Request-Id': requestId });
  if (opts.body !== undefined) headers.set('Content-Type', 'application/json');
  if (auth !== 'none' && token) headers.set('Authorization', `Bearer ${token}`);
  if (IS_MOCK) {
    const code = forcedMockCode ?? opts.mockPreferCode;
    if (code) headers.set('Prefer', `code=${code}`);
  }

  // Our own timeout, plus the caller's signal (a screen that unmounts cancels its reads).
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 30_000);
  const outer = opts.signal;
  if (outer) {
    if (outer.aborted) controller.abort();
    else outer.addEventListener('abort', () => controller.abort(), { once: true });
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    if (outer?.aborted) throw e; // cancelled by the screen; nobody is waiting for an answer
    const timedOut = controller.signal.aborted;
    throw new ApiError({
      status: 0,
      code: timedOut ? 'TIMEOUT' : 'NETWORK_ERROR',
      message: timedOut
        ? 'The service took too long to answer. Check your connection and try again.'
        : 'Could not reach the FairSeat service. Check your connection and try again.',
      requestId,
    });
  }
  clearTimeout(timer);

  const echoedId = res.headers.get('X-Request-Id') ?? requestId;
  const text = await res.text().catch(() => '');
  let json: unknown = undefined;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = undefined;
    }
  }

  if (!res.ok) {
    const body = readErrorBody(json);
    throw new ApiError({
      status: res.status,
      code: body?.code ?? fallbackCode(res.status),
      message: body?.message ?? fallbackMessage(res.status),
      requestId: body?.requestId ?? echoedId,
      details: body?.details,
    });
  }

  return { data: json as T, status: res.status, requestId: echoedId, headers: res.headers };
}
