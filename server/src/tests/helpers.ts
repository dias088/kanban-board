import type { Express } from 'express';
import request, { type Response } from 'supertest';
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

function expectStatus(response: Response, status: number, what: string): void {
  if (response.status !== status) {
    throw new Error(`${what} failed: ${response.status} ${JSON.stringify(response.body)}`);
  }
}

/** Registers an account and returns a bearer token for it. */
export async function signUp(app: Express, email: string = credentials.email): Promise<string> {
  const response = await request(app)
    .post('/api/auth/register')
    .send({ ...credentials, email });

  expectStatus(response, 201, `sign up as ${email}`);

  return response.body.accessToken as string;
}

export async function createBoard(app: Express, token: string, title = 'Roadmap'): Promise<string> {
  const response = await request(app)
    .post('/api/boards')
    .set('Authorization', `Bearer ${token}`)
    .send({ title });

  expectStatus(response, 201, 'create board');

  return response.body.id as string;
}

export async function createColumn(
  app: Express,
  token: string,
  boardId: string,
  title = 'Todo',
): Promise<string> {
  const response = await request(app)
    .post(`/api/boards/${boardId}/columns`)
    .set('Authorization', `Bearer ${token}`)
    .send({ title });

  expectStatus(response, 201, 'create column');

  return response.body.id as string;
}

export async function createCard(
  app: Express,
  token: string,
  columnId: string,
  title = 'Write the README',
): Promise<string> {
  const response = await request(app)
    .post(`/api/columns/${columnId}/cards`)
    .set('Authorization', `Bearer ${token}`)
    .send({ title });

  expectStatus(response, 201, 'create card');

  return response.body.id as string;
}

interface BoardSnapshot {
  columnTitles: string[];
  cardTitlesByColumn: string[][];
}

/** Reads the board back and flattens it into something easy to assert on. */
export async function readBoard(
  app: Express,
  token: string,
  boardId: string,
): Promise<BoardSnapshot & { raw: Response }> {
  const response = await request(app)
    .get(`/api/boards/${boardId}`)
    .set('Authorization', `Bearer ${token}`);

  expectStatus(response, 200, 'read board');

  const columns = response.body.columns as { title: string; cards: { title: string }[] }[];

  return {
    raw: response,
    columnTitles: columns.map((column) => column.title),
    cardTitlesByColumn: columns.map((column) => column.cards.map((card) => card.title)),
  };
}
