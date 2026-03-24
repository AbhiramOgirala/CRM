<<<<<<< Updated upstream
import React from 'react';
=======
﻿import React, { useEffect, useState } from 'react';
>>>>>>> Stashed changes
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Navbar from '../../components/common/Navbar';
import LanguageSelector from '../../components/common/LanguageSelector';
import { useLanguage } from '../../context/LanguageContext';

export default function Landing() {
  const { t } = useTranslation();
  const { setActiveLang } = useLanguage();
  const [showLanguageSelector, setShowLanguageSelector] = useState(true);

  useEffect(() => {
    // Show language selector when landing page loads
    setShowLanguageSelector(true);
  }, []);

  const handleLanguageSelect = (langCode) => {
    setActiveLang(langCode);
    setShowLanguageSelector(false);
  };

  const FEATURES = [
    { 
      icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>, 
      title: t('landing.feat_1_title'),
      desc: t('landing.feat_1_desc')
    },
    { 
      icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>, 
      title: t('landing.feat_2_title'),
      desc: t('landing.feat_2_desc')
    },
    { 
      icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>, 
      title: t('landing.feat_3_title'),
      desc: t('landing.feat_3_desc')
    },
    { 
      icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>, 
      title: t('landing.feat_4_title'),
      desc: t('landing.feat_4_desc')
    },
    { 
      icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>, 
      title: t('landing.feat_5_title'),
      desc: t('landing.feat_5_desc')
    },
    { 
      icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>, 
      title: t('landing.feat_6_title'),
      desc: t('landing.feat_6_desc')
    },
    { 
      icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>, 
      title: t('landing.feat_7_title'),
      desc: t('landing.feat_7_desc')
    },
    { 
      icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>, 
      title: t('landing.feat_8_title'),
      desc: t('landing.feat_8_desc')
    },
  ];

  const STATS = [
    { value: '50+', label: t('landing.stats_dist') },
    { value: '12', label: t('landing.stats_dept') },
    { value: '7 ' + t('landing.stats_lvl'), label: '' },
    { value: '14', label: t('landing.stats_cat') },
  ];

  const HIERARCHY_LEVELS = [
    { label: t('landing.hier_country'), icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z' },
    { label: t('landing.hier_state'), icon: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z' },
    { label: t('landing.hier_district'), icon: 'M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3z' },
    { label: t('landing.hier_corp'), icon: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z' },
    { label: t('landing.hier_muni'), icon: 'M12 3L2 12h3v8h6v-5h2v5h6v-8h3L12 3z' },
    { label: t('landing.hier_taluka'), icon: 'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z' },
    { label: t('landing.hier_mandal'), icon: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z' },
    { label: t('landing.hier_gp'), icon: 'M17 8C8 10 5.9 16.17 3.82 21H6c.54-1.35 1.07-2.7 2-4 2.63 2.67 4.26 4 9 4 2.05 0 3.8-.84 5.1-2.19.12-.13.23-.26.34-.4.38-.47.7-.98.95-1.51.01-.02.01-.04.02-.06.27-.6.42-1.24.46-1.89.23.02.47.05.73.05 2.21 0 4-1.79 4-4s-1.79-4-4-4H17z' },
  ];

  return (
    <div>
      <LanguageSelector isOpen={showLanguageSelector} onSelect={handleLanguageSelect} />
      <Navbar />
      <div id="main-content" tabIndex="-1" style={{ marginTop: 100, outline: 'none' }}>
        {/* Hero */}
        <div className="hero">
          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* India flag colors top bar */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, marginBottom: 20 }}>
              <div style={{ width: 48, height: 6, borderRadius: 3, background: '#FF9933' }} />
              <div style={{ width: 48, height: 6, borderRadius: 3, background: '#FFFFFF' }} />
              <div style={{ width: 48, height: 6, borderRadius: 3, background: '#138808' }} />
            </div>

            <h1 className="hero-title">
              <span className="highlight">{t('app_title')}</span>
              <br />{t('app_subtitle')}
            </h1>
            <p className="hero-subtitle">
              {t('app_desc')}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/register" className="btn btn-primary btn-lg">
                {t('btn_register')}
              </Link>
              <Link to="/feed" className="btn" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '2px solid rgba(255,255,255,0.5)' }}>
                {t('btn_public_feed')}
              </Link>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{ background: 'var(--primary)', padding: '16px 24px' }}>
          <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 16 }}>
            {STATS.map(s => (
              <div key={s.label} style={{ textAlign: 'center', color: 'white' }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', fontWeight: 800 }}>{s.value}</div>
                {s.label && <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>{s.label}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div style={{ padding: '60px 24px', maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontFamily: 'var(--font-heading)', fontSize: '1.8rem', fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>
            {t('landing.feat_title')}
          </h2>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: 40 }}>
            {t('landing.feat_sub')}
          </p>
          <div className="grid-4" style={{ gap: 20 }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{
                background: 'var(--surface)', borderRadius: 'var(--radius)',
                padding: 20, border: '1px solid var(--border)', boxShadow: 'var(--shadow)',
                textAlign: 'center', transition: 'all 0.2s'
              }}
                onMouseOver={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ fontSize: '2rem', marginBottom: 10 }}>{f.icon}</div>
                <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 6, color: 'var(--text-primary)' }}>{f.title}</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Location hierarchy visual */}
        <div style={{ background: 'var(--secondary)', padding: '50px 24px', color: 'white', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', marginBottom: 8 }}>
            {t('landing.hier_title')}
          </h2>
          <p style={{ opacity: 0.8, marginBottom: 32, fontSize: '0.9rem' }}>
            {t('landing.hier_sub')}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
            {HIERARCHY_LEVELS.map((level, i, arr) => (
              <React.Fragment key={level.label}>
                <div style={{
                  background: 'rgba(255,255,255,0.15)', padding: '8px 14px',
                  borderRadius: 20, fontSize: '0.85rem', fontWeight: 600,
                  border: '1px solid rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', gap: 6
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d={level.icon} />
                  </svg>
                  {level.label}
                </div>
                {i < arr.length - 1 && <span style={{ opacity: 0.5, fontSize: '1rem' }}>→</span>}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ padding: '60px 24px', textAlign: 'center', background: 'var(--primary-light)' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', fontWeight: 800, marginBottom: 8 }}>
            {t('landing.cta_title')}
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
            {t('landing.cta_sub')}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" className="btn btn-primary btn-lg">
              {t('btn_register')}
            </Link>
            <Link to="/login" className="btn btn-outline btn-lg">
              {t('landing.btn_login')}
            </Link>
          </div>
        </div>

        {/* Footer — GIGW 3.0 §4.4 compliant */}
        <footer style={{ background: 'var(--secondary)', color: 'white', padding: '40px 24px 24px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 32, marginBottom: 32 }}>
              <div>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 12, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 1 }}>JanSamadhan</h3>
                <p style={{ fontSize: '0.82rem', opacity: 0.6, lineHeight: 1.8, margin: 0 }}>
<<<<<<< Updated upstream
                  A citizen grievance redressal portal by the Government of Delhi.
=======
                  {t('landing.foot_desc')}
>>>>>>> Stashed changes
                </p>
                <p style={{ fontSize: '0.75rem', opacity: 0.5, lineHeight: 1.6, marginTop: 8 }}>
                  {t('landing.foot_power')}<br />
                  {t('landing.foot_govt')}
                </p>
              </div>
              <div>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 12, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 1 }}>{t('landing.quick')}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { to: '/about', label: t('footer.about') },
                    { to: '/privacy', label: t('footer.privacy') },
                    { to: '/terms', label: t('footer.terms') },
                    { to: '/feed', label: t('nav_public_feed') },
                    { to: '/map', label: t('nav_hotspot_map') },
                  ].map(link => (
                    <Link key={link.to} to={link.to} style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', textDecoration: 'none' }}>
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 12, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 1 }}>{t('landing.contact')}</h3>
                <p style={{ fontSize: '0.82rem', opacity: 0.6, lineHeight: 1.9, margin: 0 }}>
                  {t('landing.help')}<br />
                  Email: support@jansamadhan.gov.in<br />
                  Mon–Sat, 9 AM – 6 PM IST
                </p>
              </div>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 20, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, fontSize: '0.75rem', opacity: 0.5 }}>
<<<<<<< Updated upstream
              <span>© 2025 Government of Delhi. All rights reserved.</span>
              <span>Last Updated: March 2025 | v1.0.0 | <Link to="/about" style={{ color: 'rgba(255,255,255,0.7)' }}>Accessibility Statement</Link></span>
=======
              <span>{t('landing.rights')}</span>
              <span>{t('landing.last_upd')} <Link to="/about" style={{ color: 'rgba(255,255,255,0.7)' }}>{t('landing.accessibility_statement')}</Link></span>
>>>>>>> Stashed changes
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
