// src/components/ui/Badge.tsx
import React from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'admin' | 'cashier' | 'pharmacist' | 'lab';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  default: {
    backgroundColor: 'var(--color-bg-subtle)',
    color: 'var(--color-text-secondary)',
  },
  success: {
    backgroundColor: 'var(--color-success-light)',
    color: 'var(--color-success-text)',
  },
  warning: {
    backgroundColor: 'var(--color-warning-light)',
    color: 'var(--color-warning-text)',
  },
  destructive: {
    backgroundColor: 'var(--color-danger-light)',
    color: 'var(--color-danger-text)',
  },
  info: {
    backgroundColor: 'var(--color-info-light)',
    color: 'var(--color-info-text)',
  },
  // Role variants — map to role badge tokens
  admin: {
    backgroundColor: 'var(--color-role-admin-bg)',
    color: 'var(--color-role-admin)',
  },
  cashier: {
    backgroundColor: 'var(--color-role-cashier-bg)',
    color: 'var(--color-role-cashier)',
  },
  pharmacist: {
    backgroundColor: 'var(--color-role-officer-bg)',
    color: 'var(--color-role-officer)',
  },
  lab: {
    backgroundColor: 'var(--color-role-lab-bg)',
    color: 'var(--color-role-lab)',
  },
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', className, children, style, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        className
      )}
      style={{ ...variantStyles[variant], ...style }}
      {...props}
    >
      {children}
    </span>
  )
);

Badge.displayName = 'Badge';