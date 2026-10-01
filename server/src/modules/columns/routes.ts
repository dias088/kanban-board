import { Router } from 'express';
import { createCardSchema, moveColumnSchema, updateColumnSchema } from '@kanban/shared';
import { asyncHandler } from '../../lib/asyncHandler';
import { columnIdParams, idParams, pathParam } from '../../lib/params';
import { currentUserId, requireAuth } from '../../middleware/requireAuth';
import { validate } from '../../middleware/validate';
import * as cardService from '../cards/service';
import * as columnService from './service';

export const columnsRouter = Router();

columnsRouter.use(requireAuth);

columnsRouter.patch(
  '/:id',
  validate(idParams, 'params'),
  validate(updateColumnSchema),
  asyncHandler(async (req, res) => {
    res.json(await columnService.updateColumn(currentUserId(req), pathParam(req, 'id'), req.body));
  }),
);

/**
 * Reordering is a separate endpoint rather than a `position` field on PATCH:
 * the client describes where the column landed and the server derives the
 * ordering value, so no request can write a raw position.
 */
columnsRouter.patch(
  '/:id/move',
  validate(idParams, 'params'),
  validate(moveColumnSchema),
  asyncHandler(async (req, res) => {
    res.json(await columnService.moveColumn(currentUserId(req), pathParam(req, 'id'), req.body));
  }),
);

columnsRouter.delete(
  '/:id',
  validate(idParams, 'params'),
  asyncHandler(async (req, res) => {
    await columnService.deleteColumn(currentUserId(req), pathParam(req, 'id'));
    res.status(204).send();
  }),
);

columnsRouter.post(
  '/:columnId/cards',
  validate(columnIdParams, 'params'),
  validate(createCardSchema),
  asyncHandler(async (req, res) => {
    const card = await cardService.createCard(
      currentUserId(req),
      pathParam(req, 'columnId'),
      req.body,
    );

    res.status(201).json(card);
  }),
);
