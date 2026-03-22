import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * PWA Install Banner — hooks into beforeinstallprompt event.
 * Shows a sticky bottom banner prompting users to install the app.
 * Remembers dismissal via localStorage.
 */
export default function InstallBanner() {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
      if (!localStorage.getItem('pwa-install-dismissed')) {
        setShow(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => { setShow(false); setInstalled(true); });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setShow(false);
    setPrompt(null);
  };

  const dismiss = () => {
    setShow(false);
    localStorage.setItem('pwa-install-dismissed', '1');
  };

  if (!show || installed) return null;

  return (
    <div
      role="banner"
      aria-label={t('install.title', 'Install JanSamadhan app')}
      style={{
        position: 'fixed', bottom: 16, left: 16, right: 16, zIndex: 500,
        background: '#1A237E', color: 'white', borderRadius: 12,
        padding: '14px 16px', display: 'flex', alignItems: 'center',
        gap: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        maxWidth: 480, margin: '0 auto',
        animation: 'slideUp 0.3s ease'
      }}
    >
      {/* Flag icon */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
        <div style={{ width: 20, height: 4, background: '#FF9933', borderRadius: 2 }} />
        <div style={{ width: 20, height: 4, background: '#FFFFFF', borderRadius: 2 }} />
        <div style={{ width: 20, height: 4, background: '#138808', borderRadius: 2 }} />
      </div>
      <span style={{ flex: 1, fontSize: '0.875rem', lineHeight: 1.4 }}>
        {t('install.title', 'Install JanSamadhan on your phone for faster access & offline support')}
      </span>
      <button
        id="pwa-install-btn"
        onClick={install}
        style={{
          background: '#FFD54F', color: '#1A237E', border: 'none',
          borderRadius: 8, padding: '8px 14px', fontWeight: 700,
          cursor: 'pointer', fontSize: '0.85rem', flexShrink: 0
        }}
        aria-label="Install app"
      >
        {t('install.btn', 'Install')}
      </button>
      <button
        onClick={dismiss}
        aria-label="Dismiss install prompt"
        style={{
          background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)',
          cursor: 'pointer', fontSize: '1.2rem', padding: '4px 6px', flexShrink: 0,
          lineHeight: 1
        }}
      >
        ✕
      </button>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
