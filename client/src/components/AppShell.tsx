import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth/auth-context';
import { Button } from './ui/Button';
import { ThemeToggle } from './ui/ThemeToggle';

export function AppShell() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-surface px-4 py-2.5">
        <Link to="/boards" className="font-semibold text-content">
          Kanban
        </Link>

        <div className="ml-auto flex items-center gap-2">
          {user && (
            <span className="hidden text-sm text-content-muted sm:inline" title={user.email}>
              {user.name}
            </span>
          )}
          <ThemeToggle />
          <Button variant="secondary" size="sm" onClick={() => void logout()}>
            Sign out
          </Button>
        </div>
      </header>

      <Outlet />
    </div>
  );
}
