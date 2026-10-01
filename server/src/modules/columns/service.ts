import type {
  ColumnDto,
  CreateColumnInput,
  MoveColumnInput,
  UpdateColumnInput,
} from '@kanban/shared';
import { badRequest, notFound } from '../../lib/errors';
import { toColumnDto } from '../../lib/mappers';
import { findOwnedBoard, findOwnedColumn } from '../../lib/ownership';
import { needsRebalance, positionBetween, rebalancedPosition } from '../../lib/position';
import { withSerializableRetry } from '../../lib/transaction';
import { prisma, type Db } from '../../prisma';

export async function createColumn(
  userId: string,
  boardId: string,
  input: CreateColumnInput,
): Promise<ColumnDto> {
  const board = await findOwnedBoard(prisma, userId, boardId);

  const last = await prisma.column.findFirst({
    where: { boardId: board.id },
    orderBy: { position: 'desc' },
  });

  const column = await prisma.column.create({
    data: {
      boardId: board.id,
      title: input.title,
      position: positionBetween(last?.position ?? null, null),
    },
  });

  return toColumnDto(column, []);
}

export async function updateColumn(
  userId: string,
  columnId: string,
  input: UpdateColumnInput,
): Promise<ColumnDto> {
  const column = await findOwnedColumn(prisma, userId, columnId);

  const updated = await prisma.column.update({
    where: { id: column.id },
    data: { title: input.title },
  });

  return toColumnDto(updated, []);
}

export async function deleteColumn(userId: string, columnId: string): Promise<void> {
  const { count } = await prisma.column.deleteMany({
    where: { id: columnId, board: { ownerId: userId } },
  });

  if (count === 0) {
    throw notFound('Column not found');
  }
}

interface Sibling {
  id: string;
  position: number;
}

interface Neighbours {
  after: Sibling | null;
  before: Sibling | null;
}

/**
 * Reads all columns of the board, not just the two neighbours by id. The
 * predicate read is what lets PostgreSQL's SSI detect a conflict with another
 * reorder on the same board; reading the neighbours individually would leave
 * two concurrent moves free to derive the same position.
 */
const readBoardColumns = (tx: Db, boardId: string): Promise<Sibling[]> =>
  tx.column.findMany({
    where: { boardId },
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
    select: { id: true, position: true },
  });

/** Rejects neighbours from another board, which is what keeps boards separate. */
function resolveNeighbours(columns: Sibling[], input: MoveColumnInput): Neighbours {
  const after = input.afterId ? columns.find((column) => column.id === input.afterId) : undefined;

  if (input.afterId && !after) {
    throw badRequest('afterId does not belong to this board');
  }

  const before = input.beforeId
    ? columns.find((column) => column.id === input.beforeId)
    : undefined;

  if (input.beforeId && !before) {
    throw badRequest('beforeId does not belong to this board');
  }

  if (after && before && before.position <= after.position) {
    throw badRequest('afterId must currently sit before beforeId');
  }

  return { after: after ?? null, before: before ?? null };
}

async function renumber(tx: Db, columns: Sibling[]): Promise<void> {
  for (const [index, column] of columns.entries()) {
    await tx.column.update({
      where: { id: column.id },
      data: { position: rebalancedPosition(index) },
    });
  }
}

export async function moveColumn(
  userId: string,
  columnId: string,
  input: MoveColumnInput,
): Promise<ColumnDto> {
  if (input.afterId === columnId || input.beforeId === columnId) {
    throw badRequest('A column cannot be positioned relative to itself');
  }

  return withSerializableRetry(async (tx) => {
    const column = await findOwnedColumn(tx, userId, columnId);

    let siblings = await readBoardColumns(tx, column.boardId);
    let neighbours = resolveNeighbours(siblings, input);

    if (needsRebalance(neighbours.after?.position ?? null, neighbours.before?.position ?? null)) {
      // The gap can no longer be halved: renumber the board and read again
      await renumber(tx, siblings);
      siblings = await readBoardColumns(tx, column.boardId);
      neighbours = resolveNeighbours(siblings, input);
    }

    const updated = await tx.column.update({
      where: { id: column.id },
      data: {
        position: positionBetween(
          neighbours.after?.position ?? null,
          neighbours.before?.position ?? null,
        ),
      },
    });

    return toColumnDto(updated, []);
  });
}
