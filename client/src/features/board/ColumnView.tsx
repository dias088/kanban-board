import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { COLUMN_TITLE_MAX_LENGTH, type CardDto, type ColumnDto } from '@kanban/shared';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { InlineTitle } from '@/components/ui/InlineTitle';
import { cn } from '@/lib/cn';
import { AddCardForm } from './AddCardForm';
import { CardItem } from './CardItem';

interface ColumnViewProps {
  column: ColumnDto;
  addingCard: boolean;
  onRename: (title: string) => void;
  onDelete: () => void;
  onAddCard: (title: string) => void;
  onOpenCard: (card: CardDto) => void;
}

export function ColumnView({
  column,
  addingCard,
  onRename,
  onDelete,
  onAddCard,
  onOpenCard,
}: ColumnViewProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: { type: 'column' },
  });

  // A separate drop target so a card can be dropped into a column with no cards
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `column-drop-${column.id}`,
    data: { type: 'column-drop', columnId: column.id },
  });

  return (
    <section
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      aria-label={column.title}
      className={cn(
        'flex w-72 shrink-0 flex-col gap-2 rounded-lg border border-border bg-surface p-3',
        isDragging && 'opacity-50',
      )}
    >
      <header className="flex items-center gap-1">
        <button
          type="button"
          aria-label={`Reorder column ${column.title}`}
          className="cursor-grab px-1 text-content-muted hover:text-content"
          {...attributes}
          {...listeners}
        >
          <span aria-hidden="true">⠿</span>
        </button>

        <InlineTitle
          value={column.title}
          onSave={onRename}
          editLabel={`Rename column ${column.title}`}
          maxLength={COLUMN_TITLE_MAX_LENGTH}
          className="flex-1 font-medium text-content"
        />

        <span className="text-xs text-content-muted">{column.cards.length}</span>

        <Button
          variant="ghost"
          size="sm"
          aria-label={`Delete column ${column.title}`}
          onClick={() => setConfirmingDelete(true)}
        >
          <span aria-hidden="true">×</span>
        </Button>
      </header>

      <div
        ref={setDropRef}
        className={cn(
          'min-h-16 rounded-md transition',
          isOver && 'bg-surface-muted ring-1 ring-accent',
        )}
      >
        <SortableContext
          items={column.cards.map((card) => card.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="flex flex-col gap-2">
            {column.cards.map((card) => (
              <CardItem key={card.id} card={card} onOpen={() => onOpenCard(card)} />
            ))}
          </ul>
        </SortableContext>
      </div>

      <AddCardForm columnTitle={column.title} pending={addingCard} onSubmit={onAddCard} />

      {confirmingDelete && (
        <ConfirmDialog
          title={`Delete "${column.title}"?`}
          description={
            column.cards.length > 0
              ? `This column and its ${column.cards.length} ${
                  column.cards.length === 1 ? 'card' : 'cards'
                } will be deleted.`
              : 'This column will be deleted.'
          }
          confirmLabel="Delete column"
          onConfirm={() => {
            setConfirmingDelete(false);
            onDelete();
          }}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </section>
  );
}
