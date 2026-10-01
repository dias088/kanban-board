import { z } from 'zod';
import {
  EMAIL_MAX_LENGTH,
  NAME_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from './constants';

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(EMAIL_MAX_LENGTH)
  .email('Enter a valid email address');

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must contain at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `Password must contain at most ${PASSWORD_MAX_LENGTH} characters`);

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().min(1, 'Name is required').max(NAME_MAX_LENGTH),
});

/**
 * Login deliberately does not reuse passwordSchema: the password policy is an
 * enforcement rule for new passwords, not a hint to hand to whoever is trying
 * to sign in. Any non-empty value is accepted and then simply fails to match.
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
