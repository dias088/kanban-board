import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { prisma } from '../prisma';
import { credentials, refreshCookie, refreshCookieHeader } from './helpers';

const app = createApp();

const registerUser = () => request(app).post('/api/auth/register').send(credentials);

describe('POST /api/auth/register', () => {
  it('creates an account and starts a session', async () => {
    const response = await registerUser();

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({
      email: credentials.email,
      name: credentials.name,
    });
    expect(typeof response.body.accessToken).toBe('string');

    // The password must never be echoed back in any form
    expect(JSON.stringify(response.body)).not.toContain(credentials.password);
    expect(response.body.user.passwordHash).toBeUndefined();
  });

  it('stores only a bcrypt hash of the password', async () => {
    await registerUser();

    const user = await prisma.user.findUnique({ where: { email: credentials.email } });

    expect(user?.passwordHash).toBeDefined();
    expect(user?.passwordHash).not.toBe(credentials.password);
    expect(user?.passwordHash.startsWith('$2')).toBe(true);
  });

  it('sets the refresh token as an httpOnly cookie scoped to /api/auth', async () => {
    const header = refreshCookieHeader(await registerUser());

    expect(header).toContain('HttpOnly');
    expect(header).toContain('SameSite=Lax');
    expect(header).toContain('Path=/api/auth');
  });

  it('stores only a hash of the refresh token, never the token itself', async () => {
    const response = await registerUser();
    const token = refreshCookie(response).split('=')[1];

    const stored = await prisma.refreshToken.findMany();

    expect(stored).toHaveLength(1);
    expect(token).toBeTruthy();
    expect(stored[0]?.tokenHash).not.toBe(token);
    expect(stored[0]?.tokenHash).toHaveLength(64);
  });

  it('normalises the email before storing it', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ ...credentials, email: '  GRACE@Example.COM ' });

    const user = await prisma.user.findUnique({ where: { email: 'grace@example.com' } });

    expect(user).not.toBeNull();
  });

  it('rejects a duplicate email with 409', async () => {
    await registerUser();
    const response = await registerUser();

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('CONFLICT');
  });

  it('rejects a password shorter than 8 characters', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ ...credentials, password: 'short' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details.password).toBeDefined();
  });

  it('rejects a malformed email', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ ...credentials, email: 'not-an-email' });

    expect(response.status).toBe(400);
    expect(response.body.error.details.email).toBeDefined();
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await registerUser();
  });

  it('returns a session for valid credentials', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: credentials.email,
      password: credentials.password,
    });

    expect(response.status).toBe(200);
    expect(typeof response.body.accessToken).toBe('string');
    expect(refreshCookieHeader(response)).toContain('HttpOnly');
  });

  it('gives the same answer for a wrong password and an unknown email', async () => {
    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: credentials.email, password: 'definitely-wrong' });

    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: credentials.password });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the current user', async () => {
    const { body } = await registerUser();

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${body.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ email: credentials.email, name: credentials.name });
  });

  it('rejects a request without a token', async () => {
    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a token that is not a valid signature', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not.a.real.token');

    expect(response.status).toBe(401);
  });
});

describe('POST /api/auth/refresh', () => {
  it('rotates the refresh token and issues a new access token', async () => {
    const registered = await registerUser();
    const firstCookie = refreshCookie(registered);

    const refreshed = await request(app).post('/api/auth/refresh').set('Cookie', firstCookie);
    const secondCookie = refreshCookie(refreshed);

    expect(refreshed.status).toBe(200);
    expect(typeof refreshed.body.accessToken).toBe('string');
    expect(secondCookie).not.toBe(firstCookie);

    // The new access token has to actually work
    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${refreshed.body.accessToken}`);

    expect(me.status).toBe(200);
  });

  it('keeps the rotated token usable and marks the previous one revoked', async () => {
    const registered = await registerUser();

    await request(app).post('/api/auth/refresh').set('Cookie', refreshCookie(registered));

    const tokens = await prisma.refreshToken.findMany({ orderBy: { createdAt: 'asc' } });

    expect(tokens).toHaveLength(2);
    expect(tokens[0]?.revokedAt).not.toBeNull();
    expect(tokens[1]?.revokedAt).toBeNull();
  });

  it('rejects a request without the cookie', async () => {
    const response = await request(app).post('/api/auth/refresh');

    expect(response.status).toBe(401);
  });

  it('rejects an unknown token', async () => {
    const response = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', 'refresh_token=made-up-value');

    expect(response.status).toBe(401);
  });

  it('revokes every session when an already-used token is replayed', async () => {
    // Two devices: the browser that registered and a second login
    const deviceA = await registerUser();
    const deviceB = await request(app).post('/api/auth/login').send({
      email: credentials.email,
      password: credentials.password,
    });

    const staleCookie = refreshCookie(deviceA);
    const rotated = await request(app).post('/api/auth/refresh').set('Cookie', staleCookie);
    const rotatedCookie = refreshCookie(rotated);

    // Replaying the stale cookie is the signal that it leaked
    const replay = await request(app).post('/api/auth/refresh').set('Cookie', staleCookie);

    expect(replay.status).toBe(401);

    // Both the rotated token and the untouched second device are now dead
    const afterReplay = await request(app).post('/api/auth/refresh').set('Cookie', rotatedCookie);
    const deviceBAfter = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', refreshCookie(deviceB));

    expect(afterReplay.status).toBe(401);
    expect(deviceBAfter.status).toBe(401);

    const live = await prisma.refreshToken.count({ where: { revokedAt: null } });
    expect(live).toBe(0);
  });

  it('rejects an expired token', async () => {
    const registered = await registerUser();

    await prisma.refreshToken.updateMany({
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const response = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', refreshCookie(registered));

    expect(response.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('revokes the presented token and clears the cookie', async () => {
    const registered = await registerUser();
    const cookie = refreshCookie(registered);

    const response = await request(app).post('/api/auth/logout').set('Cookie', cookie);

    expect(response.status).toBe(204);
    expect(refreshCookieHeader(response)).toMatch(/refresh_token=;/);

    const reuse = await request(app).post('/api/auth/refresh').set('Cookie', cookie);
    expect(reuse.status).toBe(401);
  });

  it('succeeds even without a cookie, so logout is always safe to call', async () => {
    const response = await request(app).post('/api/auth/logout');

    expect(response.status).toBe(204);
  });
});
