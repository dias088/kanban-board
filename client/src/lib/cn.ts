import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Joins class names and lets later Tailwind utilities win over earlier ones. */
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
