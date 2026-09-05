'use client';

import React, { createContext, useContext, useMemo } from 'react';
import toast, { Toaster, type Toast } from 'react-hot-toast';

export type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info';

export interface ShowToastOptions {
  title: string;
  description?: string;
  duration?: number;
  variant?: ToastVariant;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastContextValue {
  showToast: (options: ShowToastOptions) => void;
  dismissToast: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const showToast = React.useCallback((options: ShowToastOptions) => {
    if (!options.title) {
      return;
    }

    const variant = options.variant ?? 'default';

    const renderContent = (t: Toast) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <strong style={{ fontWeight: 600 }}>{options.title}</strong>
        {options.description ? (
          <span style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))' }}>{options.description}</span>
        ) : null}
        {options.actionLabel ? (
          <button
            type="button"
            onClick={() => {
              options.onAction?.();
              toast.dismiss(t.id);
            }}
            style={{
              alignSelf: 'flex-start',
              marginTop: 4,
              padding: '4px 12px',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              borderRadius: 9999,
              cursor: 'pointer',
              border: '1px solid currentColor',
              background: 'transparent',
              color: 'inherit',
            }}
          >
            {options.actionLabel}
          </button>
        ) : null}
      </div>
    );

    const opts = options.duration !== undefined ? { duration: options.duration } : undefined;

    switch (variant) {
      case 'success':
        toast.success(renderContent, opts);
        break;
      case 'error':
        toast.error(renderContent, opts);
        break;
      case 'warning':
        toast(renderContent, { ...opts, icon: '⚠️' });
        break;
      case 'info':
        toast(renderContent, { ...opts, icon: 'ℹ️' });
        break;
      default:
        toast(renderContent, opts);
    }
  }, []);

  const value = useMemo<ToastContextValue>(() => ({
    showToast,
    dismissToast: () => toast.dismiss(),
  }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            maxWidth: 'min(90vw, 560px)',
            width: 'max-content',
            background: 'hsl(var(--card))',
            color: 'hsl(var(--card-foreground))',
            border: '1px solid hsl(var(--border))',
            boxShadow: '0 4px 16px hsl(var(--foreground) / 0.08)',
          },
          success: {
            iconTheme: { primary: 'hsl(var(--success))', secondary: 'hsl(var(--success-foreground))' },
            style: { borderColor: 'hsl(var(--success) / 0.35)' },
          },
          error: {
            iconTheme: { primary: 'hsl(var(--destructive))', secondary: 'hsl(var(--destructive-foreground))' },
            style: { borderColor: 'hsl(var(--destructive) / 0.35)' },
          },
        }}
      />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
