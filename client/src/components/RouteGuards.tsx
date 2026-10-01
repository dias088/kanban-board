import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/auth-context';
import { Skeleton } from './ui/Skeleton';

/** Shown while the boot-time refresh decides whether there is a session. */
function BootSkeleton() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 p-6" aria-busy="true">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-28 w-full" />
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
