import { Button } from './Button';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Guards the deletes that take other things down with them. */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm text-content-muted">{description}</p>

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="danger" data-autofocus onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
