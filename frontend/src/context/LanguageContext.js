import React, { createContext, useContext, useState } from 'react';

const LanguageContext = createContext({ activeLang: 'en-IN', setActiveLang: () => {} });

export function LanguageProvider({ children }) {
  const [activeLang, setActiveLang] = useState('en-IN');
  return (
    <LanguageContext.Provider value={{ activeLang, setActiveLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
