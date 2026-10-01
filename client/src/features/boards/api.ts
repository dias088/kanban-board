import type { BoardSummaryDto, CreateBoardInput, UpdateBoardInput } from '@kanban/shared';
import { apiFetch } from '@/lib/api';

export const fetchBoards = (): Promise<BoardSummaryDto[]> => apiFetch('/boards');

export const createBoardRequest = (input: CreateBoardInput): Promise<BoardSummaryDto> =>
  apiFetch('/boards', { method: 'POST', body: input });

export const updateBoardRequest = (
  boardId: string,
  input: UpdateBoardInput,
): Promise<BoardSummaryDto> => apiFetch(`/boards/${boardId}`, { method: 'PATCH', body: input });

export const deleteBoardRequest = (boardId: string): Promise<void> =>
  apiFetch(`/boards/${boardId}`, { method: 'DELETE' });
