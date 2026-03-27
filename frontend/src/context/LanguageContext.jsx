import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const LanguageContext = createContext({ activeLang: 'en-IN', setActiveLang: () => {} });

export function LanguageProvider({ children }) {
  const [activeLang, setActiveLang] = useState(() => {
    // Check for stored language preference in current session only
    const storedLang = sessionStorage.getItem('preferredLanguage');
    return storedLang || 'en-IN';
  });
  const { i18n } = useTranslation();

  useEffect(() => {
    // E.g 'en-IN' -> 'en'
    const langCode = activeLang.split('-')[0];
    i18n.changeLanguage(langCode);
    // Store the preference in session storage (resets on browser close)
    sessionStorage.setItem('preferredLanguage', activeLang);
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
