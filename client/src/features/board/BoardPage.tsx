import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import type { BoardDetailDto, CardDto } from '@kanban/shared';
import { StateMessage } from '@/components/StateMessage';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { AddColumnForm } from './AddColumnForm';
import { CardModal } from './CardModal';
import { ColumnView } from './ColumnView';
import {
  cardMove,
  columnMove,
  findCardColumn,
  moveCardInBoard,
  moveColumnInBoard,
} from './board-state';
import {
  useBoard,
  useBoardCache,
  useCreateCard,
  useCreateColumn,
  useDeleteCard,
  useDeleteColumn,
  useMoveCard,
  useMoveColumn,
  useRenameColumn,
  useUpdateCard,
} from './hooks';

type ActiveDrag = { type: 'card' | 'column'; id: string };

function BoardSkeleton() {
  return (
    <div className="flex gap-4" aria-busy="true">
      {[0, 1, 2].map((index) => (
        <Skeleton key={index} className="h-64 w-72 shrink-0" />
      ))}
    </div>
  );
}

export function BoardPage() {
  const { boardId = '' } = useParams();
  const board = useBoard(boardId);
  const cache = useBoardCache(boardId);

  const createColumn = useCreateColumn(boardId);
  const renameColumn = useRenameColumn(boardId);
  const deleteColumn = useDeleteColumn(boardId);
  const moveColumn = useMoveColumn(boardId);
  const createCard = useCreateCard(boardId);
  const updateCard = useUpdateCard(boardId);
  const deleteCard = useDeleteCard(boardId);
  const moveCard = useMoveCard(boardId);

  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);
  const [openCardId, setOpenCardId] = useState<string | null>(null);

  // The board as it was before the drag started, used to roll back on failure
  const snapshotRef = useRef<BoardDetailDto | null>(null);

  const sensors = useSensors(
    // A few pixels of travel before a drag begins, so clicking a card still works
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const data = board.data;
  const openCard: CardDto | null = data
    ? (data.columns.flatMap((column) => column.cards).find((card) => card.id === openCardId) ??
      null)
    : null;

  function handleDragStart(event: DragStartEvent) {
    const type = event.active.data.current?.type;

    if (type !== 'card' && type !== 'column') {
      return;
    }

    snapshotRef.current = cache.read();
    setActiveDrag({ type, id: String(event.active.id) });
  }

  /**
   * Only cross-column transfers happen here, so the card visually follows the
   * pointer into its new column. Reordering within a column is settled on drop,
   * where the final index is known.
   */
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;

    if (!over || activeDrag?.type !== 'card') {
      return;
    }

    const current = cache.read();

    if (!current) {
      return;
    }

    const cardId = String(active.id);
    const sourceColumn = findCardColumn(current, cardId);
    const overData = over.data.current;

    let targetColumnId: string | null = null;
    let targetIndex = 0;

    if (overData?.type === 'card') {
      targetColumnId = String(overData.columnId);
      const target = current.columns.find((column) => column.id === targetColumnId);
      targetIndex = target?.cards.findIndex((card) => card.id === String(over.id)) ?? 0;
    } else if (overData?.type === 'column-drop') {
      targetColumnId = String(overData.columnId);
      targetIndex =
        current.columns.find((column) => column.id === targetColumnId)?.cards.length ?? 0;
    }

    if (!targetColumnId || !sourceColumn || sourceColumn.id === targetColumnId) {
      return;
    }

    cache.write((value) => moveCardInBoard(value, cardId, targetColumnId, targetIndex));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { over } = event;
    const drag = activeDrag;
    const snapshot = snapshotRef.current;

    setActiveDrag(null);
    snapshotRef.current = null;

    const current = cache.read();

    if (!drag || !snapshot || !over || !current) {
      return;
    }

    if (drag.type === 'column') {
      if (over.data.current?.type !== 'column') {
        return;
      }

      const targetIndex = current.columns.findIndex((column) => column.id === String(over.id));

      if (targetIndex === -1) {
        return;
      }

      const next = moveColumnInBoard(current, drag.id, targetIndex);
      cache.write(() => next);

      const move = columnMove(next, drag.id);
      const before = columnMove(snapshot, drag.id);

      if (
        !move ||
        (before && before.afterId === move.afterId && before.beforeId === move.beforeId)
      ) {
        return;
      }

      moveColumn.mutate({ columnId: drag.id, move, snapshot });
      return;
    }

    let next = current;
    const overData = over.data.current;

    if (overData?.type === 'card') {
      const targetColumn = current.columns.find((column) =>
        column.cards.some((card) => card.id === String(over.id)),
      );

      if (targetColumn) {
        const targetIndex = targetColumn.cards.findIndex((card) => card.id === String(over.id));
        next = moveCardInBoard(current, drag.id, targetColumn.id, targetIndex);
      }
    } else if (overData?.type === 'column-drop') {
      const targetColumn = current.columns.find(
        (column) => column.id === String(overData.columnId),
      );

      if (targetColumn) {
        next = moveCardInBoard(current, drag.id, targetColumn.id, targetColumn.cards.length);
      }
    }

    cache.write(() => next);

    const move = cardMove(next, drag.id);
    const before = cardMove(snapshot, drag.id);

    if (!move) {
      return;
    }

    // Dropping a card back where it started is not worth a request
    if (
      before &&
      before.columnId === move.columnId &&
      before.afterId === move.afterId &&
      before.beforeId === move.beforeId
    ) {
      return;
    }

    moveCard.mutate({ cardId: drag.id, move, snapshot });
  }

  function handleDragCancel() {
    const snapshot = snapshotRef.current;

    if (snapshot) {
      cache.restore(snapshot);
    }

    snapshotRef.current = null;
    setActiveDrag(null);
  }

  const activeCard =
    activeDrag?.type === 'card' && data
      ? data.columns.flatMap((column) => column.cards).find((card) => card.id === activeDrag.id)
      : undefined;

  /**
   * dnd-kit announces drag progress to screen readers, but by default it reads
   * out the raw ids — "Draggable item 4f3c-… was moved over droppable area
   * 9ab1-…" — which tells the listener nothing. These names turn the same
   * announcements into something usable.
   */
  const nameFor = (id: string): string => {
    if (!data) {
      return 'item';
    }

    const column = data.columns.find((item) => item.id === id || `column-drop-${item.id}` === id);

    if (column) {
      return `column ${column.title}`;
    }

    const card = data.columns.flatMap((item) => item.cards).find((item) => item.id === id);

    return card ? `card ${card.title}` : 'item';
  };

  return (
    <main className="flex flex-1 flex-col px-4 py-6">
      <div className="mb-5 flex items-center gap-3">
        <Link to="/boards" className="text-sm text-content-muted hover:text-content">
          ← All boards
        </Link>
        {board.isSuccess && (
          <h1 className="truncate text-xl font-semibold text-content">{board.data.title}</h1>
        )}
      </div>

      {board.isPending && <BoardSkeleton />}

      {board.isError && (
        <StateMessage
          title="Could not open this board"
          description="It may have been deleted, or the request failed."
          action={
            <Button variant="secondary" onClick={() => void board.refetch()}>
              Retry
            </Button>
          }
        />
      )}

      {data && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
          accessibility={{
            screenReaderInstructions: {
              draggable:
                'Press space or enter to start moving this item. Use the arrow keys to pick a new place, then press space or enter to drop it. Press escape to cancel.',
            },
            announcements: {
              onDragStart: ({ active }) => `Picked up ${nameFor(String(active.id))}.`,
              onDragOver: ({ active, over }) =>
                over
                  ? `${nameFor(String(active.id))} is over ${nameFor(String(over.id))}.`
                  : `${nameFor(String(active.id))} is no longer over a drop target.`,
              onDragEnd: ({ active, over }) =>
                over
                  ? `Dropped ${nameFor(String(active.id))} on ${nameFor(String(over.id))}.`
                  : `Dropped ${nameFor(String(active.id))}.`,
              onDragCancel: ({ active }) => `Cancelled moving ${nameFor(String(active.id))}.`,
            },
          }}
        >
          {/* On a phone the columns scroll sideways instead of being squeezed */}
          <div className="flex flex-1 items-start gap-4 overflow-x-auto pb-4">
            <SortableContext
              items={data.columns.map((column) => column.id)}
              strategy={horizontalListSortingStrategy}
            >
              {data.columns.map((column) => (
                <ColumnView
                  key={column.id}
                  column={column}
                  addingCard={createCard.isPending}
                  onRename={(title) => renameColumn.mutate({ columnId: column.id, title })}
                  onDelete={() => deleteColumn.mutate(column.id)}
                  onAddCard={(title) => createCard.mutate({ columnId: column.id, title })}
                  onOpenCard={(card) => setOpenCardId(card.id)}
                />
              ))}
            </SortableContext>

            <AddColumnForm
              pending={createColumn.isPending}
              onSubmit={(title) => createColumn.mutate(title)}
            />
          </div>

          <DragOverlay>
            {activeCard && (
              <div className="rounded-md border border-accent bg-surface px-3 py-2 text-sm text-content shadow-lg">
                {activeCard.title}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {openCard && (
        <CardModal
          card={openCard}
          saving={updateCard.isPending}
          onClose={() => setOpenCardId(null)}
          onSave={(input) => {
            updateCard.mutate(
              { cardId: openCard.id, input },
              { onSuccess: () => setOpenCardId(null) },
            );
          }}
          onDelete={() => {
            deleteCard.mutate(openCard.id);
            setOpenCardId(null);
          }}
        />
      )}
    </main>
  );
}
