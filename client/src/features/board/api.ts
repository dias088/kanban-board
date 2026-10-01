import type { BoardDetailDto } from '@kanban/shared';
import { apiFetch } from '@/lib/api';

export const fetchBoard = (boardId: string): Promise<BoardDetailDto> =>
  apiFetch(`/boards/${boardId}`);
