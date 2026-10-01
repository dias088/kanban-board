import type {
  BoardDetailDto,
  BoardSummaryDto,
  CreateBoardInput,
  UpdateBoardInput,
} from '@kanban/shared';
import { notFound } from '../../lib/errors';
import { toColumnDto } from '../../lib/mappers';
import { findOwnedBoard } from '../../lib/ownership';
import { prisma } from '../../prisma';

interface BoardRecord {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

const toSummary = (
  board: BoardRecord,
  columnCount: number,
  cardCount: number,
): BoardSummaryDto => ({
  id: board.id,
  title: board.title,
  createdAt: board.createdAt.toISOString(),
  updatedAt: board.updatedAt.toISOString(),
  columnCount,
  cardCount,
});

export async function listBoards(userId: string): Promise<BoardSummaryDto[]> {
  // The counts come from the same query: one round trip for the whole list
  const boards = await prisma.board.findMany({
    where: { ownerId: userId },
    orderBy: { updatedAt: 'desc' },
    include: { columns: { select: { _count: { select: { cards: true } } } } },
  });

  return boards.map((board) =>
    toSummary(
      board,
      board.columns.length,
      board.columns.reduce((total, column) => total + column._count.cards, 0),
    ),
  );
}

export async function createBoard(
  userId: string,
  input: CreateBoardInput,
): Promise<BoardSummaryDto> {
  const board = await prisma.board.create({ data: { title: input.title, ownerId: userId } });

  return toSummary(board, 0, 0);
}

export async function getBoard(userId: string, boardId: string): Promise<BoardDetailDto> {
  const board = await prisma.board.findFirst({
    where: { id: boardId, ownerId: userId },
    include: {
      // Ties are broken by id so the order can never depend on row layout
      columns: {
        orderBy: [{ position: 'asc' }, { id: 'asc' }],
        include: { cards: { orderBy: [{ position: 'asc' }, { id: 'asc' }] } },
      },
    },
  });

  if (!board) {
    throw notFound('Board not found');
  }

  return {
    id: board.id,
    title: board.title,
    createdAt: board.createdAt.toISOString(),
    updatedAt: board.updatedAt.toISOString(),
    columns: board.columns.map((column) => toColumnDto(column, column.cards)),
  };
}

export async function updateBoard(
  userId: string,
  boardId: string,
  input: UpdateBoardInput,
): Promise<BoardSummaryDto> {
  const board = await findOwnedBoard(prisma, userId, boardId);

  const updated = await prisma.board.update({
    where: { id: board.id },
    data: { title: input.title },
    include: { columns: { select: { _count: { select: { cards: true } } } } },
  });

  return toSummary(
    updated,
    updated.columns.length,
    updated.columns.reduce((total, column) => total + column._count.cards, 0),
  );
}

export async function deleteBoard(userId: string, boardId: string): Promise<void> {
  // Ownership is part of the delete itself, so there is no read-then-write gap.
  // Columns and cards disappear through ON DELETE CASCADE.
  const { count } = await prisma.board.deleteMany({ where: { id: boardId, ownerId: userId } });

  if (count === 0) {
    throw notFound('Board not found');
  }
}
