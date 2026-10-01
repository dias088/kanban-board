import { Link } from 'react-router-dom';
import { StateMessage } from '@/components/StateMessage';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { CreateBoardForm } from './CreateBoardForm';
import { useBoards, useDeleteBoard } from './hooks';

function BoardsSkeleton() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
      {[0, 1, 2].map((index) => (
        <li key={index}>
          <Skeleton className="h-24 w-full" />
        </li>
      ))}
    </ul>
  );
}

export function BoardsPage() {
  const boards = useBoards();
  const deleteBoard = useDeleteBoard();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-xl font-semibold text-content">Your boards</h1>
        <CreateBoardForm />
      </div>

      {boards.isPending && <BoardsSkeleton />}

      {boards.isError && (
        <StateMessage
          title="Could not load your boards"
          description="The request failed. Check that the API is running and try again."
          action={
            <Button variant="secondary" onClick={() => void boards.refetch()}>
              Retry
            </Button>
          }
        />
      )}

      {boards.isSuccess && boards.data.length === 0 && (
        <StateMessage
          title="No boards yet"
          description="Create your first board above to start adding columns and cards."
        />
      )}

      {boards.isSuccess && boards.data.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {boards.data.map((board) => (
            <li
              key={board.id}
              className="group relative rounded-lg border border-border bg-surface p-4 transition hover:border-accent"
            >
              <Link to={`/boards/${board.id}`} className="block">
                <h2 className="truncate pr-8 font-medium text-content">{board.title}</h2>
                <p className="mt-1 text-sm text-content-muted">
                  {board.columnCount} {board.columnCount === 1 ? 'column' : 'columns'} ·{' '}
                  {board.cardCount} {board.cardCount === 1 ? 'card' : 'cards'}
                </p>
              </Link>

              <Button
                variant="ghost"
                size="sm"
                aria-label={`Delete board ${board.title}`}
                className="absolute right-2 top-2 opacity-0 transition focus-visible:opacity-100 group-hover:opacity-100"
                onClick={() => deleteBoard.mutate(board.id)}
              >
                <span aria-hidden="true">×</span>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
