'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ThemeContextType {
  isGlowMode: boolean;
  setIsGlowMode: (isGlow: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isGlowMode, setIsGlowMode] = useState(false);

  useEffect(() => {
    const storedGlowMode = localStorage.getItem('glowMode') === 'true';
    setIsGlowMode(storedGlowMode);
  }, []);

  useEffect(() => {
    localStorage.setItem('glowMode', String(isGlowMode));
    document.documentElement.setAttribute('data-glow-mode', String(isGlowMode));
  }, [isGlowMode]);

  return (
    <ThemeContext.Provider value={{ isGlowMode, setIsGlowMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
