import { Router } from 'express';
import { createBoardSchema, createColumnSchema, updateBoardSchema } from '@kanban/shared';
import { asyncHandler } from '../../lib/asyncHandler';
import { boardIdParams, idParams, pathParam } from '../../lib/params';
import { currentUserId, requireAuth } from '../../middleware/requireAuth';
import { validate } from '../../middleware/validate';
// Creating a column is addressed under its board, so the route lives here while
// the logic stays in the columns module.
import * as columnService from '../columns/service';
import * as boardService from './service';

export const boardsRouter = Router();

boardsRouter.use(requireAuth);

boardsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await boardService.listBoards(currentUserId(req)));
  }),
);

boardsRouter.post(
  '/',
  validate(createBoardSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await boardService.createBoard(currentUserId(req), req.body));
  }),
);

boardsRouter.get(
  '/:id',
  validate(idParams, 'params'),
  asyncHandler(async (req, res) => {
    res.json(await boardService.getBoard(currentUserId(req), pathParam(req, 'id')));
  }),
);

boardsRouter.patch(
  '/:id',
  validate(idParams, 'params'),
  validate(updateBoardSchema),
  asyncHandler(async (req, res) => {
    res.json(await boardService.updateBoard(currentUserId(req), pathParam(req, 'id'), req.body));
  }),
);

boardsRouter.delete(
  '/:id',
  validate(idParams, 'params'),
  asyncHandler(async (req, res) => {
    await boardService.deleteBoard(currentUserId(req), pathParam(req, 'id'));
    res.status(204).send();
  }),
);

boardsRouter.post(
  '/:boardId/columns',
  validate(boardIdParams, 'params'),
  validate(createColumnSchema),
  asyncHandler(async (req, res) => {
    const column = await columnService.createColumn(
      currentUserId(req),
      pathParam(req, 'boardId'),
      req.body,
    );

    res.status(201).json(column);
  }),
);
