// src/store/themeStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';

interface ThemeStore {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

function applyTheme(theme: Theme) {
    document.documentElement.setAttribute('data-theme', theme);
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
                const next: Theme = get().theme === 'light' ? 'dark' : 'light';
                applyTheme(next);
                set({ theme: next });
            }
        }),
        {
            name: 'pharmacypos-theme',
            onRehydrateStorage: () => (state) => {
                // Apply persisted theme on page load before first render
                if (state?.theme) applyTheme(state.theme);
            }
        }
    )
);