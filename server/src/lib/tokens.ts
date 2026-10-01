import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../env';

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_DAYS = 7;

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL_SECONDS });
}

/** Returns the user id carried by the token, or null if it is invalid or expired. */
export function verifyAccessToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);

    if (typeof payload === 'string' || typeof payload.sub !== 'string') {
      return null;
    }

    return payload.sub;
  } catch {
    return null;
  }
}

/**
 * Refresh tokens are opaque random strings rather than JWTs: they must be
 * revocable, and a self-contained token cannot be revoked. Only the SHA-256
 * hash reaches the database, so a database dump cannot be replayed.
 *
 * SHA-256 without a salt is deliberate here — unlike a password, the token is
 * 48 bytes of entropy, so there is nothing to brute force and the lookup has
 * to be a single indexed query.
 */
export function createRefreshToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(48).toString('base64url');
  return { token, tokenHash: hashRefreshToken(token) };
}

export const hashRefreshToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

export const refreshTokenExpiry = (from: Date = new Date()): Date =>
  new Date(from.getTime() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
