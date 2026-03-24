import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

i18n
  .use(HttpBackend) // Load translations via HTTP (from public/locales)
  .use(LanguageDetector) // Detect language from browser/localStorage
  .use(initReactI18next) // Pass the i18n instance to react-i18next
  .init({
    fallbackLng: 'en', // Fallback to English if translation is missing
    supportedLngs: ['en', 'hi', 'te', 'ta', 'kn', 'ml', 'mr', 'gu', 'pa', 'bn', 'ur'],
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json', // Path to translation files
    },
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    // Optional: caching / debug
    // debug: true,
  });

export default i18n;
