import type {
  BoardDetailDto,
  CardDto,
  ColumnDto,
  CreateCardInput,
  CreateColumnInput,
  UpdateCardInput,
} from '@kanban/shared';
import { apiFetch } from '@/lib/api';
import type { CardMove, Neighbours } from './board-state';

export const fetchBoard = (boardId: string): Promise<BoardDetailDto> =>
  apiFetch(`/boards/${boardId}`);

export const createColumnRequest = (
  boardId: string,
  input: CreateColumnInput,
): Promise<ColumnDto> => apiFetch(`/boards/${boardId}/columns`, { method: 'POST', body: input });

export const renameColumnRequest = (columnId: string, title: string): Promise<ColumnDto> =>
  apiFetch(`/columns/${columnId}`, { method: 'PATCH', body: { title } });

export const deleteColumnRequest = (columnId: string): Promise<void> =>
  apiFetch(`/columns/${columnId}`, { method: 'DELETE' });

export const moveColumnRequest = (columnId: string, move: Neighbours): Promise<ColumnDto> =>
  apiFetch(`/columns/${columnId}/move`, { method: 'PATCH', body: move });

export const createCardRequest = (columnId: string, input: CreateCardInput): Promise<CardDto> =>
  apiFetch(`/columns/${columnId}/cards`, { method: 'POST', body: input });

export const updateCardRequest = (cardId: string, input: UpdateCardInput): Promise<CardDto> =>
  apiFetch(`/cards/${cardId}`, { method: 'PATCH', body: input });

export const deleteCardRequest = (cardId: string): Promise<void> =>
  apiFetch(`/cards/${cardId}`, { method: 'DELETE' });

export const moveCardRequest = (cardId: string, move: CardMove): Promise<CardDto> =>
  apiFetch(`/cards/${cardId}/move`, { method: 'PATCH', body: move });
