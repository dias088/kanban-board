import type { Card, Column } from '@prisma/client';
import type { CardDto, ColumnDto, LabelColor } from '@kanban/shared';

/**
 * labelColor is a nullable String in the database. Writes go through a zod enum,
 * so the stored value is always one of LABEL_COLORS.
 */
export const toCardDto = (card: Card): CardDto => ({
  id: card.id,
  title: card.title,
  description: card.description,
  columnId: card.columnId,
  position: card.position,
  dueDate: card.dueDate?.toISOString() ?? null,
  labelColor: card.labelColor as LabelColor | null,
  createdAt: card.createdAt.toISOString(),
  updatedAt: card.updatedAt.toISOString(),
});

export const toColumnDto = (column: Column, cards: Card[]): ColumnDto => ({
  id: column.id,
  title: column.title,
  boardId: column.boardId,
  position: column.position,
  cards: cards.map(toCardDto),
});
