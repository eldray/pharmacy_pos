// src/components/ui/Card.tsx
import React from 'react';
import { cn } from '@/lib/utils';

/* ─── Base Card ──────────────────────────────────────────────────────────────── */
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  /** Remove default padding — useful when the card contains a table or image flush to the edge */
  noPadding?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, noPadding = false, style, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('rounded-xl theme-transition', !noPadding && 'p-5', className)}
      style={{
        backgroundColor: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-card)',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
);
Card.displayName = 'Card';

/* ─── Card Header ────────────────────────────────────────────────────────────── */
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  action?: React.ReactNode;  // right-side slot — buttons, badges, etc.
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title, description, action, className, ...props
}) => (
  <div
    className={cn('flex items-start justify-between gap-4 mb-4', className)}
    {...props}
  >
    <div>
      <h3
        className="text-sm font-semibold leading-tight"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {title}
      </h3>
      {description && (
        <p
          className="text-xs mt-0.5"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {description}
        </p>
      )}
    </div>
    {action && <div className="flex-shrink-0">{action}</div>}
  </div>
);

/* ─── Card Footer ────────────────────────────────────────────────────────────── */
interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, className, ...props }) => (
  <div
    className={cn('flex items-center justify-end gap-2 mt-4 pt-4', className)}
    style={{ borderTop: '1px solid var(--color-border)' }}
    {...props}
  >
    {children}
  </div>
);

/* ─── Stat Card (convenience wrapper for dashboard metrics) ──────────────────── */
interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  icon?: React.ElementType;
  /** Maps to theme semantic color tokens */
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'accent';
  className?: string;
}

const statVariantMap = {
  success: { iconColor: 'var(--color-success)', iconBg: 'var(--color-success-light)', changeColor: 'var(--color-success-text)' },
  warning: { iconColor: 'var(--color-warning)', iconBg: 'var(--color-warning-light)', changeColor: 'var(--color-warning-text)' },
  danger: { iconColor: 'var(--color-danger)', iconBg: 'var(--color-danger-light)', changeColor: 'var(--color-danger-text)' },
  info: { iconColor: 'var(--color-info)', iconBg: 'var(--color-info-light)', changeColor: 'var(--color-info-text)' },
  accent: { iconColor: 'var(--color-accent)', iconBg: 'var(--color-accent-light)', changeColor: 'var(--color-accent-text)' },
};

export const StatCard: React.FC<StatCardProps> = ({
  label, value, change, icon: Icon, variant = 'accent', className
}) => {
  const v = statVariantMap[variant];

  return (
    <Card className={cn('cursor-default', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text-secondary)' }}>
            {label}
          </p>
          <p className="text-2xl font-bold mt-1 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
            {value}
          </p>
          {change && (
            <p className="text-xs mt-1 font-medium" style={{ color: v.changeColor }}>
              {change}
            </p>
          )}
        </div>
        {Icon && (
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: v.iconBg }}
          >
            <Icon className="h-5 w-5" style={{ color: v.iconColor }} />
          </div>
        )}
      </div>
    </Card>
  );
};