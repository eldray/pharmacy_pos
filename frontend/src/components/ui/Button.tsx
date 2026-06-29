// src/components/ui/Button.tsx
import React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
type Size = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: React.ReactNode;
  className?: string;
}

const base =
  'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 ' +
  'focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none';

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2   text-sm gap-2',
  lg: 'px-5 py-2.5 text-base gap-2',
  icon: 'w-9 h-9 p-0',
};

// Each variant maps to a style factory so hover is handled via onMouse*
// We keep static styles here and apply dynamic hover in the component.
const variantStyles: Record<Variant, React.CSSProperties> = {
  primary: {
    background: 'var(--gradient-accent)',
    color: 'var(--color-accent-fg)',
  },
  secondary: {
    background: 'var(--color-bg-subtle)',
    color: 'var(--color-text-primary)',
    border: '1px solid var(--color-border)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--color-text-secondary)',
  },
  outline: {
    background: 'transparent',
    color: 'var(--color-accent-text)',
    border: '1px solid var(--color-accent)',
  },
  danger: {
    background: 'var(--color-danger-light)',
    color: 'var(--color-danger-text)',
    border: '1px solid var(--color-danger)',
  },
};

const variantHover: Record<Variant, React.CSSProperties> = {
  primary: { opacity: '0.90', transform: 'translateY(-1px)' } as React.CSSProperties,
  secondary: { backgroundColor: 'var(--color-border)', transform: 'translateY(-1px)' },
  ghost: { backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-primary)' },
  outline: { backgroundColor: 'var(--color-accent-light)', transform: 'translateY(-1px)' },
  danger: { opacity: '0.85', transform: 'translateY(-1px)' } as React.CSSProperties,
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, children, style, onMouseEnter, onMouseLeave, ...props }, ref) => {
    const [hovered, setHovered] = React.useState(false);

    const computedStyle: React.CSSProperties = {
      ...variantStyles[variant],
      ...(hovered ? variantHover[variant] : {}),
      transition: 'all var(--transition-fast)',
      ...style,
    };

    return (
      <button
        ref={ref}
        className={cn(base, sizes[size], className)}
        style={computedStyle}
        onMouseEnter={(e) => { setHovered(true); onMouseEnter?.(e); }}
        onMouseLeave={(e) => { setHovered(false); onMouseLeave?.(e); }}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';