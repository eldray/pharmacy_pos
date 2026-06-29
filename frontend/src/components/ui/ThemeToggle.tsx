import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';

interface ThemeToggleProps {
    className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
    const { theme, toggleTheme } = useThemeStore();

    return (
        <button
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            className={`
                relative inline-flex items-center justify-center
                w-9 h-9 rounded-lg
                text-gray-500 hover:text-gray-700
                hover:bg-gray-100
                dark:text-gray-400 dark:hover:text-gray-200
                dark:hover:bg-gray-800
                transition-all duration-200
                focus-visible:outline-2 focus-visible:outline-purple-500
                ${className}
            `}
        >
            {theme === 'light' ? (
                <Moon className="h-4 w-4" />
            ) : (
                <Sun className="h-4 w-4" />
            )}
        </button>
    );
};