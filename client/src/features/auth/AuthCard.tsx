import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

interface AuthCardProps {
  title: string;
  subtitle: string;
  footer: { prompt: string; linkLabel: string; to: string };
  children: ReactNode;
}

export function AuthCard({ title, subtitle, footer, children }: AuthCardProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-4 py-3">
        <span className="font-semibold">Kanban</span>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-content">{title}</h1>
          <p className="mt-1 text-sm text-content-muted">{subtitle}</p>

          <div className="mt-6">{children}</div>

          <p className="mt-6 text-sm text-content-muted">
            {footer.prompt}{' '}
            <Link to={footer.to} className="font-medium text-accent hover:underline">
              {footer.linkLabel}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
