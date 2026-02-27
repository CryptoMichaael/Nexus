/**
 * ✅ THEME CONTEXT PROVIDER
 * Centralized theming for easy rebranding
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  brandName: string;
  logo: string;
  darkMode: boolean;
}

const defaultTheme: ThemeConfig = {
  primaryColor: '#3b82f6', // Blue
  secondaryColor: '#22c55e', // Green
  accentColor: '#f59e0b', // Amber
  brandName: 'Nexus Rewards',
  logo: '/logo.svg',
  darkMode: true,
};

const ThemeContext = createContext<{
  theme: ThemeConfig;
  updateTheme: (updates: Partial<ThemeConfig>) => void;
  toggleDarkMode: () => void;
}>({
  theme: defaultTheme,
  updateTheme: () => {},
  toggleDarkMode: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme);

  useEffect(() => {
    // ✅ Load theme from localStorage or API
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      try {
        setTheme({ ...defaultTheme, ...JSON.parse(savedTheme) });
      } catch {}
    }

    // Optional: Fetch from API for admin-configurable themes
    /*
    fetch('/api/config/theme')
      .then(res => res.json())
      .then(data => setTheme({ ...defaultTheme, ...data }))
      .catch(() => console.warn('Using default theme'));
    */
  }, []);

  const updateTheme = (updates: Partial<ThemeConfig>) => {
    const newTheme = { ...theme, ...updates };
    setTheme(newTheme);
    localStorage.setItem('theme', JSON.stringify(newTheme));
  };

  const toggleDarkMode = () => {
    updateTheme({ darkMode: !theme.darkMode });
  };

  return (
    <ThemeContext.Provider value={{ theme, updateTheme, toggleDarkMode }}>
      <div className={theme.darkMode ? 'dark' : ''}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
