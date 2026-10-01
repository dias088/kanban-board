import type { BoardDetailDto, CardDto, ColumnDto } from '@kanban/shared';

/**
 * Pure rearrangement of a cached board.
 *
 * Drag and drop updates the query cache first and talks to the server second,
 * so these helpers are the single source of truth for what the board looks
 * like mid-drag. Keeping them free of React and of dnd-kit makes the ordering
 * rules testable on their own.
 */

export interface Neighbours {
  afterId: string | null;
  beforeId: string | null;
}

export interface CardMove extends Neighbours {
  columnId: string;
}

const clamp = (index: number, length: number): number => Math.max(0, Math.min(index, length));

export const findCardColumn = (board: BoardDetailDto, cardId: string): ColumnDto | undefined =>
  board.columns.find((column) => column.cards.some((card) => card.id === cardId));

export function moveCardInBoard(
  board: BoardDetailDto,
  cardId: string,
  targetColumnId: string,
  targetIndex: number,
): BoardDetailDto {
  let moving: CardDto | undefined;

  const withoutCard = board.columns.map((column) => {
    if (!column.cards.some((card) => card.id === cardId)) {
      return column;
    }

    moving = column.cards.find((card) => card.id === cardId);

    return { ...column, cards: column.cards.filter((card) => card.id !== cardId) };
  });

  if (!moving) {
    return board;
  }

  const card: CardDto = { ...moving, columnId: targetColumnId };

  return {
    ...board,
    columns: withoutCard.map((column) => {
      if (column.id !== targetColumnId) {
        return column;
      }

      const cards = [...column.cards];
      cards.splice(clamp(targetIndex, cards.length), 0, card);

      return { ...column, cards };
    }),
  };
}

export function moveColumnInBoard(
  board: BoardDetailDto,
  columnId: string,
  targetIndex: number,
): BoardDetailDto {
  const from = board.columns.findIndex((column) => column.id === columnId);

  if (from === -1) {
    return board;
  }

  const columns = [...board.columns];
  const [moved] = columns.splice(from, 1);

  if (!moved) {
    return board;
  }

  columns.splice(clamp(targetIndex, columns.length), 0, moved);

  return { ...board, columns };
}

/**
 * Describes where a card now sits, for the server to derive a position from.
 * Read after the board has already been rearranged locally.
 */
export function cardMove(board: BoardDetailDto, cardId: string): CardMove | null {
  const column = findCardColumn(board, cardId);

  if (!column) {
    return null;
  }

  const index = column.cards.findIndex((card) => card.id === cardId);

  return {
    columnId: column.id,
    afterId: column.cards[index - 1]?.id ?? null,
    beforeId: column.cards[index + 1]?.id ?? null,
  };
}

export function columnMove(board: BoardDetailDto, columnId: string): Neighbours | null {
  const index = board.columns.findIndex((column) => column.id === columnId);

  if (index === -1) {
    return null;
  }

  return {
    afterId: board.columns[index - 1]?.id ?? null,
    beforeId: board.columns[index + 1]?.id ?? null,
  };
}
