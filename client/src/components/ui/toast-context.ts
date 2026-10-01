import { createContext, useContext } from 'react';

export interface ToastContextValue {
  showToast: (message: string, tone?: 'error' | 'info') => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used inside a ToastProvider');
  }

  return context;
}
