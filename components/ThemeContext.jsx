'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('dark');
  const pathname = usePathname();

  useEffect(() => {
    // Load from local storage
    const storedTheme = localStorage.getItem('ssr_theme');
    if (storedTheme === 'light') {
      setTheme('light');
    }
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const nextTheme = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('ssr_theme', nextTheme);
      return nextTheme;
    });
  };

  useEffect(() => {
    const root = document.documentElement;
    // Always keep home page dark as requested by the user
    if (theme === 'light' && pathname !== '/') {
      root.classList.add('theme-light');
    } else {
      root.classList.remove('theme-light');
    }
  }, [theme, pathname]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
