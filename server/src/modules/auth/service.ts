import { Prisma } from '@prisma/client';
import type { LoginInput, RegisterInput, UserDto } from '@kanban/shared';
import { conflict, unauthorized } from '../../lib/errors';
import { hashPassword, verifyPassword } from '../../lib/password';
import {
  createRefreshToken,
  hashRefreshToken,
  refreshTokenExpiry,
  signAccessToken,
} from '../../lib/tokens';
import { prisma } from '../../prisma';

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: UserDto;
}

interface UserRecord {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

const toUserDto = (user: UserRecord): UserDto => ({
  id: user.id,
  email: user.email,
  name: user.name,
  createdAt: user.createdAt.toISOString(),
});

async function issueSession(user: UserRecord): Promise<Session> {
  const { token, tokenHash } = createRefreshToken();

  await prisma.refreshToken.create({
    data: { tokenHash, userId: user.id, expiresAt: refreshTokenExpiry() },
  });

  return { accessToken: signAccessToken(user.id), refreshToken: token, user: toUserDto(user) };
}

export async function register(input: RegisterInput): Promise<Session> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });

  if (existing) {
    throw conflict('An account with this email already exists');
  }

  const passwordHash = await hashPassword(input.password);

  try {
    const user = await prisma.user.create({
      data: { email: input.email, name: input.name, passwordHash },
    });

    return await issueSession(user);
  } catch (error) {
    // Two simultaneous registrations pass the check above; the unique index is
    // what actually keeps emails unique, so its violation maps to the same 409.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw conflict('An account with this email already exists');
    }

    throw error;
  }
}

export async function login(input: LoginInput): Promise<Session> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user) {
    // Spend a comparable amount of CPU so that a missing account cannot be
    // told apart from a wrong password by measuring the response time.
    await hashPassword(input.password);
    throw unauthorized('Invalid email or password');
  }

  if (!(await verifyPassword(input.password, user.passwordHash))) {
    throw unauthorized('Invalid email or password');
  }

  return issueSession(user);
}

/**
 * Rotates the refresh token: the presented one is revoked and a fresh one is
 * issued inside the same transaction.
 *
 * Presenting a token that is already revoked means the cookie leaked — the
 * legitimate client never reuses one — so every live session of that user is
 * revoked as well.
 */
export async function refreshSession(rawToken: string): Promise<Session> {
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashRefreshToken(rawToken) },
    include: { user: true },
  });

  if (!stored) {
    throw unauthorized('Refresh token is invalid');
  }

  if (stored.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    throw unauthorized('Refresh token has already been used');
  }

  if (stored.expiresAt.getTime() <= Date.now()) {
    throw unauthorized('Refresh token has expired');
  }

  const next = createRefreshToken();

  const rotated = await prisma.$transaction(async (tx) => {
    const revoked = await tx.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    // A parallel refresh won the race and already rotated this token. That is
    // a client-side bug rather than a stolen cookie, so other sessions survive.
    if (revoked.count === 0) {
      return false;
    }

    await tx.refreshToken.create({
      data: { tokenHash: next.tokenHash, userId: stored.userId, expiresAt: refreshTokenExpiry() },
    });

    return true;
  });

  if (!rotated) {
    throw unauthorized('Refresh token has already been used');
  }

  return {
    accessToken: signAccessToken(stored.userId),
    refreshToken: next.token,
    user: toUserDto(stored.user),
  };
}

export async function logout(rawToken: string | undefined): Promise<void> {
  if (!rawToken) {
    return;
  }

  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashRefreshToken(rawToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getCurrentUser(userId: string): Promise<UserDto> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    // The access token is still cryptographically valid but the account is gone
    throw unauthorized('Account no longer exists');
  }

  return toUserDto(user);
}
