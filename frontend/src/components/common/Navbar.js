import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { notificationsAPI } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

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

const BADGE_ICONS = {
  newcomer: '🌱', contributor: '⭐', active_citizen: '🏆',
  champion: '🎖️', civic_hero: '🦸',
  new_officer: '🔰', active_officer: '⚙️', efficient_officer: '🌟',
  star_officer: '💫', excellence_award: '🏅'
};

export default function Navbar({ onMenuToggle }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { activeLang, setActiveLang } = useLanguage();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
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
    <nav className="navbar">
      {/* Hamburger - mobile */}
      <button
        className="btn btn-icon"
        style={{ color: 'white', marginRight: 8, display: 'none' }}
        onClick={onMenuToggle}
        id="menu-toggle"
        aria-label="Toggle menu"
      >
        ☰
      </button>

      {/* Brand */}
      <Link to={getDashboardLink()} className="navbar-brand">
        <div className="navbar-flag">
          <div className="flag-stripe" style={{ background: '#FF9933' }} />
          <div className="flag-stripe" style={{ background: '#FFFFFF' }} />
          <div className="flag-stripe" style={{ background: '#138808' }} />
        </div>
        <div>
          <span className="logo-text">JanSamadhan</span>
          <span className="logo-sub">जन समाधान</span>
        </div>
      </Link>

      {/* Nav links - desktop */}
      <div style={{ display: 'flex', gap: 4, marginLeft: 20, alignItems: 'center' }}>
        <Link to="/feed" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: '0.85rem', padding: '6px 12px', borderRadius: 6 }}>
          📢 Public Feed
        </Link>
        <Link to="/map" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: '0.85rem', padding: '6px 12px', borderRadius: 6 }}>
          🗺️ Hotspot Map
        </Link>
        <Link to="/leaderboard" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: '0.85rem', padding: '6px 12px', borderRadius: 6 }}>
          🏆 Leaderboard
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
                className="btn btn-icon"
                style={{ color: 'white', position: 'relative' }}
                onClick={() => { setShowNotifDropdown(!showNotifDropdown); setShowUserDropdown(false); }}
                aria-label="Notifications"
              >
                🔔
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: 2, right: 2,
                    background: '#EF5350', color: 'white',
                    borderRadius: '50%', width: 16, height: 16,
                    fontSize: '0.65rem', fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid var(--secondary)'
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifDropdown && (
                <div style={{
                  position: 'absolute', right: 0, top: '100%', marginTop: 8,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', width: 340, boxShadow: 'var(--shadow-lg)',
                  zIndex: 500, overflow: 'hidden'
                }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Notifications</span>
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
                        cursor: 'pointer'
                      }}
                        onClick={() => { if (n.complaint_id) { navigate(`/complaint/${n.complaint_id}`); setShowNotifDropdown(false); } }}
                      >
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 2 }}>{n.title}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{n.message}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                          {new Date(n.created_at).toLocaleString('en-IN')}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* File Complaint CTA - for citizens */}
            {user.role === 'citizen' && (
              <Link to="/file-complaint" className="btn btn-primary btn-sm">
                + File Complaint
              </Link>
            )}

            {/* User menu */}
            <div style={{ position: 'relative' }} ref={userRef}>
              <button
                onClick={() => { setShowUserDropdown(!showUserDropdown); setShowNotifDropdown(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: 'white'
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: '#FFD54F', color: '#1A237E',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: '0.85rem'
                }}>
                  {user.full_name?.charAt(0).toUpperCase()}
                </div>
                <div style={{ textAlign: 'left', display: 'block' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, lineHeight: 1.2 }}>
                    {user.full_name?.split(' ')[0]}
                  </div>
                  <div style={{ fontSize: '0.65rem', opacity: 0.8 }}>
                    {BADGE_ICONS[user.badge_level || user.govt_badge]} {user.role}
                  </div>
                </div>
                <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>▼</span>
              </button>

              {showUserDropdown && (
                <div style={{
                  position: 'absolute', right: 0, top: '100%', marginTop: 8,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', width: 200, boxShadow: 'var(--shadow-lg)',
                  zIndex: 500, overflow: 'hidden'
                }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{user.full_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</div>
                    {user.role === 'citizen' && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: 2, fontWeight: 600 }}>
                        {BADGE_ICONS[user.badge_level]} {user.points || 0} pts
                      </div>
                    )}
                  </div>
                  {[
                    { to: '/profile', label: '👤 My Profile' },
                    user.role === 'citizen' && { to: '/my-complaints', label: '📋 My Complaints' },
                    user.role === 'citizen' && { to: '/dashboard', label: '📊 Dashboard' },
                    user.role === 'officer' && { to: '/officer/dashboard', label: '📊 Dashboard' },
                    (user.role === 'admin' || user.role === 'super_admin') && { to: '/admin/dashboard', label: '⚙️ Admin Panel' },
                  ].filter(Boolean).map(item => (
                    <Link key={item.to} to={item.to}
                      style={{ display: 'block', padding: '10px 16px', textDecoration: 'none', color: 'var(--text-primary)', fontSize: '0.875rem' }}
                      onClick={() => setShowUserDropdown(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <div style={{ borderTop: '1px solid var(--border)' }}>
                    <button onClick={logout} style={{
                      width: '100%', padding: '10px 16px', background: 'none', border: 'none',
                      textAlign: 'left', cursor: 'pointer', color: 'var(--danger)', fontSize: '0.875rem', fontWeight: 600
                    }}>
                      🚪 Logout
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
      </div>

      <style>{`
        @media (max-width: 768px) {
          #menu-toggle { display: flex !important; }
        }
      `}</style>
    </nav>
  );
}
