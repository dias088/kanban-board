import { useRef, useState } from 'react';
import { CARD_TITLE_MAX_LENGTH } from '@kanban/shared';
import { Button } from '@/components/ui/Button';

interface AddCardFormProps {
  columnTitle: string;
  pending: boolean;
  onSubmit: (title: string) => void;
}

export function AddCardForm({ columnTitle, pending, onSubmit }: AddCardFormProps) {
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    const trimmed = title.trim();

    if (trimmed.length === 0) {
      return;
    }

    onSubmit(trimmed);
    setTitle('');
    // Adding several cards in a row is the common case, so keep the focus here
    inputRef.current?.focus();
  };

  return (
    <form
      className="flex items-center gap-1.5"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <input
        ref={inputRef}
        value={title}
        maxLength={CARD_TITLE_MAX_LENGTH}
        placeholder="Add a card"
        aria-label={`Add a card to ${columnTitle}`}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setTitle('');
            inputRef.current?.blur();
          }
        }}
        className="h-9 min-w-0 flex-1 rounded-md border border-border bg-surface px-2.5 text-sm text-content placeholder:text-content-muted"
      />

      <Button type="submit" size="sm" loading={pending} disabled={title.trim().length === 0}>
        Add
      </Button>
    </form>
  );
}
