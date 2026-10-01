import { useEffect, useId, useRef, type ReactNode } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Minimal modal with the three things a dialog owes a keyboard user: focus
 * moves in on open, Tab cannot escape, and focus returns where it came from.
 */
export function Modal({ title, onClose, children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;

    (panel?.querySelector<HTMLElement>('[data-autofocus]') ?? panel)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !panel) {
        return;
      }

      const focusable = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!first || !last) {
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center"
      onMouseDown={(event) => {
        // Only a click on the backdrop itself closes, never a drag that ended there
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="w-full max-w-lg rounded-xl border border-border bg-surface p-5 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-base font-semibold text-content">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="rounded-md px-2 text-content-muted hover:bg-surface-muted hover:text-content"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
