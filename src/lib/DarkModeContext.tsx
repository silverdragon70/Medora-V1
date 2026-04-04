import React, { createContext, useContext, useState, useEffect } from 'react';
import { settingsService } from '@/services/settingsService';

interface DarkModeContextType {
  isDarkMode: boolean;
  setDarkMode: (v: boolean) => void;
}

const DarkModeContext = createContext<DarkModeContextType>({
  isDarkMode: false,
  setDarkMode: () => {},
});

export const useDarkMode = () => useContext(DarkModeContext);

export const DarkModeProvider = ({ children }: { children: React.ReactNode }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Load from Dexie on mount
  useEffect(() => {
    settingsService.getDarkMode().then(v => {
      setIsDarkMode(v);
      document.documentElement.classList.toggle('dark', v);
    });
  }, []);

  // Apply to DOM whenever state changes
  const setDarkMode = async (v: boolean) => {
    setIsDarkMode(v);
    document.documentElement.classList.toggle('dark', v);
    await settingsService.set('darkMode', String(v));
  };

  return (
    <DarkModeContext.Provider value={{ isDarkMode, setDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
};
