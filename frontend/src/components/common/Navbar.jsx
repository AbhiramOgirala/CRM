import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useAccessibilityStore from '../../store/accessibilityStore';
import { getNotificationsStreamUrl, notificationsAPI } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { useTranslation } from 'react-i18next';

const LANG_OPTIONS = [
  { code: 'en-IN', label: 'EN', full: 'English' },
  { code: 'hi-IN', label: 'हि', full: 'हिंदी' },
  { code: 'te-IN', label: 'తె', full: 'తెలుగు' },
  { code: 'ta-IN', label: 'த', full: 'தமிழ்' },
  { code: 'kn-IN', label: 'ಕ', full: 'ಕನ್ನಡ' },
  { code: 'ml-IN', label: 'മ', full: 'മലയാളം' },
  { code: 'mr-IN', label: 'म', full: 'मराठी' },
  { code: 'gu-IN', label: 'ગ', full: 'ગુજરાતી' },
  { code: 'pa-IN', label: 'ਪ', full: 'ਪੰਜਾਬੀ' },
  { code: 'bn-IN', label: 'ব', full: 'বাংলা' },
  { code: 'ur-IN', label: 'اُ', full: 'اردو' },
];

// Badge level labels — text only, no emoji
const BADGE_LABELS = {
  newcomer: 'Newcomer', contributor: 'Contributor', active_citizen: 'Active Citizen',
  champion: 'Champion', civic_hero: 'Civic Hero',
  new_officer: 'Officer', active_officer: 'Active Officer', efficient_officer: 'Efficient Officer',
  star_officer: 'Star Officer', excellence_award: 'Excellence Award'
};

// Notification type dot colors for formal display
const NOTIF_COLORS = {
  assignment: '#0277BD',
  update: '#E65100',
  resolution: '#2E7D32',
  escalation: '#C62828',
  badge: '#6A1B9A',
  info: '#5C6080',
  duplicate: '#5C6080',
};

export default function Navbar({ onMenuToggle }) {
  const { user, logout } = useAuthStore();
  const { increaseFontSize, decreaseFontSize, resetFontSize, toggleHighContrast, highContrast } = useAccessibilityStore();
  const navigate = useNavigate();
  const { activeLang, setActiveLang } = useLanguage();
  const { t } = useTranslation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showA11yBar, setShowA11yBar] = useState(false);
  const notifRef = useRef();
  const userRef = useRef();
  const langRef = useRef();

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setNotifications([]);
      return undefined;
    }

    fetchUnread();

    const token = localStorage.getItem('token');
    if (!token) return undefined;

    const stream = new EventSource(getNotificationsStreamUrl(token));

    stream.addEventListener('snapshot', (event) => {
      try {
        const payload = JSON.parse(event.data);
        setUnreadCount(payload.unreadCount || 0);
        setNotifications(payload.notifications || []);
      } catch {
        // ignore malformed events
      }
    });

    stream.addEventListener('notification', (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.notification) {
          setNotifications((prev) => [payload.notification, ...prev].slice(0, 100));
        }
        if (typeof payload.unreadCount === 'number') {
          setUnreadCount(payload.unreadCount);
        }
      } catch {
        // ignore malformed events
      }
    });

    stream.addEventListener('unread_count', (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (typeof payload.unreadCount === 'number') {
          setUnreadCount(payload.unreadCount);
        }
      } catch {
        // ignore malformed events
      }
    });

    stream.addEventListener('cleared', () => {
      setUnreadCount(0);
      setNotifications([]);
    });

    return () => {
      stream.close();
    };
  }, [user]);

  const fetchUnread = async () => {
    try {
      const res = await notificationsAPI.getAll({ limit: 100 });
      setUnreadCount(res.unreadCount || 0);
      setNotifications(res.notifications || []);
    } catch { }
  };

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifDropdown(false);
      if (userRef.current && !userRef.current.contains(e.target)) setShowUserDropdown(false);
      if (langRef.current && !langRef.current.contains(e.target)) setShowLangDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    await notificationsAPI.markRead({ all: true });
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const clearAllNotifications = async () => {
    await notificationsAPI.clear();
    setUnreadCount(0);
    setNotifications([]);
  };

  const getDashboardLink = () => {
    if (!user) return '/';
    if (user.role === 'citizen') return '/dashboard';
    if (user.role === 'officer') return '/officer/dashboard';
    return '/admin/dashboard';
  };

  return (
    <header>
      {/* UX4G Accessibility Bar */}
      <div
        className={`accessibility-bar${showA11yBar ? ' mobile-open' : ''}`}
        style={{
          height: '36px',
          background: 'var(--secondary)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '0 20px',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 3100, /* Top-most utility */
          fontFamily: 'var(--font-primary)',
          fontSize: '0.75rem',
          color: 'rgba(255,255,255,0.85)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="#main-content" style={{ textDecoration: 'none', color: 'rgba(255,255,255,0.85)', fontSize: '0.75rem', fontWeight: 500 }}>{t('nav_skip', 'Skip to main content')}</a>

          <button
            onClick={toggleHighContrast}
            style={{ display: 'flex', alignItems: 'center', background: 'none', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 2, padding: '2px 6px', cursor: 'pointer', fontSize: '0.7rem', color: 'white' }}
            title={t('nav_high_contrast', 'Toggle High Contrast')}
            aria-label={t('nav_high_contrast', 'Toggle High Contrast Mode')}
          >
            {highContrast ? t('nav_dark_mode_on', 'Dark Mode On') : t('nav_high_contrast', 'High Contrast')}
          </button>

          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ marginRight: 4 }}>{t('nav_text_size', 'Text Size')}:</span>
            <button onClick={decreaseFontSize} title="Decrease Text Size" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 2, padding: '2px 6px', cursor: 'pointer', fontSize: '0.7rem', color: 'white' }}>A-</button>
            <button onClick={resetFontSize} title="Normal Text Size" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 2, padding: '2px 6px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600, color: 'white' }}>A</button>
            <button onClick={increaseFontSize} title="Increase Text Size" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 2, padding: '2px 6px', cursor: 'pointer', fontSize: '0.7rem', color: 'white' }}>A+</button>
          </div>
        </div>
      </div>

      <style>{`
        .navbar-main { 
          position: fixed; 
          top: 36px; 
          left: 0; 
          right: 0; 
          z-index: 3000; 
          transition: top 200ms ease;
        }
        @media (max-width: 768px) {
          .navbar-main { 
            top: ${showA11yBar ? '36px' : '0'}; 
            z-index: 3000;
          }
          ${showA11yBar ? '.accessibility-bar.mobile-open + .navbar-main { top: 36px; position: fixed; }' : ''}
        }
      `}</style>
      <nav className="navbar navbar-main" role="navigation" aria-label="Main navigation">
        {/* Hamburger - mobile */}
        <button
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'white', marginRight: 8, padding: 8, borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          className="menu-toggle-btn"
          onClick={onMenuToggle}
          id="menu-toggle"
          aria-label="Toggle sidebar menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Brand */}
        <Link to={getDashboardLink()} className="navbar-brand" aria-label="JanSamadhan — Home">
          {/* Logo flag with inline styles to bypass old CSS cache */}
          <div className="navbar-flag" aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginRight: '8px' }}>
            <div className="flag-stripe" style={{ background: '#FF9933', width: '28px', height: '6px', borderRadius: '2px' }} />
            <div className="flag-stripe" style={{ background: '#FFFFFF', width: '28px', height: '6px', borderRadius: '2px' }} />
            <div className="flag-stripe" style={{ background: '#138808', width: '28px', height: '6px', borderRadius: '2px' }} />
          </div>
          {/* Emblem text reference to fulfill UX4G text/emblem requirements */}
          <div className="navbar-govt-block" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', marginRight: '8px', borderRight: '1px solid rgba(255,255,255,0.3)', paddingRight: '12px' }}>
            <span lang="hi" style={{ fontSize: '0.5rem', opacity: 0.9, textAlign: 'center', letterSpacing: '0.5px' }}>सत्यमेव जयते</span>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>Govt. of India</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span className="logo-text" style={{ lineHeight: 1, marginBottom: '2px' }}>JanSamadhan</span>
            <span lang="hi" className="logo-sub" style={{ lineHeight: 1 }}>जन समाधान — <span lang="en">Citizen Portal</span></span>
          </div>
        </Link>

        {/* Nav links - desktop only */}
        <div className="navbar-desktop-links" style={{ gap: 4, marginLeft: 20, alignItems: 'center' }}>
          <Link to="/feed" style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'none', fontSize: '0.85rem', padding: '6px 12px', borderRadius: 6, fontWeight: 500 }}>
            {t('nav_public_feed')}
          </Link>
          <Link to="/map" style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'none', fontSize: '0.85rem', padding: '6px 12px', borderRadius: 6, fontWeight: 500 }}>
            {t('nav_hotspot_map')}
          </Link>
          <Link to="/leaderboard" style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'none', fontSize: '0.85rem', padding: '6px 12px', borderRadius: 6, fontWeight: 500 }}>
            {t('nav_leaderboard')}
          </Link>
        </div>

        <div className="navbar-actions">
          {/* Language picker */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }} ref={langRef}>
            {/* Desktop: native select with translate icon */}
            <div className="lang-picker-desktop" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ position: 'absolute', left: 8, pointerEvents: 'none', opacity: 0.85 }}
                aria-hidden="true"
              >
                <path d="M5 8l6 6"/><path d="M4 14l6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/>
                <path d="M22 22l-5-10-5 10"/><path d="M14 18h6"/>
              </svg>
              <select
                value={activeLang}
                onChange={e => setActiveLang(e.target.value)}
                aria-label="Select language"
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: 6,
                  color: 'white',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  paddingLeft: 28,
                  paddingRight: 8,
                  paddingTop: 5,
                  paddingBottom: 5,
                  cursor: 'pointer',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  minWidth: 44,
                }}
              >
                {LANG_OPTIONS.map(l => (
                  <option key={l.code} value={l.code} style={{ background: '#1A237E', color: 'white' }}>
                    {l.label} {l.full}
                  </option>
                ))}
              </select>
            </div>

            {/* Mobile: icon button + popover */}
            <button
              className="lang-picker-mobile"
              onClick={() => { setShowLangDropdown(v => !v); setShowNotifDropdown(false); setShowUserDropdown(false); }}
              aria-label="Select language"
              aria-expanded={showLangDropdown}
              style={{
                display: 'none', /* shown via CSS on mobile */
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 6,
                width: 32, height: 32,
                alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'white', padding: 0,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 8l6 6"/><path d="M4 14l6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/>
                <path d="M22 22l-5-10-5 10"/><path d="M14 18h6"/>
              </svg>
            </button>

            {showLangDropdown && (
              <div style={{
                position: 'fixed', right: 8, top: 56,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)',
                zIndex: 3200, overflow: 'hidden', minWidth: 160,
              }}>
                {LANG_OPTIONS.map(l => (
                  <button
                    key={l.code}
                    onClick={() => { setActiveLang(l.code); setShowLangDropdown(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      width: '100%', padding: '10px 16px',
                      background: activeLang === l.code ? 'var(--primary-light)' : 'transparent',
                      border: 'none', borderBottom: '1px solid var(--border)',
                      cursor: 'pointer', textAlign: 'left',
                      color: activeLang === l.code ? 'var(--primary)' : 'var(--text-primary)',
                      fontWeight: activeLang === l.code ? 700 : 500,
                      fontSize: '0.875rem',
                    }}
                  >
                    <span style={{ fontWeight: 700, minWidth: 20 }}>{l.label}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{l.full}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {user ? (
            <>
              {/* Notifications */}
              <div style={{ position: 'relative' }} ref={notifRef}>
                <button
                  style={{
                    background: 'rgba(255,255,255,0.12)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 8,
                    cursor: 'pointer',
                    color: 'white',
                    position: 'relative',
                    width: 38, height: 38,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 200ms ease', boxSizing: 'border-box'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}
                  onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                  onClick={() => { setShowNotifDropdown(!showNotifDropdown); setShowUserDropdown(false); }}
                  aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
                  aria-expanded={showNotifDropdown}
                  className="navbar-bell-btn"
                >
                  {/* Bell SVG icon */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" />
                  </svg>
                  {unreadCount > 0 && (
                    <span style={{
                      position: 'absolute', top: 4, right: 4,
                      background: '#EF5350', color: 'white',
                      borderRadius: '50%', width: 14, height: 14,
                      fontSize: '0.6rem', fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '2px solid var(--secondary)'
                    }} aria-hidden="true">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {showNotifDropdown && (
                  <div role="dialog" aria-label="Notifications" className="notif-dropdown" style={{
                    position: 'absolute', right: 0, top: '100%', marginTop: 8,
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)', width: 360, boxShadow: 'var(--shadow-lg)',
                    zIndex: 3200, overflow: 'hidden'
                  }}>
                    <div style={{
                      padding: '12px 16px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      background: 'var(--secondary)', color: 'white'
                    }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{t('nav_notifications', 'Notifications')}</span>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {unreadCount > 0 && (
                          <button onClick={markAllRead} style={{
                            fontSize: '0.75rem', color: 'var(--primary-border)', background: 'none', border: 'none',
                            cursor: 'pointer', fontWeight: 600
                          }}>
                            {t('nav_mark_all_read', 'Mark all read')}
                          </button>
                        )}
                        {notifications.length > 0 && (
                          <button onClick={clearAllNotifications} style={{
                            fontSize: '0.75rem', color: '#FFCDD2', background: 'none', border: 'none',
                            cursor: 'pointer', fontWeight: 600
                          }}>
                            {t('nav_clear_all', 'Clear all')}
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          {t('nav_no_notifications', 'No new notifications')}
                        </div>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} style={{
                            padding: '12px 16px',
                            background: n.is_read ? 'transparent' : 'var(--primary-light)',
                            borderBottom: '1px solid var(--border)',
                            cursor: n.complaint_id ? 'pointer' : 'default',
                            display: 'flex', gap: 10, alignItems: 'flex-start',
                          }}
                            onClick={() => { if (n.complaint_id) { navigate(`/complaint/${n.complaint_id}`); setShowNotifDropdown(false); } }}
                            role={n.complaint_id ? 'button' : undefined}
                            tabIndex={n.complaint_id ? 0 : undefined}
                          >
                            {/* Type color dot */}
                            <span style={{
                              width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 5,
                              background: NOTIF_COLORS[n.type] || '#9EA3B8'
                            }} aria-hidden="true" />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 2, color: 'var(--text-primary)' }}>{n.title}</div>
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', opacity: 0.9, lineHeight: 1.4 }}>{n.message}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 6, fontWeight: 500 }}>
                                {new Date(n.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* File Complaint CTA - for citizens, desktop only */}
              {user.role === 'citizen' && (
                <Link to="/file-complaint" className="btn btn-primary btn-sm navbar-file-complaint" style={{ height: 38, display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}>
                  {t('nav_file_complaint')}
                </Link>
              )}

              {/* User menu */}
              <div style={{ position: 'relative', flexShrink: 0 }} ref={userRef}>
                <button
                  onClick={() => { setShowUserDropdown(!showUserDropdown); setShowNotifDropdown(false); }}
                  aria-expanded={showUserDropdown}
                  aria-label="User menu"
                  className="navbar-user-btn"
                  style={{
                    display: 'flex', alignItems: 'center',
                    background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '50%', padding: 0, cursor: 'pointer', color: 'white',
                    width: 38, height: 38, boxSizing: 'border-box',
                  }}
                >
                  <div className="navbar-user-avatar" style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: '#FFD54F', color: '#1A237E',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '0.9rem', flexShrink: 0,
                  }} aria-hidden="true">
                    {user.full_name?.charAt(0).toUpperCase()}
                  </div>
                </button>

                {showUserDropdown && (
                  <div role="menu" className="user-dropdown" style={{
                    position: 'absolute', right: 0, top: '100%', marginTop: 8,
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)', width: 220, boxShadow: 'var(--shadow-lg)',
                    zIndex: 3200, overflow: 'hidden'
                  }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--secondary)' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'white' }}>{user.full_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>{user.email}</div>
                      {user.role === 'citizen' && (
                        <div style={{ fontSize: '0.75rem', color: '#FFD54F', marginTop: 4, fontWeight: 600 }}>
                          {BADGE_LABELS[user.badge_level] || 'Newcomer'} — {user.points || 0} pts
                        </div>
                      )}
                    </div>
                    {[
                      { to: '/profile', label: t('nav_my_profile', 'My Profile') },
                      user.role === 'citizen' && { to: '/my-complaints', label: t('nav_my_complaints', 'My Complaints') },
                      user.role === 'citizen' && { to: '/dashboard', label: t('nav_dashboard', 'Dashboard') },
                      user.role === 'officer' && { to: '/officer/dashboard', label: t('nav_dashboard', 'Dashboard') },
                      (user.role === 'admin' || user.role === 'super_admin') && { to: '/admin/dashboard', label: t('nav_admin_panel', 'Admin Panel') },
                    ].filter(Boolean).map(item => (
                      <Link key={item.to} to={item.to} role="menuitem"
                        style={{ display: 'block', padding: '10px 16px', textDecoration: 'none', color: 'var(--text-primary)', fontSize: '0.875rem' }}
                        onClick={() => setShowUserDropdown(false)}
                      >
                        {item.label}
                      </Link>
                    ))}
                    <div style={{ borderTop: '1px solid var(--border)' }}>
                      <button onClick={logout} role="menuitem" style={{
                        width: '100%', padding: '10px 16px', background: 'none', border: 'none',
                        textAlign: 'left', cursor: 'pointer', color: 'var(--danger)', fontSize: '0.875rem', fontWeight: 600
                      }}>
                        {t('nav_sign_out', 'Sign Out')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <Link to="/login" className="btn btn-ghost btn-sm" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)' }}>
                {t('nav_login')}
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                {t('nav_register')}
              </Link>
            </div>
          )}

          {/* Mobile accessibility toggle — hidden on desktop via CSS */}
          <button
            className="mobile-a11y-toggle"
            aria-label={showA11yBar ? 'Hide accessibility options' : 'Show accessibility options'}
            aria-expanded={showA11yBar}
            onClick={() => setShowA11yBar(prev => !prev)}
            style={{ display: 'none' }} /* shown only on mobile via CSS class */
          >
            A
          </button>

        </div>

        <style>{`
          .menu-toggle-btn { display: none !important; }
          .navbar-desktop-links { display: flex; }
          .navbar-govt-block { display: flex; }
          @media (max-width: 768px) {
            .menu-toggle-btn { display: flex !important; }
            .navbar-desktop-links { display: none !important; }
            .navbar-govt-block { display: none !important; }
            /* Hide accessibility bar entirely on mobile */
            .accessibility-bar { display: none !important; }
            .mobile-a11y-toggle { display: none !important; }
            /* Navbar sits at top on mobile */
            .navbar-main { top: 0 !important; }
            /* Brand: tighter, smaller */
            .navbar-brand { gap: 4px !important; }
            .navbar-brand .logo-sub { display: none !important; }
            .navbar-brand .logo-text { font-size: 1rem !important; }
            .navbar-flag { margin-right: 4px !important; }
            .navbar-flag div { width: 20px !important; height: 5px !important; }
            /* All action items same height */
            .navbar-actions { gap: 6px !important; align-items: center !important; }
            /* Language: hide desktop select, show mobile button */
            .lang-picker-desktop { display: none !important; }
            .lang-picker-mobile { display: flex !important; }
            /* Bell button: consistent 32px */
            .navbar-bell-btn {
              width: 32px !important;
              height: 32px !important;
              border-radius: 6px !important;
              padding: 0 !important;
            }
            /* Notification dropdown: full-width, pinned below navbar */
            .notif-dropdown {
              position: fixed !important;
              left: 8px !important;
              right: 8px !important;
              width: auto !important;
              top: 56px !important;
              margin-top: 0 !important;
              max-height: 70vh !important;
              overflow-y: auto !important;
              z-index: 3200 !important;
            }
            /* Hide file complaint btn */
            .navbar-file-complaint { display: none !important; }
            /* User avatar only — no name/chevron */
            .navbar-user-name { display: none !important; }
            .navbar-user-chevron { display: none !important; }
            .navbar-user-btn {
              padding: 2px !important;
              background: transparent !important;
              border: none !important;
              height: 32px !important;
              width: 32px !important;
              border-radius: 50% !important;
            }
            .navbar-user-avatar {
              width: 28px !important;
              height: 28px !important;
              font-size: 0.75rem !important;
            }
            /* User dropdown: full-width pinned, same as notif */
            .user-dropdown {
              position: fixed !important;
              left: 8px !important;
              right: 8px !important;
              width: auto !important;
              top: 56px !important;
              margin-top: 0 !important;
              z-index: 3200 !important;
            }
          }
        `}</style>
      </nav>
    </header>
  );
}
