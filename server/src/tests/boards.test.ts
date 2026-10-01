import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { prisma } from '../prisma';
import { createBoard, createCard, createColumn, signUp } from './helpers';

const app = createApp();

const bearer = (token: string) => `Bearer ${token}`;

describe('authentication', () => {
  it('is required for every board route', async () => {
    const responses = await Promise.all([
      request(app).get('/api/boards'),
      request(app).post('/api/boards').send({ title: 'Nope' }),
      request(app).get(`/api/boards/${crypto.randomUUID()}`),
    ]);

    for (const response of responses) {
      expect(response.status).toBe(401);
    }
  });
});

describe('POST /api/boards', () => {
  it('creates an empty board', async () => {
    const token = await signUp(app);

    const response = await request(app)
      .post('/api/boards')
      .set('Authorization', bearer(token))
      .send({ title: '  Roadmap  ' });

    expect(response.status).toBe(201);
    // The title is trimmed by the shared schema before it reaches the database
    expect(response.body).toMatchObject({ title: 'Roadmap', columnCount: 0, cardCount: 0 });
  });

  it('rejects an empty title', async () => {
    const token = await signUp(app);

    const response = await request(app)
      .post('/api/boards')
      .set('Authorization', bearer(token))
      .send({ title: '   ' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/boards', () => {
  it('lists only the boards of the signed-in user, with counts', async () => {
    const owner = await signUp(app, 'owner@example.com');
    const stranger = await signUp(app, 'stranger@example.com');

    const boardId = await createBoard(app, owner, 'Mine');
    const columnId = await createColumn(app, owner, boardId);
    await createCard(app, owner, columnId);
    await createCard(app, owner, columnId, 'Second card');

    await createBoard(app, stranger, 'Theirs');

    const response = await request(app).get('/api/boards').set('Authorization', bearer(owner));

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({ title: 'Mine', columnCount: 1, cardCount: 2 });
  });
});

describe('GET /api/boards/:id', () => {
  it('returns columns and cards ordered by position', async () => {
    const token = await signUp(app);
    const boardId = await createBoard(app, token);

    const todo = await createColumn(app, token, boardId, 'Todo');
    const done = await createColumn(app, token, boardId, 'Done');
    await createCard(app, token, todo, 'First');
    await createCard(app, token, todo, 'Second');

    const response = await request(app)
      .get(`/api/boards/${boardId}`)
      .set('Authorization', bearer(token));

    expect(response.status).toBe(200);
    expect(response.body.columns.map((column: { id: string }) => column.id)).toEqual([todo, done]);
    expect(response.body.columns[0].cards.map((card: { title: string }) => card.title)).toEqual([
      'First',
      'Second',
    ]);
  });

  it('answers 404 for a board owned by somebody else', async () => {
    const owner = await signUp(app, 'owner@example.com');
    const stranger = await signUp(app, 'stranger@example.com');
    const boardId = await createBoard(app, owner);

    const response = await request(app)
      .get(`/api/boards/${boardId}`)
      .set('Authorization', bearer(stranger));

    // 404 and not 403: a 403 would confirm that this id exists
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('answers 404 for a board that does not exist', async () => {
    const token = await signUp(app);

    const response = await request(app)
      .get(`/api/boards/${crypto.randomUUID()}`)
      .set('Authorization', bearer(token));

    expect(response.status).toBe(404);
  });

  it('is indistinguishable between a foreign board and a missing one', async () => {
    const owner = await signUp(app, 'owner@example.com');
    const stranger = await signUp(app, 'stranger@example.com');
    const boardId = await createBoard(app, owner);

    const foreign = await request(app)
      .get(`/api/boards/${boardId}`)
      .set('Authorization', bearer(stranger));

    const missing = await request(app)
      .get(`/api/boards/${crypto.randomUUID()}`)
      .set('Authorization', bearer(stranger));

    expect(foreign.status).toBe(missing.status);
    expect(foreign.body).toEqual(missing.body);
  });

  it('rejects an id that is not a uuid', async () => {
    const token = await signUp(app);

    const response = await request(app)
      .get('/api/boards/not-a-uuid')
      .set('Authorization', bearer(token));

    expect(response.status).toBe(400);
  });
});

describe('PATCH /api/boards/:id', () => {
  it('renames a board', async () => {
    const token = await signUp(app);
    const boardId = await createBoard(app, token);

    const response = await request(app)
      .patch(`/api/boards/${boardId}`)
      .set('Authorization', bearer(token))
      .send({ title: 'Renamed' });

    expect(response.status).toBe(200);
    expect(response.body.title).toBe('Renamed');
  });

  it('answers 404 when renaming a foreign board', async () => {
    const owner = await signUp(app, 'owner@example.com');
    const stranger = await signUp(app, 'stranger@example.com');
    const boardId = await createBoard(app, owner);

    const response = await request(app)
      .patch(`/api/boards/${boardId}`)
      .set('Authorization', bearer(stranger))
      .send({ title: 'Hijacked' });

    expect(response.status).toBe(404);

    const board = await prisma.board.findUnique({ where: { id: boardId } });
    expect(board?.title).toBe('Roadmap');
  });
});

describe('DELETE /api/boards/:id', () => {
  it('deletes the board together with its columns and cards', async () => {
    const token = await signUp(app);
    const boardId = await createBoard(app, token);
    const columnId = await createColumn(app, token, boardId);
    await createCard(app, token, columnId);

    const response = await request(app)
      .delete(`/api/boards/${boardId}`)
      .set('Authorization', bearer(token));

    expect(response.status).toBe(204);
    // Cascades are declared in the schema, so nothing should be left behind
    expect(await prisma.column.count()).toBe(0);
    expect(await prisma.card.count()).toBe(0);
  });

  it('answers 404 when deleting a foreign board and leaves it intact', async () => {
    const owner = await signUp(app, 'owner@example.com');
    const stranger = await signUp(app, 'stranger@example.com');
    const boardId = await createBoard(app, owner);

    const response = await request(app)
      .delete(`/api/boards/${boardId}`)
      .set('Authorization', bearer(stranger));

    expect(response.status).toBe(404);
    expect(await prisma.board.count({ where: { id: boardId } })).toBe(1);
  });
});
