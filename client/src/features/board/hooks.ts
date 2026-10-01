import { useQuery } from '@tanstack/react-query';
import type { BoardDetailDto } from '@kanban/shared';
import { fetchBoard } from './api';

export const boardKey = (boardId: string) => ['board', boardId] as const;

/**
 * The whole board lives in a single cache entry. Mutations patch that entry
 * optimistically, which keeps drag and drop free of cross-query coordination.
 */
export function useBoard(boardId: string) {
  return useQuery<BoardDetailDto>({
    queryKey: boardKey(boardId),
    queryFn: () => fetchBoard(boardId),
  });
}
