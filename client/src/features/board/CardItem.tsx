import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CardDto } from '@kanban/shared';
import { cn } from '@/lib/cn';
import { LABEL_CLASS, formatDueDate, isOverdue } from './labels';

interface CardItemProps {
  card: CardDto;
  onOpen: () => void;
}

export function CardItem({ card, onOpen }: CardItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', columnId: card.columnId },
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'flex items-start gap-1 rounded-md border border-border bg-surface-muted',
        isDragging && 'opacity-40',
      )}
    >
      {/*
        The drag listeners live on this handle rather than on the whole card.
        dnd-kit's keyboard sensor starts a drag on Enter and Space, which are
        exactly the keys that have to open the card instead.
      */}
      <button
        type="button"
        aria-label={`Reorder card ${card.title}`}
        className="cursor-grab px-1.5 py-2 text-content-muted hover:text-content"
        {...attributes}
        {...listeners}
      >
        <span aria-hidden="true">⠿</span>
      </button>

      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open card ${card.title}`}
        className="flex-1 py-2 pr-2 text-left"
      >
        <span className="block text-sm text-content">{card.title}</span>

        {(card.labelColor || card.dueDate) && (
          <span className="mt-1.5 flex items-center gap-2">
            {card.labelColor && (
              <span
                className={cn('size-2.5 rounded-full', LABEL_CLASS[card.labelColor])}
                // The colour repeats information already in the dialog, so it is
                // decorative here and named for assistive tech instead
                aria-label={`Label ${card.labelColor}`}
                role="img"
              />
            )}
            {card.dueDate && (
              <span
                className={cn(
                  'text-xs',
                  isOverdue(card.dueDate) ? 'font-medium text-danger' : 'text-content-muted',
                )}
              >
                {formatDueDate(card.dueDate)}
              </span>
            )}
          </span>
        )}
      </button>
    </li>
  );
}
