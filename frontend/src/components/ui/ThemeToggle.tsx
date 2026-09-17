// src/components/ui/ThemeToggle.tsx
import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';

interface ThemeToggleProps {
    className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
    const { theme, toggleTheme } = useThemeStore();

    // Cycle: light → dark → system → light
    const Icon = theme === 'light' ? Moon : theme === 'dark' ? Sun : Monitor;
    const nextLabel =
        theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';

    return (
        <button
            onClick={toggleTheme}
            aria-label={`Switch to ${nextLabel} mode`}
            title={`Theme: ${theme} — click to switch to ${nextLabel}`}
            className={`relative inline-flex items-center justify-center ${className}`}
            style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-sm)',
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                padding: 4,
                transition: 'background-color 150ms ease, color 150ms ease',
            }}
            onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-subtle)';
                (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)';
            }}
            onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
                (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)';
            }}
        >
            <Icon style={{ width: 16, height: 16 }} />
        </button>
    );
};