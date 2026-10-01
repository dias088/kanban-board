import { useState } from 'react';
import {
  CARD_DESCRIPTION_MAX_LENGTH,
  CARD_TITLE_MAX_LENGTH,
  LABEL_COLORS,
  type CardDto,
  type LabelColor,
  type UpdateCardInput,
} from '@kanban/shared';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';
import { LABEL_CLASS } from './labels';

interface CardModalProps {
  card: CardDto;
  saving: boolean;
  onSave: (input: UpdateCardInput) => void;
  onDelete: () => void;
  onClose: () => void;
}

/** <input type="date"> speaks YYYY-MM-DD while the API speaks ISO-8601. */
const toDateInput = (iso: string | null): string => (iso ? iso.slice(0, 10) : '');

export function CardModal({ card, saving, onSave, onDelete, onClose }: CardModalProps) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? '');
  const [dueDate, setDueDate] = useState(toDateInput(card.dueDate));
  const [labelColor, setLabelColor] = useState<LabelColor | null>(card.labelColor);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const trimmedTitle = title.trim();

  const submit = () => {
    if (trimmedTitle.length === 0) {
      return;
    }

    onSave({
      title: trimmedTitle,
      // An empty field means "clear it", which the API expresses as null
      description: description.trim().length > 0 ? description.trim() : null,
      dueDate: dueDate.length > 0 ? new Date(dueDate) : null,
      labelColor,
    });
  };

  return (
    <Modal title="Card details" onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="card-title" className="text-sm font-medium text-content">
            Title
          </label>
          <input
            id="card-title"
            data-autofocus
            value={title}
            maxLength={CARD_TITLE_MAX_LENGTH}
            onChange={(event) => setTitle(event.target.value)}
            className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-content"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="card-description" className="text-sm font-medium text-content">
            Description
          </label>
          <textarea
            id="card-description"
            rows={4}
            value={description}
            maxLength={CARD_DESCRIPTION_MAX_LENGTH}
            placeholder="What needs to happen?"
            onChange={(event) => setDescription(event.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-content placeholder:text-content-muted"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="card-due" className="text-sm font-medium text-content">
            Due date
          </label>
          <input
            id="card-due"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            className="h-10 w-48 rounded-md border border-border bg-surface px-3 text-sm text-content"
          />
        </div>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-medium text-content">Label</legend>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-label="No label"
              aria-pressed={labelColor === null}
              onClick={() => setLabelColor(null)}
              className={cn(
                'h-7 rounded-md border px-2 text-xs',
                labelColor === null
                  ? 'border-accent text-content'
                  : 'border-border text-content-muted',
              )}
            >
              None
            </button>

            {LABEL_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Label ${color}`}
                aria-pressed={labelColor === color}
                onClick={() => setLabelColor(color)}
                className={cn(
                  'size-7 rounded-md ring-offset-2 ring-offset-surface',
                  LABEL_CLASS[color],
                  labelColor === color && 'ring-2 ring-accent',
                )}
              />
            ))}
          </div>
        </fieldset>

        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          {/*
            Deliberately an inline confirmation rather than a second dialog:
            nesting one modal inside another means two Escape handlers fire at
            once, closing the card and discarding the edits along with it.
          */}
          {confirmingDelete ? (
            <span className="flex items-center gap-2 text-sm text-content-muted">
              Delete this card?
              <Button
                type="button"
                variant="danger"
                size="sm"
                aria-label="Confirm delete"
                onClick={onDelete}
              >
                Delete
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setConfirmingDelete(false)}
              >
                Keep
              </Button>
            </span>
          ) : (
            <Button
              type="button"
              variant="ghost"
              className="text-danger"
              onClick={() => setConfirmingDelete(true)}
            >
              Delete card
            </Button>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} disabled={trimmedTitle.length === 0}>
              Save
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
