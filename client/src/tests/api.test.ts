import { beforeEach, describe, expect, it, vi } from 'vitest';

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const unauthorized = () => json({ error: { code: 'UNAUTHORIZED', message: 'expired' } }, 401);

describe('apiFetch', () => {
  beforeEach(() => {
    // The access token and the in-flight refresh are module state
    vi.resetModules();
  });

  it('shares a single refresh between requests that race into a 401', async () => {
    let refreshCalls = 0;
    let protectedCalls = 0;

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).includes('/auth/refresh')) {
          refreshCalls += 1;
          // Hold the refresh open so the second request really does race
          await sleep(10);
          return json({ accessToken: 'fresh', user: { id: 'u1' } }, 200);
        }

        protectedCalls += 1;
        return protectedCalls <= 2 ? unauthorized() : json([], 200);
      }),
    );

    const { apiFetch } = await import('@/lib/api');

    const results = await Promise.all([
      apiFetch<unknown[]>('/boards'),
      apiFetch<unknown[]>('/boards'),
    ]);

    // Token rotation means a second refresh would revoke the first one and
    // kick the user out, so exactly one call is the whole point
    expect(refreshCalls).toBe(1);
    expect(results).toEqual([[], []]);
    expect(protectedCalls).toBe(4);
  });

  it('never refreshes because an auth route itself returned 401', async () => {
    let refreshCalls = 0;

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).includes('/auth/refresh')) {
          refreshCalls += 1;
        }

        return json({ error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } }, 401);
      }),
    );

    const { apiFetch, ApiError } = await import('@/lib/api');

    await expect(apiFetch('/auth/login', { method: 'POST', body: {} })).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(refreshCalls).toBe(0);
  });

  it('reports a dead session once the refresh also fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => unauthorized()),
    );

    const { apiFetch, setUnauthorizedHandler } = await import('@/lib/api');
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);

    await expect(apiFetch('/boards')).rejects.toThrow();
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('surfaces the error code and details from the server envelope', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Request validation failed',
              details: { title: ['Title is required'] },
            },
          },
          400,
        ),
      ),
    );

    const { apiFetch, ApiError } = await import('@/lib/api');

    await expect(apiFetch('/boards', { method: 'POST', body: {} })).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      details: { title: ['Title is required'] },
    });

    const { ApiError: SameClass } = await import('@/lib/api');
    expect(SameClass).toBe(ApiError);
  });
});
