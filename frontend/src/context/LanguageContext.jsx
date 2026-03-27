import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const LanguageContext = createContext({ activeLang: 'en-IN', setActiveLang: () => {} });

export function LanguageProvider({ children }) {
  const [activeLang, setActiveLang] = useState(() => {
    // Check for stored language preference
    const storedLang = localStorage.getItem('preferredLanguage');
    return storedLang || 'en-IN';
  });
  const { i18n } = useTranslation();

  useEffect(() => {
    // E.g 'en-IN' -> 'en'
    const langCode = activeLang.split('-')[0];
    i18n.changeLanguage(langCode);
    // Store the preference whenever it changes
    localStorage.setItem('preferredLanguage', activeLang);
  }, [activeLang, i18n]);

  return (
    <LanguageContext.Provider value={{ activeLang, setActiveLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
