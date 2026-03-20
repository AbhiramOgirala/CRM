import React, { useState } from 'react';
import { useTextToSpeech, translateText } from '../../hooks/useTextToSpeech';

const SpeakerIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
  </svg>
);

const StopIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="2"/>
  </svg>
);

const LoadingIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true"
    style={{ animation: 'spin 0.8s linear infinite' }}>
    <circle cx="12" cy="12" r="9" strokeOpacity="0.25"/>
    <path d="M12 3a9 9 0 0 1 9 9" strokeLinecap="round"/>
  </svg>
);

const SIZE_MAP = { sm: 'speak-btn-sm', md: 'speak-btn-md', lg: 'speak-btn-lg' };

export default function SpeakButton({
  text,
  lang = 'en-IN',
  rate = 0.92,
  size = 'md',
  variant = 'icon',
  label = 'Read aloud',
  className = '',
  translate = true,   // set false for already-localized strings (field prompts, classification)
}) {
  const { speak, isSpeaking, isSupported } = useTextToSpeech();
  const [translating, setTranslating] = useState(false);

  if (!isSupported) return null;

  const handleClick = async (e) => {
    e.stopPropagation();

    // If already speaking, toggle off immediately
    if (isSpeaking) { speak({ text, lang, rate }); return; }

    // Translate if needed — only when lang isn't English and translate=true
    const needsTranslation = translate && lang && !lang.startsWith('en');
    if (needsTranslation) {
      setTranslating(true);
      const translated = await translateText(text, lang);
      setTranslating(false);
      speak({ text: translated, lang, rate });
    } else {
      speak({ text, lang, rate });
    }
  };

  const sizeClass = SIZE_MAP[size] || 'speak-btn-md';
  const activeClass = isSpeaking ? 'speak-btn-active' : '';
  const busy = translating;

  const icon = busy ? <LoadingIcon /> : isSpeaking ? <StopIcon /> : <SpeakerIcon />;
  const ariaLabel = busy ? 'Translating…' : isSpeaking ? 'Stop reading' : label;

  if (variant === 'pill') {
    return (
      <button
        type="button"
        className={`speak-btn speak-btn-pill ${activeClass} ${className}`}
        onClick={handleClick}
        disabled={busy}
        aria-label={ariaLabel}
        title={ariaLabel}
      >
        {icon}
        <span className="speak-btn-label">
          {busy ? 'Translating…' : isSpeaking ? 'Stop' : label}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`speak-btn ${sizeClass} ${activeClass} ${className}`}
      onClick={handleClick}
      disabled={busy}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      {icon}
    </button>
  );
}
