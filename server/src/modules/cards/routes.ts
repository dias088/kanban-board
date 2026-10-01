import { Router } from 'express';
import { moveCardSchema, updateCardSchema } from '@kanban/shared';
import { asyncHandler } from '../../lib/asyncHandler';
import { idParams, pathParam } from '../../lib/params';
import { currentUserId, requireAuth } from '../../middleware/requireAuth';
import { validate } from '../../middleware/validate';
import * as cardService from './service';

export const cardsRouter = Router();

cardsRouter.use(requireAuth);

cardsRouter.patch(
  '/:id',
  validate(idParams, 'params'),
  validate(updateCardSchema),
  asyncHandler(async (req, res) => {
    res.json(await cardService.updateCard(currentUserId(req), pathParam(req, 'id'), req.body));
  }),
);

cardsRouter.patch(
  '/:id/move',
  validate(idParams, 'params'),
  validate(moveCardSchema),
  asyncHandler(async (req, res) => {
    res.json(await cardService.moveCard(currentUserId(req), pathParam(req, 'id'), req.body));
  }),
);

cardsRouter.delete(
  '/:id',
  validate(idParams, 'params'),
  asyncHandler(async (req, res) => {
    await cardService.deleteCard(currentUserId(req), pathParam(req, 'id'));
    res.status(204).send();
  }),
);
