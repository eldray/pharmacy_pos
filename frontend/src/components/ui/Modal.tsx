// src/components/ui/Modal.tsx
import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

const WIDTHS: Record<ModalSize, number> = { sm: 400, md: 520, lg: 680, xl: 860 };

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  iconTone?: 'accent' | 'warning' | 'danger' | 'success';
  size?: ModalSize;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const ICON_TONES: Record<NonNullable<ModalProps['iconTone']>, React.CSSProperties> = {
  accent: { background: 'var(--color-accent-light)', color: 'var(--color-accent-text)' },
  warning: { background: 'var(--color-warning-light)', color: 'var(--color-warning-text)' },
  danger: { background: 'var(--color-danger-light)', color: 'var(--color-danger-text)' },
  success: { background: 'var(--color-success-light)', color: 'var(--color-success-text)' },
};

/**
 * The dialog shell every overlay in the app should use: one overlay colour, one
 * radius/shadow, Escape and click-outside to dismiss, and a body that scrolls
 * independently of the header and footer. Marked `no-print` so a modal left open
 * never ends up on the printer.
 */
export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  icon,
  iconTone = 'accent',
  size = 'md',
  footer,
  children,
  className,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 no-print"
      style={{ background: 'var(--color-bg-overlay)', zIndex: 'var(--z-modal)' }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={cn('rounded-[12px] overflow-hidden flex flex-col', className)}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-xl)',
          width: '100%',
          maxWidth: WIDTHS[size],
          maxHeight: '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{
            borderBottom: '1px solid var(--color-border)',
            background: 'var(--color-bg-surface)',
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {icon && (
              <div
                className="flex items-center justify-center flex-shrink-0"
                style={{ width: 24, height: 24, borderRadius: 6, ...ICON_TONES[iconTone] }}
              >
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h2
                className="text-[0.82rem] font-bold leading-none truncate"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {title}
              </h2>
              {subtitle && (
                <p className="text-[0.68rem] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="flex items-center justify-center cursor-pointer transition-colors duration-100 flex-shrink-0"
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-muted)',
            }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          className="overflow-y-auto flex-1"
          style={{ padding: 16, background: 'var(--color-bg-elevated)' }}
        >
          {children}
        </div>

        {footer && (
          <div
            className="flex gap-2 p-3 flex-shrink-0"
            style={{
              borderTop: '1px solid var(--color-border)',
              background: 'var(--color-bg-surface)',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

Modal.displayName = 'Modal';
