import type { ReactNode } from 'react';

interface StateMessageProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

/** Shared layout for the empty and error states so they read the same. */
export function StateMessage({ title, description, action }: StateMessageProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-12 text-center">
      <h2 className="text-base font-medium text-content">{title}</h2>
      {description && <p className="max-w-sm text-sm text-content-muted">{description}</p>}
      {action}
    </div>
  );
}
