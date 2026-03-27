import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useTranslation } from 'react-i18next';

const LANG_OPTIONS = [
  { code: 'en-IN', label: 'English', native: 'English' },
  { code: 'hi-IN', label: 'Hindi', native: 'हिंदी' },
  { code: 'te-IN', label: 'Telugu', native: 'తెలుగు' },
  { code: 'ta-IN', label: 'Tamil', native: 'தமிழ்' },
  { code: 'kn-IN', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml-IN', label: 'Malayalam', native: 'മലയാളം' },
  { code: 'mr-IN', label: 'Marathi', native: 'मराठी' },
  { code: 'gu-IN', label: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'pa-IN', label: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'bn-IN', label: 'Bengali', native: 'বাংলা' },
  { code: 'ur-IN', label: 'Urdu', native: 'اردو' },
];

export default function LanguageSelectionModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState('en-IN');
  const { setActiveLang } = useLanguage();
  const { t } = useTranslation();

  useEffect(() => {
    // Check if user is on desktop/laptop (screen width > 768px)
    const isDesktop = window.matchMedia('(min-width: 769px)').matches;
    
    // Check if language has been selected in this session
    const hasSelectedInSession = sessionStorage.getItem('languageSelectedThisSession');
    
    // Show modal on desktop every time unless already selected in this session
    if (isDesktop && !hasSelectedInSession) {
      setIsOpen(true);
    }
  }, []);

  const handleLanguageSelect = () => {
    setActiveLang(selectedLang);
    // Use sessionStorage instead of localStorage - will reset on browser close
    sessionStorage.setItem('languageSelectedThisSession', 'true');
    sessionStorage.setItem('preferredLanguage', selectedLang);
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          zIndex: 9998,
          backdropFilter: 'blur(4px)',
        }}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-labelledby="lang-modal-title"
        aria-modal="true"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'var(--surface)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow-xl)',
          zIndex: 9999,
          width: '90%',
          maxWidth: '600px',
          maxHeight: '85vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'var(--secondary)',
            color: 'white',
            padding: '24px 28px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 8l6 6" />
              <path d="M4 14l6-6 2-3" />
              <path d="M2 5h12" />
              <path d="M7 2h1" />
              <path d="M22 22l-5-10-5 10" />
              <path d="M14 18h6" />
            </svg>
            <h2
              id="lang-modal-title"
              style={{
                margin: 0,
                fontSize: '1.5rem',
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              {t('lang_modal.title', 'Select Your Preferred Language')}
            </h2>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: '0.9rem',
              color: 'rgba(255, 255, 255, 0.85)',
              lineHeight: 1.4,
            }}
          >
            {t('lang_modal.subtitle', 'Choose your language to use the application. You can change this anytime from the language menu.')}
          </p>
        </div>

        {/* Language Grid */}
        <div
          style={{
            padding: '28px',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: '12px',
            }}
          >
            {LANG_OPTIONS.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setSelectedLang(lang.code)}
                style={{
                  padding: '16px',
                  background:
                    selectedLang === lang.code
                      ? 'var(--primary)'
                      : 'var(--background)',
                  border:
                    selectedLang === lang.code
                      ? '2px solid var(--primary)'
                      : '2px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 200ms ease',
                  color:
                    selectedLang === lang.code
                      ? 'white'
                      : 'var(--text-primary)',
                  fontWeight: selectedLang === lang.code ? 700 : 500,
                  fontSize: '0.9rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '80px',
                }}
                onMouseOver={(e) => {
                  if (selectedLang !== lang.code) {
                    e.currentTarget.style.background = 'var(--primary-light)';
                    e.currentTarget.style.borderColor = 'var(--primary)';
                  }
                }}
                onMouseOut={(e) => {
                  if (selectedLang !== lang.code) {
                    e.currentTarget.style.background = 'var(--background)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }
                }}
                aria-pressed={selectedLang === lang.code}
              >
                <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                  {lang.native}
                </span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    opacity: 0.8,
                    fontWeight: 500,
                  }}
                >
                  {lang.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer with action button */}
        <div
          style={{
            padding: '20px 28px',
            borderTop: '1px solid var(--border)',
            background: 'var(--background)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 12,
          }}
        >
          <button
            onClick={handleLanguageSelect}
            style={{
              padding: '12px 32px',
              background: 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: 700,
              transition: 'background 200ms ease',
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.background = 'var(--primary-dark)')
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.background = 'var(--primary)')
            }
          >
            {t('lang_modal.btn_continue', 'Continue')}
          </button>
        </div>
      </div>
    </>
  );
}
