import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

const accentMap = {
  '#6EE7F7': { primary: '#6EE7F7', hover: '#5AD4E3', glow: 'rgba(110,231,247,0.3)' },
  '#A78BFA': { primary: '#A78BFA', hover: '#9674F0', glow: 'rgba(167,139,250,0.3)' },
  '#34D399': { primary: '#34D399', hover: '#2BBF88', glow: 'rgba(52,211,153,0.3)' },
  '#FB923C': { primary: '#FB923C', hover: '#E8812E', glow: 'rgba(251,146,60,0.3)' },
  '#F43F5E': { primary: '#F43F5E', hover: '#E0354F', glow: 'rgba(244,63,94,0.3)' },
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [accentColor, setAccentColorState] = useState(localStorage.getItem('accentColor') || '#6EE7F7');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('accentColor', accentColor);
    const accent = accentMap[accentColor] || accentMap['#6EE7F7'];
    document.documentElement.style.setProperty('--accent-primary', accent.primary);
    document.documentElement.style.setProperty('--accent-hover', accent.hover);
    document.documentElement.style.setProperty('--accent-glow', accent.glow);
  }, [accentColor]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  const setAccentColor = (color) => setAccentColorState(color);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, accentColor, setAccentColor }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
