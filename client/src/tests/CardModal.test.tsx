import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { CardDto } from '@kanban/shared';
import { CardModal } from '@/features/board/CardModal';

const baseCard: CardDto = {
  id: 'card-1',
  title: 'Ship the demo',
  description: 'Record a GIF',
  columnId: 'column-1',
  position: 1024,
  dueDate: '2026-12-01T00:00:00.000Z',
  labelColor: 'green',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderModal(card: CardDto = baseCard) {
  const onSave = vi.fn();
  const onDelete = vi.fn();
  const onClose = vi.fn();

  render(
    <CardModal card={card} saving={false} onSave={onSave} onDelete={onDelete} onClose={onClose} />,
  );

  return { onSave, onDelete, onClose, user: userEvent.setup() };
}

describe('CardModal', () => {
  it('opens with the current values of the card', () => {
    renderModal();

    expect(screen.getByLabelText('Title')).toHaveValue('Ship the demo');
    expect(screen.getByLabelText('Description')).toHaveValue('Record a GIF');
    expect(screen.getByLabelText('Due date')).toHaveValue('2026-12-01');
    expect(screen.getByRole('button', { name: 'Label green' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('is a dialog that takes focus and can be dismissed with Escape', async () => {
    const { onClose, user } = renderModal();

    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    await waitFor(() => expect(screen.getByLabelText('Title')).toHaveFocus());

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('sends null for the fields that were cleared', async () => {
    const { onSave, user } = renderModal();

    await user.clear(screen.getByLabelText('Description'));
    await user.clear(screen.getByLabelText('Due date'));
    await user.click(screen.getByRole('button', { name: 'No label' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    // An empty field means "clear it", which the API expresses as null rather
    // than as an absent key, since an absent key leaves the value alone
    expect(onSave).toHaveBeenCalledWith({
      title: 'Ship the demo',
      description: null,
      dueDate: null,
      labelColor: null,
    });
  });

  it('sends the edited title and the chosen label', async () => {
    const { onSave, user } = renderModal();

    await user.clear(screen.getByLabelText('Title'));
    await user.type(screen.getByLabelText('Title'), 'Renamed card');
    await user.click(screen.getByRole('button', { name: 'Label violet' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Renamed card', labelColor: 'violet' }),
    );
  });

  it('refuses to save a card with a blank title', async () => {
    const { onSave, user } = renderModal();

    await user.clear(screen.getByLabelText('Title'));

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('asks before deleting the card', async () => {
    const { onDelete, user } = renderModal();

    await user.click(screen.getByRole('button', { name: 'Delete card' }));
    expect(onDelete).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Confirm delete' }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('keeps the edits when the delete is called off', async () => {
    const { onDelete, user } = renderModal();

    await user.clear(screen.getByLabelText('Title'));
    await user.type(screen.getByLabelText('Title'), 'Still here');
    await user.click(screen.getByRole('button', { name: 'Delete card' }));
    await user.click(screen.getByRole('button', { name: 'Keep' }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Title')).toHaveValue('Still here');
  });
});
