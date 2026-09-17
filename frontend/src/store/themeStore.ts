// src/store/themeStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeStore {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
    /** Resolves 'system' against the OS preference. */
    getResolved: () => ResolvedTheme;
}

function resolveTheme(theme: Theme): ResolvedTheme {
    if (theme !== 'system') return theme;
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
    const resolved = resolveTheme(theme);
    document.documentElement.setAttribute('data-theme', resolved);
}

export const useThemeStore = create<ThemeStore>()(
    persist(
        (set, get) => ({
            theme: 'light',

            setTheme: (theme) => {
                applyTheme(theme);
                set({ theme });
            },

            toggleTheme: () => {
                const current = get().theme;
                // Cycle: light → dark → system → light
                const next: Theme =
                    current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light';
                applyTheme(next);
                set({ theme: next });
            },

            getResolved: () => resolveTheme(get().theme),
        }),
        {
            name: 'pharmacypos-theme',
            onRehydrateStorage: () => (state) => {
                if (state?.theme) applyTheme(state.theme);
            },
        }
    )
);

// Listen for OS-level changes when theme === 'system'
if (typeof window !== 'undefined') {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', () => {
        const { theme } = useThemeStore.getState();
        if (theme === 'system') {
            applyTheme('system');
        }
    });
}