import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

interface InlineTitleProps {
  value: string;
  onSave: (value: string) => void;
  editLabel: string;
  maxLength: number;
  className?: string;
}

/**
 * Click or Enter turns the heading into an input. Enter commits, Escape
 * reverts, and losing focus commits too, because a click elsewhere on the
 * board reads as "done" rather than "cancel".
 */
export function InlineTitle({ value, onSave, editLabel, maxLength, className }: InlineTitleProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    setEditing(false);

    if (trimmed.length === 0 || trimmed === value) {
      setDraft(value);
      return;
    }

    onSave(trimmed);
  };

  if (!editing) {
    return (
      <button
        type="button"
        aria-label={editLabel}
        onClick={() => setEditing(true)}
        className={cn('truncate rounded px-1 text-left hover:bg-surface-muted', className)}
      >
        {value}
      </button>
    );
  }

  return (
    <input
      ref={inputRef}
      aria-label={editLabel}
      value={draft}
      maxLength={maxLength}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          commit();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          setDraft(value);
          setEditing(false);
        }
      }}
      className={cn(
        'w-full rounded border border-accent bg-surface px-1 text-content outline-none',
        className,
      )}
    />
  );
}
