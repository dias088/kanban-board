import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { BoardDetailDto, CardDto, UpdateCardInput } from '@kanban/shared';
import { useToast } from '@/components/ui/toast-context';
import { apiErrorMessage } from '@/lib/api';
import {
  createCardRequest,
  createColumnRequest,
  deleteCardRequest,
  deleteColumnRequest,
  fetchBoard,
  moveCardRequest,
  moveColumnRequest,
  renameColumnRequest,
  updateCardRequest,
} from './api';
import type { CardMove, Neighbours } from './board-state';

export const boardKey = (boardId: string) => ['board', boardId] as const;

/**
 * The whole board lives in a single cache entry. Mutations patch that entry
 * instead of invalidating it, which keeps drag and drop free of cross-query
 * coordination and avoids a refetch flashing the board back and forth.
 */
export function useBoard(boardId: string) {
  return useQuery<BoardDetailDto>({
    queryKey: boardKey(boardId),
    queryFn: () => fetchBoard(boardId),
  });
}

type BoardUpdater = (board: BoardDetailDto) => BoardDetailDto;

const patchBoard = (queryClient: QueryClient, boardId: string, update: BoardUpdater): void => {
  queryClient.setQueryData<BoardDetailDto>(boardKey(boardId), (board) =>
    board ? update(board) : board,
  );
};

/**
 * Direct access to the cached board for the drag handlers, which rearrange it
 * while the pointer is still down and long before any request is sent.
 */
export function useBoardCache(boardId: string) {
  const queryClient = useQueryClient();

  return useMemo(
    () => ({
      read: () => queryClient.getQueryData<BoardDetailDto>(boardKey(boardId)) ?? null,
      write: (update: BoardUpdater) => patchBoard(queryClient, boardId, update),
      restore: (board: BoardDetailDto) => queryClient.setQueryData(boardKey(boardId), board),
    }),
    [queryClient, boardId],
  );
}

const replaceCard = (board: BoardDetailDto, card: CardDto): BoardDetailDto => ({
  ...board,
  columns: board.columns.map((column) => ({
    ...column,
    cards: column.cards.map((existing) => (existing.id === card.id ? card : existing)),
  })),
});

/**
 * Drag and drop rearranges the cache before the request is sent, so the move
 * hooks receive the pre-drag board and put it back if the server disagrees.
 */
interface MoveCardVariables {
  cardId: string;
  move: CardMove;
  snapshot: BoardDetailDto;
}

export function useMoveCard(boardId: string) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ cardId, move }: MoveCardVariables) => moveCardRequest(cardId, move),
    onSuccess: (card) => {
      // Adopt the server's position so later drags compute from real values
      patchBoard(queryClient, boardId, (board) => replaceCard(board, card));
    },
    onError: (error, variables) => {
      queryClient.setQueryData(boardKey(boardId), variables.snapshot);
      showToast(apiErrorMessage(error, 'Could not move the card, it has been put back'));
    },
  });
}

interface MoveColumnVariables {
  columnId: string;
  move: Neighbours;
  snapshot: BoardDetailDto;
}

export function useMoveColumn(boardId: string) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ columnId, move }: MoveColumnVariables) => moveColumnRequest(columnId, move),
    onError: (error, variables) => {
      queryClient.setQueryData(boardKey(boardId), variables.snapshot);
      showToast(apiErrorMessage(error, 'Could not move the column, it has been put back'));
    },
  });
}

export function useCreateColumn(boardId: string) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (title: string) => createColumnRequest(boardId, { title }),
    onSuccess: (column) => {
      patchBoard(queryClient, boardId, (board) => ({
        ...board,
        columns: [...board.columns, column],
      }));
    },
    onError: (error) => {
      showToast(apiErrorMessage(error, 'Could not add the column'));
    },
  });
}

/** Renaming is optimistic: inline editing has to feel instant. */
export function useRenameColumn(boardId: string) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ columnId, title }: { columnId: string; title: string }) =>
      renameColumnRequest(columnId, title),
    onMutate: ({ columnId, title }) => {
      const snapshot = queryClient.getQueryData<BoardDetailDto>(boardKey(boardId));

      patchBoard(queryClient, boardId, (board) => ({
        ...board,
        columns: board.columns.map((column) =>
          column.id === columnId ? { ...column, title } : column,
        ),
      }));

      return { snapshot };
    },
    onError: (error, _variables, context) => {
      if (context?.snapshot) {
        queryClient.setQueryData(boardKey(boardId), context.snapshot);
      }

      showToast(apiErrorMessage(error, 'Could not rename the column'));
    },
  });
}

export function useDeleteColumn(boardId: string) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: deleteColumnRequest,
    onMutate: (columnId: string) => {
      const snapshot = queryClient.getQueryData<BoardDetailDto>(boardKey(boardId));

      patchBoard(queryClient, boardId, (board) => ({
        ...board,
        columns: board.columns.filter((column) => column.id !== columnId),
      }));

      return { snapshot };
    },
    onError: (error, _variables, context) => {
      if (context?.snapshot) {
        queryClient.setQueryData(boardKey(boardId), context.snapshot);
      }

      showToast(apiErrorMessage(error, 'Could not delete the column'));
    },
  });
}

export function useCreateCard(boardId: string) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ columnId, title }: { columnId: string; title: string }) =>
      createCardRequest(columnId, { title }),
    onSuccess: (card) => {
      patchBoard(queryClient, boardId, (board) => ({
        ...board,
        columns: board.columns.map((column) =>
          column.id === card.columnId ? { ...column, cards: [...column.cards, card] } : column,
        ),
      }));
    },
    onError: (error) => {
      showToast(apiErrorMessage(error, 'Could not add the card'));
    },
  });
}

export function useUpdateCard(boardId: string) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ cardId, input }: { cardId: string; input: UpdateCardInput }) =>
      updateCardRequest(cardId, input),
    onSuccess: (card) => {
      patchBoard(queryClient, boardId, (board) => replaceCard(board, card));
    },
    onError: (error) => {
      showToast(apiErrorMessage(error, 'Could not save the card'));
    },
  });
}

export function useDeleteCard(boardId: string) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: deleteCardRequest,
    onMutate: (cardId: string) => {
      const snapshot = queryClient.getQueryData<BoardDetailDto>(boardKey(boardId));

      patchBoard(queryClient, boardId, (board) => ({
        ...board,
        columns: board.columns.map((column) => ({
          ...column,
          cards: column.cards.filter((card) => card.id !== cardId),
        })),
      }));

      return { snapshot };
    },
    onError: (error, _variables, context) => {
      if (context?.snapshot) {
        queryClient.setQueryData(boardKey(boardId), context.snapshot);
      }

      showToast(apiErrorMessage(error, 'Could not delete the card'));
    },
  });
}
