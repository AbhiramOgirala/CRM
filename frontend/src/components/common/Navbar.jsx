import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useAccessibilityStore from '../../store/accessibilityStore';
import { notificationsAPI } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

const LANG_OPTIONS = [
  { code: 'en', label: 'EN', full: 'English' },
  { code: 'hi', label: 'हि', full: 'हिंदी' },
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
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showA11yBar, setShowA11yBar] = useState(false);
  const notifRef = useRef();
  const userRef = useRef();

  useEffect(() => {
    if (user) fetchUnread();
    const interval = setInterval(() => { if (user) fetchUnread(); }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const fetchUnread = async () => {
    try {
      const res = await notificationsAPI.getAll({ limit: 5, unread_only: true });
      setUnreadCount(res.unreadCount || 0);
      setNotifications(res.notifications || []);
    } catch {}
  };

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifDropdown(false);
      if (userRef.current && !userRef.current.contains(e.target)) setShowUserDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    await notificationsAPI.markRead({ all: true });
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
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
          zIndex: 201,
          fontFamily: 'var(--font-primary)',
          fontSize: '0.75rem',
          color: 'rgba(255,255,255,0.85)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="#main-content" style={{ textDecoration: 'none', color: 'rgba(255,255,255,0.85)', fontSize: '0.75rem', fontWeight: 500 }}>Skip to main content</a>
          
          <button 
            onClick={toggleHighContrast}
            style={{ display: 'flex', alignItems: 'center', background: 'none', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 2, padding: '2px 6px', cursor: 'pointer', fontSize: '0.7rem', color: 'white' }}
            title="Toggle High Contrast"
            aria-label="Toggle High Contrast Mode"
          >
            {highContrast ? 'Dark Mode On' : 'High Contrast'}
          </button>

          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button onClick={decreaseFontSize} title="Decrease Text Size" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 2, padding: '2px 6px', cursor: 'pointer', fontSize: '0.7rem', color: 'white' }}>A-</button>
            <button onClick={resetFontSize} title="Normal Text Size" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 2, padding: '2px 6px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600, color: 'white' }}>A</button>
            <button onClick={increaseFontSize} title="Increase Text Size" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 2, padding: '2px 6px', cursor: 'pointer', fontSize: '0.7rem', color: 'white' }}>A+</button>
          </div>
        </div>
      </div>

      <style>{`
        .navbar-main { top: 36px; }
        @media (max-width: 768px) {
          .navbar-main { top: ${showA11yBar ? 'auto' : '0'}; }
          ${showA11yBar ? '.accessibility-bar.mobile-open + .navbar-main { top: auto; position: relative; }' : ''}
        }
      `}</style>
      <nav className="navbar navbar-main" role="navigation" aria-label="Main navigation">
        {/* Hamburger - mobile */}
        <button
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'white', marginRight: 8, padding: 8, borderRadius: 6,
            alignItems: 'center', justifyContent: 'center',
          }}
          className="menu-toggle-btn"
          onClick={onMenuToggle}
          id="menu-toggle"
          aria-label="Toggle sidebar menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
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
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', marginRight: '8px', borderRight: '1px solid rgba(255,255,255,0.3)', paddingRight: '12px' }}>
            <span lang="hi" style={{ fontSize: '0.5rem', opacity: 0.9, textAlign: 'center', letterSpacing: '0.5px' }}>सत्यमेव जयते</span>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>Govt. of India</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span className="logo-text" style={{ lineHeight: 1, marginBottom: '2px' }}>JanSamadhan</span>
            <span lang="hi" className="logo-sub" style={{ lineHeight: 1 }}>जन समाधान — <span lang="en">Citizen Portal</span></span>
          </div>
        </Link>

        {/* Nav links - desktop */}
        <div style={{ display: 'flex', gap: 4, marginLeft: 20, alignItems: 'center' }}>
          <Link to="/feed" style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'none', fontSize: '0.85rem', padding: '6px 12px', borderRadius: 6, fontWeight: 500 }}>
            Public Feed
          </Link>
          <Link to="/map" style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'none', fontSize: '0.85rem', padding: '6px 12px', borderRadius: 6, fontWeight: 500 }}>
            Hotspot Map
          </Link>
          <Link to="/leaderboard" style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'none', fontSize: '0.85rem', padding: '6px 12px', borderRadius: 6, fontWeight: 500 }}>
            Leaderboard
          </Link>
        </div>

      <div className="navbar-actions">
        {/* Language picker */}
        <div style={{ position: 'relative' }}>
          <select
            value={activeLang}
            onChange={e => setActiveLang(e.target.value)}
            aria-label="Select language for text-to-speech"
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 6,
              color: 'white',
              fontSize: '0.8rem',
              fontWeight: 600,
              padding: '5px 8px',
              cursor: 'pointer',
              appearance: 'none',
              WebkitAppearance: 'none',
              minWidth: 44,
              textAlign: 'center',
            }}
          >
            {LANG_OPTIONS.map(l => (
              <option key={l.code} value={l.code} style={{ background: '#1A237E', color: 'white' }}>
                {l.label} {l.full}
              </option>
            ))}
          </select>
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
              >
                {/* Bell SVG icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
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
                <div role="dialog" aria-label="Notifications" style={{
                  position: 'absolute', right: 0, top: '100%', marginTop: 8,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', width: 360, boxShadow: 'var(--shadow-lg)',
                  zIndex: 500, overflow: 'hidden'
                }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-2)' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--secondary)' }}>Notifications</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} style={{ fontSize: '0.75rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                        Mark all read
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      No new notifications
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
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 2, color: 'var(--text-primary)' }}>{n.title}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{n.message}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                            {new Date(n.created_at).toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* File Complaint CTA - for citizens */}
            {user.role === 'citizen' && (
              <Link to="/file-complaint" className="btn btn-primary btn-sm" style={{ height: 38, display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}>
                + File Complaint
              </Link>
            )}

            {/* User menu */}
            <div style={{ position: 'relative' }} ref={userRef}>
              <button
                onClick={() => { setShowUserDropdown(!showUserDropdown); setShowNotifDropdown(false); }}
                aria-expanded={showUserDropdown}
                aria-label="User menu"
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: 8, padding: '0 12px', cursor: 'pointer', color: 'white',
                  height: 38, boxSizing: 'border-box'
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: '#FFD54F', color: '#1A237E',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: '0.85rem'
                }} aria-hidden="true">
                  {user.full_name?.charAt(0).toUpperCase()}
                </div>
                <div style={{ textAlign: 'left', display: 'block' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, lineHeight: 1.2 }}>
                    {user.full_name?.split(' ')[0]}
                  </div>
                  <div style={{ fontSize: '0.65rem', opacity: 0.8 }}>
                    {BADGE_LABELS[user.badge_level || user.govt_badge] || user.role}
                  </div>
                </div>
                <span style={{ fontSize: '0.65rem', opacity: 0.7 }} aria-hidden="true">▼</span>
              </button>

              {showUserDropdown && (
                <div role="menu" style={{
                  position: 'absolute', right: 0, top: '100%', marginTop: 8,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', width: 220, boxShadow: 'var(--shadow-lg)',
                  zIndex: 500, overflow: 'hidden'
                }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{user.full_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</div>
                    {user.role === 'citizen' && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: 2, fontWeight: 600 }}>
                        {BADGE_LABELS[user.badge_level] || 'Newcomer'} — {user.points || 0} pts
                      </div>
                    )}
                  </div>
                  {[
                    { to: '/profile', label: 'My Profile' },
                    user.role === 'citizen' && { to: '/my-complaints', label: 'My Complaints' },
                    user.role === 'citizen' && { to: '/dashboard', label: 'Dashboard' },
                    user.role === 'officer' && { to: '/officer/dashboard', label: 'Dashboard' },
                    (user.role === 'admin' || user.role === 'super_admin') && { to: '/admin/dashboard', label: 'Admin Panel' },
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
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <Link to="/login" className="btn btn-ghost btn-sm" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)' }}>
              Login
            </Link>
            <Link to="/register" className="btn btn-primary btn-sm">
              Register
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
        #menu-toggle { display: none !important; }
        @media (max-width: 768px) {
          #menu-toggle { display: flex !important; }
        }
      `}</style>
      </nav>
    </header>
  );
}
