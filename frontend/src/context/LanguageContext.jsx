import React, { createContext, useContext, useState } from 'react';

const LanguageContext = createContext({
  activeLang: 'en',
  setActiveLang: () => {},
  showLanguageSelector: false,
  setShowLanguageSelector: () => {},
});

/**
 * LanguageProvider component
 * Manages language selection with localStorage persistence
 */
export function LanguageProvider({ children }) {
<<<<<<< Updated upstream
  const [activeLang, setActiveLang] = useState('en-IN');
=======
  const [activeLang, setActiveLang] = useState('en');
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const { i18n } = useTranslation();

  // Initialize language on mount
  useEffect(() => {
    const LANG_STORAGE_KEY = 'crm_selected_language';

    // Check if user has already selected a language
    const savedLanguage = localStorage.getItem(LANG_STORAGE_KEY);

    if (savedLanguage) {
      // Use saved language preference
      setActiveLang(savedLanguage);
    }
  }, []);

  // Update i18n when active language changes
  useEffect(() => {
    i18n.changeLanguage(activeLang);
  }, [activeLang, i18n]);

  // Handle language selection
  const handleSetActiveLang = (langCode) => {
    const LANG_STORAGE_KEY = 'crm_selected_language';

    setActiveLang(langCode);
    localStorage.setItem(LANG_STORAGE_KEY, langCode);
    setShowLanguageSelector(false);
  };

  const value = {
    activeLang,
    setActiveLang: handleSetActiveLang,
    showLanguageSelector,
    setShowLanguageSelector,
  };

>>>>>>> Stashed changes
  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
