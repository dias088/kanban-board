import type { Response } from 'supertest';
import { REFRESH_COOKIE_NAME } from '../lib/cookies';

export const credentials = {
  email: 'grace@example.com',
  password: 'correct-horse-battery',
  name: 'Grace Hopper',
};

export function setCookieHeaders(response: Response): string[] {
  const raw: unknown = response.headers['set-cookie'];

  if (Array.isArray(raw)) {
    return raw as string[];
  }

  return typeof raw === 'string' ? [raw] : [];
}

/** The full Set-Cookie line for the refresh cookie, attributes included. */
export function refreshCookieHeader(response: Response): string {
  const header = setCookieHeaders(response).find((value) =>
    value.startsWith(`${REFRESH_COOKIE_NAME}=`),
  );

  if (!header) {
    throw new Error('Response did not set a refresh cookie');
  }

  return header;
}

/** Just the `name=value` pair, ready to be sent back via .set('Cookie', ...). */
export function refreshCookie(response: Response): string {
  const pair = refreshCookieHeader(response).split(';')[0];

  if (!pair) {
    throw new Error('Refresh cookie had no value');
  }

  return pair;
}
