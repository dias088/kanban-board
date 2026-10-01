import { useState } from 'react';
import { COLUMN_TITLE_MAX_LENGTH } from '@kanban/shared';
import { Button } from '@/components/ui/Button';

interface AddColumnFormProps {
  pending: boolean;
  onSubmit: (title: string) => void;
}

export function AddColumnForm({ pending, onSubmit }: AddColumnFormProps) {
  const [title, setTitle] = useState('');

  return (
    <form
      className="flex w-72 shrink-0 flex-col gap-2 rounded-lg border border-dashed border-border p-3"
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = title.trim();

        if (trimmed.length === 0) {
          return;
        }

        onSubmit(trimmed);
        setTitle('');
      }}
    >
      <input
        value={title}
        maxLength={COLUMN_TITLE_MAX_LENGTH}
        placeholder="New column"
        aria-label="New column title"
        onChange={(event) => setTitle(event.target.value)}
        className="h-9 rounded-md border border-border bg-surface px-2.5 text-sm text-content placeholder:text-content-muted"
      />

      <Button type="submit" size="sm" loading={pending} disabled={title.trim().length === 0}>
        Add column
      </Button>
    </form>
  );
}
