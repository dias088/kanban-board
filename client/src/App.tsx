import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

type HealthState = 'checking' | 'ok' | 'unreachable';

/**
 * Scaffolding placeholder: proves the client builds and can reach the API.
 * Replaced by the router and real pages in the next stages.
 */
export default function App() {
  const [health, setHealth] = useState<HealthState>('checking');

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_URL}/api/health`)
      .then((response) => {
        if (!cancelled) setHealth(response.ok ? 'ok' : 'unreachable');
      })
      .catch(() => {
        if (!cancelled) setHealth('unreachable');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-3 px-6">
      <h1 className="text-2xl font-semibold">Kanban</h1>
      <p className="text-content-muted">
        Monorepo scaffolding is in place. API status:{' '}
        <span className="font-medium text-content">{health}</span>
      </p>
    </main>
  );
}
