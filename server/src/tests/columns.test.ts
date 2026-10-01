import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { prisma } from '../prisma';
import { createBoard, createCard, createColumn, readBoard, signUp } from './helpers';

const app = createApp();

const bearer = (token: string) => `Bearer ${token}`;

describe('POST /api/boards/:boardId/columns', () => {
  it('appends columns in creation order', async () => {
    const token = await signUp(app);
    const boardId = await createBoard(app, token);

    await createColumn(app, token, boardId, 'Todo');
    await createColumn(app, token, boardId, 'Doing');
    await createColumn(app, token, boardId, 'Done');

    const board = await readBoard(app, token, boardId);

    expect(board.columnTitles).toEqual(['Todo', 'Doing', 'Done']);
  });

  it('answers 404 when adding a column to a foreign board', async () => {
    const owner = await signUp(app, 'owner@example.com');
    const stranger = await signUp(app, 'stranger@example.com');
    const boardId = await createBoard(app, owner);

    const response = await request(app)
      .post(`/api/boards/${boardId}/columns`)
      .set('Authorization', bearer(stranger))
      .send({ title: 'Injected' });

    expect(response.status).toBe(404);
    expect(await prisma.column.count()).toBe(0);
  });
});

describe('PATCH /api/columns/:id', () => {
  it('renames a column', async () => {
    const token = await signUp(app);
    const boardId = await createBoard(app, token);
    const columnId = await createColumn(app, token, boardId, 'Todo');

    const response = await request(app)
      .patch(`/api/columns/${columnId}`)
      .set('Authorization', bearer(token))
      .send({ title: 'Backlog' });

    expect(response.status).toBe(200);
    expect(response.body.title).toBe('Backlog');
  });

  it('cannot be used to write a raw position', async () => {
    const token = await signUp(app);
    const boardId = await createBoard(app, token);
    const columnId = await createColumn(app, token, boardId, 'Todo');
    const before = await prisma.column.findUniqueOrThrow({ where: { id: columnId } });

    await request(app)
      .patch(`/api/columns/${columnId}`)
      .set('Authorization', bearer(token))
      .send({ title: 'Todo', position: 1 });

    const after = await prisma.column.findUniqueOrThrow({ where: { id: columnId } });

    // Ordering is derived by the server only; an unknown key is simply dropped
    expect(after.position).toBe(before.position);
  });

  it('answers 404 for a column on a foreign board', async () => {
    const owner = await signUp(app, 'owner@example.com');
    const stranger = await signUp(app, 'stranger@example.com');
    const boardId = await createBoard(app, owner);
    const columnId = await createColumn(app, owner, boardId);

    const response = await request(app)
      .patch(`/api/columns/${columnId}`)
      .set('Authorization', bearer(stranger))
      .send({ title: 'Hijacked' });

    expect(response.status).toBe(404);
  });
});

describe('PATCH /api/columns/:id/move', () => {
  it('moves a column to the front', async () => {
    const token = await signUp(app);
    const boardId = await createBoard(app, token);
    const todo = await createColumn(app, token, boardId, 'Todo');
    await createColumn(app, token, boardId, 'Doing');
    const done = await createColumn(app, token, boardId, 'Done');

    const response = await request(app)
      .patch(`/api/columns/${done}/move`)
      .set('Authorization', bearer(token))
      .send({ beforeId: todo });

    expect(response.status).toBe(200);

    const board = await readBoard(app, token, boardId);
    expect(board.columnTitles).toEqual(['Done', 'Todo', 'Doing']);
  });

  it('moves a column between two others', async () => {
    const token = await signUp(app);
    const boardId = await createBoard(app, token);
    const todo = await createColumn(app, token, boardId, 'Todo');
    const doing = await createColumn(app, token, boardId, 'Doing');
    const done = await createColumn(app, token, boardId, 'Done');

    await request(app)
      .patch(`/api/columns/${done}/move`)
      .set('Authorization', bearer(token))
      .send({ afterId: todo, beforeId: doing });

    const board = await readBoard(app, token, boardId);
    expect(board.columnTitles).toEqual(['Todo', 'Done', 'Doing']);
  });

  it('rejects a neighbour from another board', async () => {
    const token = await signUp(app);
    const boardId = await createBoard(app, token, 'First');
    const otherBoardId = await createBoard(app, token, 'Second');
    const columnId = await createColumn(app, token, boardId, 'Todo');
    const foreignColumnId = await createColumn(app, token, otherBoardId, 'Elsewhere');

    const response = await request(app)
      .patch(`/api/columns/${columnId}/move`)
      .set('Authorization', bearer(token))
      .send({ afterId: foreignColumnId });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain('afterId');
  });

  it('rejects positioning a column relative to itself', async () => {
    const token = await signUp(app);
    const boardId = await createBoard(app, token);
    const columnId = await createColumn(app, token, boardId);

    const response = await request(app)
      .patch(`/api/columns/${columnId}/move`)
      .set('Authorization', bearer(token))
      .send({ afterId: columnId });

    expect(response.status).toBe(400);
  });

  it('answers 404 for a column on a foreign board', async () => {
    const owner = await signUp(app, 'owner@example.com');
    const stranger = await signUp(app, 'stranger@example.com');
    const boardId = await createBoard(app, owner);
    const columnId = await createColumn(app, owner, boardId);

    const response = await request(app)
      .patch(`/api/columns/${columnId}/move`)
      .set('Authorization', bearer(stranger))
      .send({});

    expect(response.status).toBe(404);
  });
});

describe('DELETE /api/columns/:id', () => {
  it('deletes the column and its cards', async () => {
    const token = await signUp(app);
    const boardId = await createBoard(app, token);
    const columnId = await createColumn(app, token, boardId);
    await createCard(app, token, columnId);

    const response = await request(app)
      .delete(`/api/columns/${columnId}`)
      .set('Authorization', bearer(token));

    expect(response.status).toBe(204);
    expect(await prisma.card.count()).toBe(0);
  });

  it('answers 404 for a column on a foreign board', async () => {
    const owner = await signUp(app, 'owner@example.com');
    const stranger = await signUp(app, 'stranger@example.com');
    const boardId = await createBoard(app, owner);
    const columnId = await createColumn(app, owner, boardId);

    const response = await request(app)
      .delete(`/api/columns/${columnId}`)
      .set('Authorization', bearer(stranger));

    expect(response.status).toBe(404);
    expect(await prisma.column.count()).toBe(1);
  });
});
