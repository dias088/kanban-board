import type { LabelColor } from '@kanban/shared';

/** The palette lives in the shared package; these are its Tailwind equivalents. */
export const LABEL_CLASS: Record<LabelColor, string> = {
  gray: 'bg-slate-400',
  red: 'bg-red-500',
  amber: 'bg-amber-500',
  green: 'bg-emerald-500',
  blue: 'bg-blue-500',
  violet: 'bg-violet-500',
};

export const formatDueDate = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/** A due date is overdue once its day is behind today's. */
export const isOverdue = (iso: string): boolean => {
  const due = new Date(iso);
  const today = new Date();

  due.setHours(23, 59, 59, 999);

  return due.getTime() < today.getTime();
};
