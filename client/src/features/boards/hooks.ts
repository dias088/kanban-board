import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BoardSummaryDto } from '@kanban/shared';
import { useToast } from '@/components/ui/toast-context';
import { apiErrorMessage } from '@/lib/api';
import { createBoardRequest, deleteBoardRequest, fetchBoards } from './api';

export const boardsKey = ['boards'] as const;

export function useBoards() {
  return useQuery<BoardSummaryDto[]>({ queryKey: boardsKey, queryFn: fetchBoards });
}

export function useCreateBoard() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: createBoardRequest,
    onSuccess: (board) => {
      // Put the new board straight into the list instead of refetching it
      queryClient.setQueryData<BoardSummaryDto[]>(boardsKey, (current) =>
        current ? [board, ...current] : [board],
      );
    },
    onError: (error) => {
      showToast(apiErrorMessage(error, 'Could not create the board'));
    },
  });
}

export function useDeleteBoard() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: deleteBoardRequest,
    onSuccess: (_result, boardId) => {
      queryClient.setQueryData<BoardSummaryDto[]>(boardsKey, (current) =>
        current?.filter((board) => board.id !== boardId),
      );
    },
    onError: (error) => {
      showToast(apiErrorMessage(error, 'Could not delete the board'));
    },
  });
}
