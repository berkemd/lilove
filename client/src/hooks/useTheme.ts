import { useState, useEffect } from 'react';

export function useTheme() {
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>('system');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    
    if (savedTheme) {
      setThemeState(savedTheme);
      updateDOMTheme(savedTheme);
    } else {
      setThemeState('system');
      updateDOMTheme('system');
    }
  }, []);

  const setTheme = (newTheme: 'light' | 'dark' | 'system') => {
    setThemeState(newTheme);
    
    if (newTheme === 'system') {
      localStorage.removeItem('theme');
      updateDOMTheme('system');
    } else {
      localStorage.setItem('theme', newTheme);
      updateDOMTheme(newTheme);
    }
  };

  const updateDOMTheme = (themeValue: 'light' | 'dark' | 'system') => {
    if (themeValue === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else if (themeValue === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return { theme, setTheme };
}
