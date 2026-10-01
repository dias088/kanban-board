import type { ApiErrorBody, AuthResponse } from '@kanban/shared';

/**
 * Requests go to /api on the current origin. Vite proxies that in development
 * and vercel.json rewrites it in production, so the refresh cookie is always
 * same-site and never a third-party cookie that Safari would drop.
 */
const API_PREFIX = '/api';

/**
 * The access token lives in memory only. localStorage would expose it to any
 * injected script, and it is not needed across reloads: the httpOnly refresh
 * cookie is what restores the session on boot.
 */
let accessToken: string | null = null;

export const setAccessToken = (token: string | null): void => {
  accessToken = token;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, string[] | undefined>;

  constructor(status: number, body: ApiErrorBody['error']) {
    super(body.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code;
    this.details = body.details;
  }
}

/** Prefers the server's own wording and falls back when the request never landed. */
export const apiErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof ApiError ? error.message : fallback;

let onUnauthorized: (() => void) | null = null;

/** Called when a request stays unauthorised even after a refresh attempt. */
export const setUnauthorizedHandler = (handler: (() => void) | null): void => {
  onUnauthorized = handler;
};

let refreshInFlight: Promise<AuthResponse | null> | null = null;

/**
 * Refreshes the session, at most once at a time, and returns the new session or
 * null when the refresh cookie is missing or spent.
 *
 * Opening a board fires several queries together, so when the access token
 * expires they all get a 401 within milliseconds. Without this shared promise
 * each would call /refresh, token rotation would invalidate all but the first,
 * and the user would be thrown back to the login screen mid-session. The same
 * call restores the session on a page reload.
 */
export function refreshSession(): Promise<AuthResponse | null> {
  refreshInFlight ??= (async () => {
    try {
      const response = await fetch(`${API_PREFIX}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        return null;
      }

      const session = (await response.json()) as AuthResponse;
      setAccessToken(session.accessToken);
      return session;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

function send(path: string, options: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = {};

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  return fetch(`${API_PREFIX}${path}`, {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  });
}

async function toApiError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as ApiErrorBody;
    return new ApiError(response.status, body.error);
  } catch {
    return new ApiError(response.status, {
      code: 'UNKNOWN',
      message: `Request failed with status ${response.status}`,
    });
  }
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response = await send(path, options);

  // The auth routes are excluded: a failed login must not trigger a refresh,
  // and /refresh retrying itself would loop.
  if (response.status === 401 && !path.startsWith('/auth/')) {
    if (await refreshSession()) {
      response = await send(path, options);
    }

    if (response.status === 401) {
      onUnauthorized?.();
    }
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
