import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createBoardSchema } from '@kanban/shared';
import { Button } from '@/components/ui/Button';
import { useCreateBoard } from './hooks';

export function CreateBoardForm() {
  const createBoard = useCreateBoard();

  const form = useForm({
    resolver: zodResolver(createBoardSchema),
    defaultValues: { title: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await createBoard.mutateAsync(values);
    form.reset();
  });

  return (
    <form noValidate className="flex items-start gap-2" onSubmit={onSubmit}>
      <div className="flex flex-col gap-1.5">
        <input
          aria-label="New board title"
          placeholder="New board title"
          className="h-10 w-56 rounded-md border border-border bg-surface px-3 text-sm text-content placeholder:text-content-muted"
          {...form.register('title')}
        />
        {form.formState.errors.title && (
          <p role="alert" className="text-sm text-danger">
            {form.formState.errors.title.message}
          </p>
        )}
      </div>

      <Button type="submit" loading={createBoard.isPending}>
        Add board
      </Button>
    </form>
  );
}
