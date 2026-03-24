import React from 'react';
import './LanguageSelector.css';

export default function LanguageSelector({ isOpen, onSelect }) {
  if (!isOpen) return null;

  const languages = [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', flag: '🇮🇳' },
  ];

  const handleLanguageSelect = (langCode) => {
    onSelect(langCode);
  };

  return (
    <div className="language-selector-overlay">
      <div className="language-selector-modal">
        {/* Header */}
        <div className="language-selector-header">
          <h1 className="language-selector-title">🌐 Select Your Language</h1>
          <h1 className="language-selector-title-hi">🌐 अपनी भाषा चुनें</h1>
        </div>

        {/* Subtitle */}
        <p className="language-selector-subtitle">
          Choose your preferred language to get started
        </p>
        <p className="language-selector-subtitle-hi">
          शुरुआत करने के लिए अपनी पसंदीदा भाषा चुनें
        </p>

        {/* Language Options */}
        <div className="language-options">
          {languages.map((lang) => (
            <button
              key={lang.code}
              className="language-option"
              onClick={() => handleLanguageSelect(lang.code)}
              aria-label={`Select ${lang.name}`}
            >
              <span className="language-flag">{lang.flag}</span>
              <div className="language-text">
                <span className="language-name">{lang.name}</span>
                <span className="language-native">{lang.nativeName}</span>
              </div>
              <span className="language-checkmark">→</span>
            </button>
          ))}
        </div>

        {/* Info */}
        <p className="language-selector-info">
          💡 You can change your language anytime from the top navigation
        </p>
        <p className="language-selector-info-hi">
          💡 आप किसी भी समय शीर्ष नेविगेशन से अपनी भाषा बदल सकते हैं
        </p>
      </div>
    </div>
  );
}
