import { describe, expect, it } from 'vitest';
import type { BoardDetailDto, CardDto, ColumnDto } from '@kanban/shared';
import {
  cardMove,
  columnMove,
  findCardColumn,
  moveCardInBoard,
  moveColumnInBoard,
} from '@/features/board/board-state';

const card = (id: string, columnId: string, position: number): CardDto => ({
  id,
  title: id.toUpperCase(),
  description: null,
  columnId,
  position,
  dueDate: null,
  labelColor: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

const column = (id: string, cards: CardDto[], position: number): ColumnDto => ({
  id,
  title: id.toUpperCase(),
  boardId: 'board-1',
  position,
  cards,
});

/** todo: [a, b, c] · doing: [d] · done: [] */
const makeBoard = (): BoardDetailDto => ({
  id: 'board-1',
  title: 'Roadmap',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  columns: [
    column(
      'todo',
      [card('a', 'todo', 1024), card('b', 'todo', 2048), card('c', 'todo', 3072)],
      1024,
    ),
    column('doing', [card('d', 'doing', 1024)], 2048),
    column('done', [], 3072),
  ],
});

const titles = (board: BoardDetailDto, columnId: string) =>
  board.columns.find((item) => item.id === columnId)?.cards.map((item) => item.id);

describe('moveCardInBoard', () => {
  it('reorders a card inside its column', () => {
    const next = moveCardInBoard(makeBoard(), 'c', 'todo', 0);

    expect(titles(next, 'todo')).toEqual(['c', 'a', 'b']);
  });

  it('moves a card into another column and retags it', () => {
    const next = moveCardInBoard(makeBoard(), 'a', 'doing', 1);

    expect(titles(next, 'todo')).toEqual(['b', 'c']);
    expect(titles(next, 'doing')).toEqual(['d', 'a']);
    expect(findCardColumn(next, 'a')?.id).toBe('doing');
    expect(next.columns[1]?.cards[1]?.columnId).toBe('doing');
  });

  it('accepts an empty column as a target', () => {
    const next = moveCardInBoard(makeBoard(), 'a', 'done', 0);

    expect(titles(next, 'done')).toEqual(['a']);
  });

  it('clamps an index past the end instead of leaving a hole', () => {
    const next = moveCardInBoard(makeBoard(), 'a', 'doing', 99);

    expect(titles(next, 'doing')).toEqual(['d', 'a']);
  });

  it('leaves the board untouched for an unknown card', () => {
    const board = makeBoard();

    expect(moveCardInBoard(board, 'missing', 'todo', 0)).toBe(board);
  });

  it('does not mutate the board it was given', () => {
    const board = makeBoard();
    moveCardInBoard(board, 'a', 'doing', 0);

    expect(titles(board, 'todo')).toEqual(['a', 'b', 'c']);
    expect(titles(board, 'doing')).toEqual(['d']);
  });
});

describe('moveColumnInBoard', () => {
  it('moves a column to the front', () => {
    const next = moveColumnInBoard(makeBoard(), 'done', 0);

    expect(next.columns.map((item) => item.id)).toEqual(['done', 'todo', 'doing']);
  });

  it('moves a column to the end', () => {
    const next = moveColumnInBoard(makeBoard(), 'todo', 2);

    expect(next.columns.map((item) => item.id)).toEqual(['doing', 'done', 'todo']);
  });
});

describe('cardMove', () => {
  it('reports both neighbours for a card in the middle', () => {
    expect(cardMove(makeBoard(), 'b')).toEqual({
      columnId: 'todo',
      afterId: 'a',
      beforeId: 'c',
    });
  });

  it('reports no upper neighbour at the top of a column', () => {
    expect(cardMove(makeBoard(), 'a')).toEqual({
      columnId: 'todo',
      afterId: null,
      beforeId: 'b',
    });
  });

  it('reports no lower neighbour at the end of a column', () => {
    expect(cardMove(makeBoard(), 'c')).toEqual({
      columnId: 'todo',
      afterId: 'b',
      beforeId: null,
    });
  });

  it('reports no neighbours at all for the only card', () => {
    expect(cardMove(makeBoard(), 'd')).toEqual({
      columnId: 'doing',
      afterId: null,
      beforeId: null,
    });
  });

  it('describes the drop the server has to reproduce', () => {
    // Drag c out of todo and drop it between d and the end of doing
    const next = moveCardInBoard(makeBoard(), 'c', 'doing', 1);

    expect(cardMove(next, 'c')).toEqual({
      columnId: 'doing',
      afterId: 'd',
      beforeId: null,
    });
  });

  it('returns null for a card that is not on the board', () => {
    expect(cardMove(makeBoard(), 'missing')).toBeNull();
  });
});

describe('columnMove', () => {
  it('reports the surrounding columns after a reorder', () => {
    const next = moveColumnInBoard(makeBoard(), 'done', 1);

    expect(columnMove(next, 'done')).toEqual({ afterId: 'todo', beforeId: 'doing' });
  });

  it('reports no upper neighbour at the front', () => {
    expect(columnMove(makeBoard(), 'todo')).toEqual({ afterId: null, beforeId: 'doing' });
  });
});
