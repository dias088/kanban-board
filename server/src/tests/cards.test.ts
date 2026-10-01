import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { POSITION_STEP } from '../lib/position';
import { prisma } from '../prisma';
import { createBoard, createCard, createColumn, readBoard, signUp } from './helpers';

const app = createApp();

const bearer = (token: string) => `Bearer ${token}`;

describe('POST /api/columns/:columnId/cards', () => {
  it('creates a card with optional fields', async () => {
    const token = await signUp(app);
    const boardId = await createBoard(app, token);
    const columnId = await createColumn(app, token, boardId);

    const response = await request(app)
      .post(`/api/columns/${columnId}/cards`)
      .set('Authorization', bearer(token))
      .send({
        title: 'Ship the demo',
        description: 'Record a GIF for the README',
        dueDate: '2026-12-01T00:00:00.000Z',
        labelColor: 'green',
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      title: 'Ship the demo',
      description: 'Record a GIF for the README',
      labelColor: 'green',
      columnId,
    });
    expect(response.body.dueDate).toBe('2026-12-01T00:00:00.000Z');
  });

  it('defaults the optional fields to null', async () => {
    const token = await signUp(app);
    const boardId = await createBoard(app, token);
    const columnId = await createColumn(app, token, boardId);

    const response = await request(app)
      .post(`/api/columns/${columnId}/cards`)
      .set('Authorization', bearer(token))
      .send({ title: 'Bare card' });

    expect(response.body).toMatchObject({
      description: null,
      dueDate: null,
      labelColor: null,
    });
  });

  it('rejects a label colour outside the shared palette', async () => {
    const token = await signUp(app);
    const boardId = await createBoard(app, token);
    const columnId = await createColumn(app, token, boardId);

    const response = await request(app)
      .post(`/api/columns/${columnId}/cards`)
      .set('Authorization', bearer(token))
      .send({ title: 'Nope', labelColor: 'chartreuse' });

    expect(response.status).toBe(400);
    expect(response.body.error.details.labelColor).toBeDefined();
  });

  it('answers 404 for a column on a foreign board', async () => {
    const owner = await signUp(app, 'owner@example.com');
    const stranger = await signUp(app, 'stranger@example.com');
    const boardId = await createBoard(app, owner);
    const columnId = await createColumn(app, owner, boardId);

    const response = await request(app)
      .post(`/api/columns/${columnId}/cards`)
      .set('Authorization', bearer(stranger))
      .send({ title: 'Injected' });

    expect(response.status).toBe(404);
    expect(await prisma.card.count()).toBe(0);
  });
});

describe('PATCH /api/cards/:id', () => {
  it('leaves untouched fields alone and clears the ones set to null', async () => {
    const token = await signUp(app);
    const boardId = await createBoard(app, token);
    const columnId = await createColumn(app, token, boardId);

    const created = await request(app)
      .post(`/api/columns/${columnId}/cards`)
      .set('Authorization', bearer(token))
      .send({ title: 'Original', description: 'Keep me', dueDate: '2026-12-01T00:00:00.000Z' });

    const renamed = await request(app)
      .patch(`/api/cards/${created.body.id}`)
      .set('Authorization', bearer(token))
      .send({ title: 'Renamed' });

    expect(renamed.body.title).toBe('Renamed');
    // description was absent from the request, so it must survive
    expect(renamed.body.description).toBe('Keep me');

    const cleared = await request(app)
      .patch(`/api/cards/${created.body.id}`)
      .set('Authorization', bearer(token))
      .send({ dueDate: null });

    expect(cleared.body.dueDate).toBeNull();
    expect(cleared.body.description).toBe('Keep me');
  });

  it('rejects an empty update', async () => {
    const token = await signUp(app);
    const boardId = await createBoard(app, token);
    const columnId = await createColumn(app, token, boardId);
    const cardId = await createCard(app, token, columnId);

    const response = await request(app)
      .patch(`/api/cards/${cardId}`)
      .set('Authorization', bearer(token))
      .send({});

    expect(response.status).toBe(400);
  });

  it('answers 404 for a card on a foreign board', async () => {
    const owner = await signUp(app, 'owner@example.com');
    const stranger = await signUp(app, 'stranger@example.com');
    const boardId = await createBoard(app, owner);
    const columnId = await createColumn(app, owner, boardId);
    const cardId = await createCard(app, owner, columnId, 'Untouchable');

    const response = await request(app)
      .patch(`/api/cards/${cardId}`)
      .set('Authorization', bearer(stranger))
      .send({ title: 'Hijacked' });

    expect(response.status).toBe(404);

    const card = await prisma.card.findUnique({ where: { id: cardId } });
    expect(card?.title).toBe('Untouchable');
  });
});

describe('PATCH /api/cards/:id/move', () => {
  it('reorders cards inside a column', async () => {
    const token = await signUp(app);
    const boardId = await createBoard(app, token);
    const columnId = await createColumn(app, token, boardId);
    const first = await createCard(app, token, columnId, 'First');
    await createCard(app, token, columnId, 'Second');
    const third = await createCard(app, token, columnId, 'Third');

    const response = await request(app)
      .patch(`/api/cards/${third}/move`)
      .set('Authorization', bearer(token))
      .send({ columnId, beforeId: first });

    expect(response.status).toBe(200);

    const board = await readBoard(app, token, boardId);
    expect(board.cardTitlesByColumn[0]).toEqual(['Third', 'First', 'Second']);
  });

  it('moves a card into another column at the requested spot', async () => {
    const token = await signUp(app);
    const boardId = await createBoard(app, token);
    const todo = await createColumn(app, token, boardId, 'Todo');
    const doing = await createColumn(app, token, boardId, 'Doing');

    const moving = await createCard(app, token, todo, 'Moving');
    const top = await createCard(app, token, doing, 'Top');
    const bottom = await createCard(app, token, doing, 'Bottom');

    const response = await request(app)
      .patch(`/api/cards/${moving}/move`)
      .set('Authorization', bearer(token))
      .send({ columnId: doing, afterId: top, beforeId: bottom });

    expect(response.status).toBe(200);
    expect(response.body.columnId).toBe(doing);

    const board = await readBoard(app, token, boardId);
    expect(board.cardTitlesByColumn).toEqual([[], ['Top', 'Moving', 'Bottom']]);
  });

  it('moves a card to the end of an empty column', async () => {
    const token = await signUp(app);
    const boardId = await createBoard(app, token);
    const todo = await createColumn(app, token, boardId, 'Todo');
    const done = await createColumn(app, token, boardId, 'Done');
    const cardId = await createCard(app, token, todo, 'Lonely');

    await request(app)
      .patch(`/api/cards/${cardId}/move`)
      .set('Authorization', bearer(token))
      .send({ columnId: done });

    const board = await readBoard(app, token, boardId);
    expect(board.cardTitlesByColumn).toEqual([[], ['Lonely']]);
  });

  it('renumbers the column when the gap becomes too small to split', async () => {
    const token = await signUp(app);
    const boardId = await createBoard(app, token);
    const columnId = await createColumn(app, token, boardId);
    const first = await createCard(app, token, columnId, 'First');
    const second = await createCard(app, token, columnId, 'Second');
    const moving = await createCard(app, token, columnId, 'Moving');

    // Squeeze the first two cards together so no midpoint is left between them
    await prisma.card.update({ where: { id: first }, data: { position: 1 } });
    await prisma.card.update({ where: { id: second }, data: { position: 1 + 1e-9 } });

    const response = await request(app)
      .patch(`/api/cards/${moving}/move`)
      .set('Authorization', bearer(token))
      .send({ columnId, afterId: first, beforeId: second });

    expect(response.status).toBe(200);

    const board = await readBoard(app, token, boardId);
    expect(board.cardTitlesByColumn[0]).toEqual(['First', 'Moving', 'Second']);

    // Every position was rewritten with room to spare, and they stay distinct
    const positions = (
      await prisma.card.findMany({ where: { columnId }, orderBy: { position: 'asc' } })
    ).map((card) => card.position);

    expect(Math.min(...positions)).toBeGreaterThanOrEqual(POSITION_STEP / 2);
    expect(new Set(positions).size).toBe(positions.length);
  });

  it('keeps a total, stable order even when two cards share a position', async () => {
    const token = await signUp(app);
    const boardId = await createBoard(app, token);
    const columnId = await createColumn(app, token, boardId);
    const a = await createCard(app, token, columnId, 'A');
    const b = await createCard(app, token, columnId, 'B');
    const c = await createCard(app, token, columnId, 'C');

    // Two clients working from the same stale view can legitimately derive the
    // same midpoint, so equal positions have to be survivable rather than
    // impossible. The (position, id) ordering is what makes them harmless.
    await prisma.card.updateMany({ where: { id: { in: [a, b, c] } }, data: { position: 2048 } });

    const first = await readBoard(app, token, boardId);
    const second = await readBoard(app, token, boardId);

    expect(first.cardTitlesByColumn[0]).toEqual(second.cardTitlesByColumn[0]);

    // With positions equal, the id decides, so the order is predictable
    const titleById = new Map([
      [a, 'A'],
      [b, 'B'],
      [c, 'C'],
    ]);
    const expected = [a, b, c].sort().map((id) => titleById.get(id));

    expect(first.cardTitlesByColumn[0]).toEqual(expected);
  });

  it('handles simultaneous moves without losing cards or corrupting the order', async () => {
    const token = await signUp(app);
    const boardId = await createBoard(app, token);
    const source = await createColumn(app, token, boardId, 'Source');
    const target = await createColumn(app, token, boardId, 'Target');

    const top = await createCard(app, token, target, 'Top');
    const bottom = await createCard(app, token, target, 'Bottom');

    const movers = await Promise.all(
      [1, 2, 3, 4, 5].map((index) => createCard(app, token, source, `Mover ${index}`)),
    );

    const responses = await Promise.all(
      movers.map((cardId) =>
        request(app)
          .patch(`/api/cards/${cardId}/move`)
          .set('Authorization', bearer(token))
          .send({ columnId: target, afterId: top, beforeId: bottom }),
      ),
    );

    for (const response of responses) {
      // A move that ran out of retries is an honest 409; a 500 would mean a
      // write conflict escaped withSerializableRetry
      expect([200, 409]).toContain(response.status);
    }

    const moved = await prisma.card.count({ where: { columnId: target } });
    const succeeded = responses.filter((response) => response.status === 200).length;

    expect(moved).toBe(2 + succeeded);

    // Whatever the interleaving was, the resulting order has to be repeatable
    const first = await readBoard(app, token, boardId);
    const second = await readBoard(app, token, boardId);

    expect(first.cardTitlesByColumn).toEqual(second.cardTitlesByColumn);
    expect(first.cardTitlesByColumn[1]?.at(0)).toBe('Top');
    expect(first.cardTitlesByColumn[1]?.at(-1)).toBe('Bottom');
  });

  it('rejects a neighbour that lives in a different column', async () => {
    const token = await signUp(app);
    const boardId = await createBoard(app, token);
    const todo = await createColumn(app, token, boardId, 'Todo');
    const doing = await createColumn(app, token, boardId, 'Doing');
    const cardId = await createCard(app, token, todo, 'Moving');
    const elsewhere = await createCard(app, token, doing, 'Elsewhere');

    const response = await request(app)
      .patch(`/api/cards/${cardId}/move`)
      .set('Authorization', bearer(token))
      .send({ columnId: todo, afterId: elsewhere });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain('afterId');
  });

  it('rejects neighbours given in the wrong order', async () => {
    const token = await signUp(app);
    const boardId = await createBoard(app, token);
    const columnId = await createColumn(app, token, boardId);
    const first = await createCard(app, token, columnId, 'First');
    const second = await createCard(app, token, columnId, 'Second');
    const moving = await createCard(app, token, columnId, 'Moving');

    const response = await request(app)
      .patch(`/api/cards/${moving}/move`)
      .set('Authorization', bearer(token))
      .send({ columnId, afterId: second, beforeId: first });

    expect(response.status).toBe(400);
  });

  it('answers 404 when moving a card into a foreign column', async () => {
    const owner = await signUp(app, 'owner@example.com');
    const stranger = await signUp(app, 'stranger@example.com');

    const ownerBoard = await createBoard(app, owner);
    const ownerColumn = await createColumn(app, owner, ownerBoard);

    const strangerBoard = await createBoard(app, stranger);
    const strangerColumn = await createColumn(app, stranger, strangerBoard);
    const strangerCard = await createCard(app, stranger, strangerColumn, 'Theirs');

    const response = await request(app)
      .patch(`/api/cards/${strangerCard}/move`)
      .set('Authorization', bearer(stranger))
      .send({ columnId: ownerColumn });

    expect(response.status).toBe(404);

    const card = await prisma.card.findUnique({ where: { id: strangerCard } });
    expect(card?.columnId).toBe(strangerColumn);
  });
});

describe('DELETE /api/cards/:id', () => {
  it('deletes a card', async () => {
    const token = await signUp(app);
    const boardId = await createBoard(app, token);
    const columnId = await createColumn(app, token, boardId);
    const cardId = await createCard(app, token, columnId);

    const response = await request(app)
      .delete(`/api/cards/${cardId}`)
      .set('Authorization', bearer(token));

    expect(response.status).toBe(204);
    expect(await prisma.card.count()).toBe(0);
  });

  it('answers 404 for a card on a foreign board', async () => {
    const owner = await signUp(app, 'owner@example.com');
    const stranger = await signUp(app, 'stranger@example.com');
    const boardId = await createBoard(app, owner);
    const columnId = await createColumn(app, owner, boardId);
    const cardId = await createCard(app, owner, columnId);

    const response = await request(app)
      .delete(`/api/cards/${cardId}`)
      .set('Authorization', bearer(stranger));

    expect(response.status).toBe(404);
    expect(await prisma.card.count()).toBe(1);
  });
});
