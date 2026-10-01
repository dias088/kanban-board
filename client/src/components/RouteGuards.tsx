import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/auth-context';
import { Skeleton } from './ui/Skeleton';

/** Past this point the delay is no longer a slow network but a sleeping server. */
const COLD_START_HINT_MS = 4000;

/**
 * Shown while the boot-time refresh decides whether there is a session.
 *
 * The API runs on a free plan that spins down after inactivity and takes up to
 * a minute to come back. Saying so beats a spinner that looks broken.
 */
function BootSkeleton() {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), COLD_START_HINT_MS);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 p-6" aria-busy="true">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-28 w-full" />

      {slow && (
        <p role="status" className="text-sm text-content-muted">
          Waking the server up. It sleeps when nobody is using it, so the first request can take up
          to a minute.
        </p>
      )}
    </div>
  );
}

export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <BootSkeleton />;
  }

  if (status === 'anonymous') {
    // Remember where the user was heading so login can return them there
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { status } = useAuth();

  if (status === 'loading') {
    return <BootSkeleton />;
  }

  if (status === 'authenticated') {
    return <Navigate to="/boards" replace />;
  }

  return <Outlet />;
}
