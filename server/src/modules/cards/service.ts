import type { Prisma } from '@prisma/client';
import type { CardDto, CreateCardInput, MoveCardInput, UpdateCardInput } from '@kanban/shared';
import { badRequest, notFound } from '../../lib/errors';
import { toCardDto } from '../../lib/mappers';
import { findOwnedCard, findOwnedColumn } from '../../lib/ownership';
import { needsRebalance, positionBetween, rebalancedPosition } from '../../lib/position';
import { withSerializableRetry } from '../../lib/transaction';
import { prisma, type Db } from '../../prisma';

export async function createCard(
  userId: string,
  columnId: string,
  input: CreateCardInput,
): Promise<CardDto> {
  const column = await findOwnedColumn(prisma, userId, columnId);

  const last = await prisma.card.findFirst({
    where: { columnId: column.id },
    orderBy: { position: 'desc' },
  });

  const card = await prisma.card.create({
    data: {
      columnId: column.id,
      title: input.title,
      description: input.description ?? null,
      dueDate: input.dueDate ?? null,
      labelColor: input.labelColor ?? null,
      position: positionBetween(last?.position ?? null, null),
    },
  });

  return toCardDto(card);
}

export async function updateCard(
  userId: string,
  cardId: string,
  input: UpdateCardInput,
): Promise<CardDto> {
  const card = await findOwnedCard(prisma, userId, cardId);

  // An absent key leaves the column alone, an explicit null clears it, which is
  // why each field is checked against undefined rather than spread blindly.
  const data: Prisma.CardUpdateInput = {};

  if (input.title !== undefined) {
    data.title = input.title;
  }
  if (input.description !== undefined) {
    data.description = input.description;
  }
  if (input.dueDate !== undefined) {
    data.dueDate = input.dueDate;
  }
  if (input.labelColor !== undefined) {
    data.labelColor = input.labelColor;
  }

  const updated = await prisma.card.update({ where: { id: card.id }, data });

  return toCardDto(updated);
}

export async function deleteCard(userId: string, cardId: string): Promise<void> {
  const { count } = await prisma.card.deleteMany({
    where: { id: cardId, column: { board: { ownerId: userId } } },
  });

  if (count === 0) {
    throw notFound('Card not found');
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
 * Reads every card of the column rather than just the two neighbours by id.
 *
 * That is the whole point: this predicate read is what lets PostgreSQL's SSI
 * notice a conflict with another move into the same column. Fetching the
 * neighbours individually would leave their rows untouched by the competing
 * transaction, so no read/write dependency would exist, SERIALIZABLE would
 * happily commit both and the two moves would derive the same midpoint.
 */
const readColumnCards = (tx: Db, columnId: string): Promise<Sibling[]> =>
  tx.card.findMany({
    where: { columnId },
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
    select: { id: true, position: true },
  });

function resolveNeighbours(cards: Sibling[], input: MoveCardInput): Neighbours {
  const after = input.afterId ? cards.find((card) => card.id === input.afterId) : undefined;

  if (input.afterId && !after) {
    throw badRequest('afterId does not belong to the target column');
  }

  const before = input.beforeId ? cards.find((card) => card.id === input.beforeId) : undefined;

  if (input.beforeId && !before) {
    throw badRequest('beforeId does not belong to the target column');
  }

  if (after && before && before.position <= after.position) {
    throw badRequest('afterId must currently sit before beforeId');
  }

  return { after: after ?? null, before: before ?? null };
}

async function renumber(tx: Db, cards: Sibling[]): Promise<void> {
  for (const [index, card] of cards.entries()) {
    await tx.card.update({ where: { id: card.id }, data: { position: rebalancedPosition(index) } });
  }
}

/**
 * Moves a card inside a column or into another column of the same board.
 *
 * Everything happens in one SERIALIZABLE transaction: the neighbours are read,
 * the gap is checked, the column may be renumbered and the card is written. Two
 * simultaneous drags therefore cannot derive the same midpoint — one of them is
 * aborted by PostgreSQL and replayed by withSerializableRetry.
 */
export async function moveCard(
  userId: string,
  cardId: string,
  input: MoveCardInput,
): Promise<CardDto> {
  if (input.afterId === cardId || input.beforeId === cardId) {
    throw badRequest('A card cannot be positioned relative to itself');
  }

  return withSerializableRetry(async (tx) => {
    const card = await findOwnedCard(tx, userId, cardId);
    const target = await findOwnedColumn(tx, userId, input.columnId);

    let siblings = await readColumnCards(tx, target.id);
    let neighbours = resolveNeighbours(siblings, input);

    if (needsRebalance(neighbours.after?.position ?? null, neighbours.before?.position ?? null)) {
      // The gap can no longer be halved: renumber the column and read again
      await renumber(tx, siblings);
      siblings = await readColumnCards(tx, target.id);
      neighbours = resolveNeighbours(siblings, input);
    }

    const updated = await tx.card.update({
      where: { id: card.id },
      data: {
        columnId: target.id,
        position: positionBetween(
          neighbours.after?.position ?? null,
          neighbours.before?.position ?? null,
        ),
      },
    });

    return toCardDto(updated);
  });
}
