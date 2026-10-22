import React, { createContext, useContext, useEffect, useState } from 'react';

type ThemeVariant = 'pitaya' | 'notion' | 'cared';
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
        // Cared es el tema por defecto; quien ya eligió otro estilo conserva su elección
        return (saved && ['pitaya', 'notion', 'cared'].includes(saved)) ? saved : 'cared';
    });

    const [mode, setMode] = useState<ThemeMode>(() => {
        const saved = localStorage.getItem('theme-mode') as ThemeMode;
        if (saved && ['light', 'dark'].includes(saved)) return saved;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });

    useEffect(() => {
        const root = window.document.documentElement;
        // Remove all possible theme classes
        root.classList.remove('light', 'dark', 'theme-pitaya', 'theme-notion', 'theme-cared');

        // Cared es un tema oscuro único: siempre se pinta en oscuro sin tocar el modo guardado
        const effectiveMode = variant === 'cared' ? 'dark' : mode;
        root.classList.add(effectiveMode);
        root.classList.add(`theme-${variant}`);

        localStorage.setItem('theme-variant', variant);
        localStorage.setItem('theme-mode', mode);
    }, [variant, mode]);

    const toggleMode = () => {
        // Desde Cared, el botón de modo regresa al estilo Pitaya en claro
        if (variant === 'cared') {
            setVariant('pitaya');
            setMode('light');
            return;
        }
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
