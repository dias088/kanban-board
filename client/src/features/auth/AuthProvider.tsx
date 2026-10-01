import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { LoginInput, RegisterInput, UserDto } from '@kanban/shared';
import { refreshSession, setAccessToken, setUnauthorizedHandler } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { AuthContext, type AuthStatus } from './auth-context';
import { demoRequest, loginRequest, logoutRequest, registerRequest } from './api';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStatus('anonymous');
    // Cached boards belong to the account that just went away
    queryClient.clear();
  }, []);

  // A request that stays unauthorised after a refresh means the session is gone
  useEffect(() => {
    setUnauthorizedHandler(clearSession);

    return () => {
      setUnauthorizedHandler(null);
    };
  }, [clearSession]);

  // On boot the access token is gone but the httpOnly refresh cookie may not be
  useEffect(() => {
    let cancelled = false;

    void refreshSession().then((session) => {
      if (cancelled) {
        return;
      }

      setUser(session?.user ?? null);
      setStatus(session ? 'authenticated' : 'anonymous');
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const session = await loginRequest(input);
    setAccessToken(session.accessToken);
    setUser(session.user);
    setStatus('authenticated');
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const session = await registerRequest(input);
    setAccessToken(session.accessToken);
    setUser(session.user);
    setStatus('authenticated');
  }, []);

  const startDemo = useCallback(async () => {
    const session = await demoRequest();
    setAccessToken(session.accessToken);
    setUser(session.user);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      // Even if the call fails the local session must not survive
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo(
    () => ({ user, status, login, register, startDemo, logout }),
    [user, status, login, register, startDemo, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
