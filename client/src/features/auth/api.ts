import type { AuthResponse, LoginInput, RegisterInput } from '@kanban/shared';
import { apiFetch } from '@/lib/api';

export const registerRequest = (input: RegisterInput): Promise<AuthResponse> =>
  apiFetch('/auth/register', { method: 'POST', body: input });

export const loginRequest = (input: LoginInput): Promise<AuthResponse> =>
  apiFetch('/auth/login', { method: 'POST', body: input });

export const logoutRequest = (): Promise<void> => apiFetch('/auth/logout', { method: 'POST' });
