import { Link, useParams } from 'react-router-dom';
import { StateMessage } from '@/components/StateMessage';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useBoard } from './hooks';

function BoardSkeleton() {
  return (
    <div className="flex gap-4" aria-busy="true">
      {[0, 1, 2].map((index) => (
        <Skeleton key={index} className="h-64 w-72 shrink-0" />
      ))}
    </div>
  );
}

export function BoardPage() {
  const { boardId = '' } = useParams();
  const board = useBoard(boardId);

  return (
    <main className="flex flex-1 flex-col px-4 py-6">
      <div className="mb-5 flex items-center gap-3">
        <Link to="/boards" className="text-sm text-content-muted hover:text-content">
          ← All boards
        </Link>
        {board.isSuccess && (
          <h1 className="truncate text-xl font-semibold text-content">{board.data.title}</h1>
        )}
      </div>

      {board.isPending && <BoardSkeleton />}

      {board.isError && (
        <StateMessage
          title="Could not open this board"
          description="It may have been deleted, or the request failed."
          action={
            <Button variant="secondary" onClick={() => void board.refetch()}>
              Retry
            </Button>
          }
        />
      )}

      {board.isSuccess && board.data.columns.length === 0 && (
        <StateMessage title="This board has no columns yet" />
      )}

      {board.isSuccess && board.data.columns.length > 0 && (
        // On a phone the columns scroll sideways instead of squeezing
        <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
          {board.data.columns.map((column) => (
            <section
              key={column.id}
              aria-label={column.title}
              className="flex w-72 shrink-0 flex-col gap-2 rounded-lg border border-border bg-surface p-3"
            >
              <header className="flex items-baseline justify-between gap-2">
                <h2 className="truncate font-medium text-content">{column.title}</h2>
                <span className="text-xs text-content-muted">{column.cards.length}</span>
              </header>

              <ul className="flex flex-col gap-2">
                {column.cards.map((card) => (
                  <li
                    key={card.id}
                    className="rounded-md border border-border bg-surface-muted px-3 py-2 text-sm text-content"
                  >
                    {card.title}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
