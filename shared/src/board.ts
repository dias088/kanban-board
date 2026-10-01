import { z } from 'zod';
import {
  BOARD_TITLE_MAX_LENGTH,
  CARD_DESCRIPTION_MAX_LENGTH,
  CARD_TITLE_MAX_LENGTH,
  COLUMN_TITLE_MAX_LENGTH,
  LABEL_COLORS,
} from './constants';

const titleSchema = (max: number) => z.string().trim().min(1, 'Title is required').max(max);

export const boardTitleSchema = titleSchema(BOARD_TITLE_MAX_LENGTH);
export const columnTitleSchema = titleSchema(COLUMN_TITLE_MAX_LENGTH);
export const cardTitleSchema = titleSchema(CARD_TITLE_MAX_LENGTH);

export const createBoardSchema = z.object({ title: boardTitleSchema });
export const updateBoardSchema = z.object({ title: boardTitleSchema });

export const createColumnSchema = z.object({ title: columnTitleSchema });
export const updateColumnSchema = z.object({ title: columnTitleSchema });

/**
 * Neighbours of the drop target. `afterId` is the item the moved one lands
 * below, `beforeId` the item it lands above; the server derives the position
 * from them so a client can never write a raw ordering value.
 */
export const moveSchema = z.object({
  afterId: z.string().uuid().nullish(),
  beforeId: z.string().uuid().nullish(),
});

export const moveColumnSchema = moveSchema;

export const moveCardSchema = moveSchema.extend({
  columnId: z.string().uuid(),
});

export const createCardSchema = z.object({
  title: cardTitleSchema,
  description: z.string().trim().max(CARD_DESCRIPTION_MAX_LENGTH).nullish(),
  dueDate: z.coerce.date().nullish(),
  labelColor: z.enum(LABEL_COLORS).nullish(),
});

/**
 * Every field is optional on update, and the distinction matters: an absent key
 * leaves the field alone while an explicit null clears it.
 */
export const updateCardSchema = createCardSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update');

export type CreateBoardInput = z.infer<typeof createBoardSchema>;
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;
export type CreateColumnInput = z.infer<typeof createColumnSchema>;
export type UpdateColumnInput = z.infer<typeof updateColumnSchema>;
export type CreateCardInput = z.infer<typeof createCardSchema>;
export type UpdateCardInput = z.infer<typeof updateCardSchema>;
export type MoveColumnInput = z.infer<typeof moveColumnSchema>;
export type MoveCardInput = z.infer<typeof moveCardSchema>;
