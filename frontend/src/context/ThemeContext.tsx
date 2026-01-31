import React, { createContext, useContext, useEffect, useState } from 'react';

type ThemeVariant = 'pitaya' | 'notion';
type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
    variant: ThemeVariant;
    mode: ThemeMode;
    toggleMode: () => void;
    setVariant: (variant: ThemeVariant) => void;
    setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [variant, setVariant] = useState<ThemeVariant>(() => {
        const saved = localStorage.getItem('theme-variant') as ThemeVariant;
        return (saved && ['pitaya', 'notion'].includes(saved)) ? saved : 'pitaya';
    });

    const [mode, setMode] = useState<ThemeMode>(() => {
        const saved = localStorage.getItem('theme-mode') as ThemeMode;
        if (saved && ['light', 'dark'].includes(saved)) return saved;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });

    useEffect(() => {
        const root = window.document.documentElement;
        // Remove all possible theme classes
        root.classList.remove('light', 'dark', 'theme-pitaya', 'theme-notion');

        // Add current classes
        root.classList.add(mode);
        root.classList.add(`theme-${variant}`);

        localStorage.setItem('theme-variant', variant);
        localStorage.setItem('theme-mode', mode);
    }, [variant, mode]);

    const toggleMode = () => {
        setMode(prev => (prev === 'light' ? 'dark' : 'light'));
    };

    return (
        <ThemeContext.Provider value={{ variant, mode, toggleMode, setVariant, setMode }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
