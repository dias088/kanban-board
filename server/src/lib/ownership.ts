import { notFound } from './errors';
import type { Db } from '../prisma';

/**
 * Ownership guards.
 *
 * A resource belonging to another account answers 404, exactly like one that
 * does not exist: a 403 would confirm that the id is real, which is itself a
 * leak. Columns and cards are checked through their board in the same query via
 * a relation filter, so ownership costs no extra round trip.
 */

export async function findOwnedBoard(db: Db, userId: string, boardId: string) {
  const board = await db.board.findFirst({ where: { id: boardId, ownerId: userId } });

  if (!board) {
    throw notFound('Board not found');
  }

  return board;
}

export async function findOwnedColumn(db: Db, userId: string, columnId: string) {
  const column = await db.column.findFirst({
    where: { id: columnId, board: { ownerId: userId } },
  });

  if (!column) {
    throw notFound('Column not found');
  }

  return column;
}

export async function findOwnedCard(db: Db, userId: string, cardId: string) {
  const card = await db.card.findFirst({
    where: { id: cardId, column: { board: { ownerId: userId } } },
  });

  if (!card) {
    throw notFound('Card not found');
  }

  return card;
}
