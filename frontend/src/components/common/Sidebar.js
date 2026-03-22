import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

const CITIZEN_LINKS = [
  { to: '/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/file-complaint', icon: '✍️', label: 'File Complaint' },
  { to: '/my-complaints', icon: '📋', label: 'My Complaints' },
  { to: '/feed', icon: '📢', label: 'Public Feed' },
  { to: '/map', icon: '🗺️', label: 'Hotspot Map' },
  { to: '/leaderboard', icon: '🏆', label: 'Leaderboard' },
  { to: '/profile', icon: '👤', label: 'My Profile' },
];

const OFFICER_LINKS = [
  { to: '/officer/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/officer/portal', icon: '🏛️', label: 'Govt Portal' },
  { to: '/officer/complaints', icon: '📋', label: 'My Queue' },
  { to: '/map', icon: '🗺️', label: 'Hotspot Map' },
  { to: '/leaderboard', icon: '🏆', label: 'Leaderboard' },
  { to: '/profile', icon: '👤', label: 'My Profile' },
];

const ADMIN_LINKS = [
  { to: '/admin/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/officer/portal', icon: '🏛️', label: 'Govt Portal' },
  { to: '/admin/complaints', icon: '📋', label: 'All Complaints' },
  { to: '/admin/users', icon: '👥', label: 'Users' },
  { to: '/map', icon: '🗺️', label: 'Hotspot Map' },
  { to: '/leaderboard', icon: '🏆', label: 'Leaderboard' },
  { to: '/profile', icon: '👤', label: 'My Profile' },
];

const BADGE_ICONS = {
  newcomer: '🌱', contributor: '⭐', active_citizen: '🏆', champion: '🎖️', civic_hero: '🦸',
  new_officer: '🔰', active_officer: '⚙️', efficient_officer: '🌟', star_officer: '💫', excellence_award: '🏅'
};

const BADGE_LABELS = {
  newcomer: 'Newcomer', contributor: 'Contributor', active_citizen: 'Active Citizen',
  champion: 'Champion', civic_hero: 'Civic Hero',
  new_officer: 'New Officer', active_officer: 'Active Officer',
  efficient_officer: 'Efficient Officer', star_officer: 'Star Officer', excellence_award: 'Excellence Award'
};

export default function Sidebar({ isOpen, onClose }) {
  const { user } = useAuthStore();

  if (!user) return null;

  const links = user.role === 'citizen' ? CITIZEN_LINKS
    : user.role === 'officer' ? OFFICER_LINKS
      : ADMIN_LINKS;

  const calculateBadge = (role, pts) => {
    const p = pts || 0;
    if (role === 'citizen') {
      if (p >= 1000) return 'civic_hero';
      if (p >= 400) return 'champion';
      if (p >= 150) return 'active_citizen';
      if (p >= 50) return 'contributor';
      return 'newcomer';
    } else if (role === 'officer') {
      if (p >= 1500) return 'excellence_award';
      if (p >= 700) return 'star_officer';
      if (p >= 300) return 'efficient_officer';
      if (p >= 100) return 'active_officer';
      return 'new_officer';
    }
    return 'newcomer';
  };

  const points = user.role === 'citizen' ? user.points : user.govt_points;
  const badgeKey = calculateBadge(user.role, points);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 99, display: 'none' }}
          id="sidebar-overlay"
          onClick={onClose}
        />
      )}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* User summary */}
        <div style={{
          margin: '0 12px 16px',
          background: 'var(--secondary-light)',
          borderRadius: 'var(--radius)',
          padding: '14px 16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: 'var(--secondary)', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '1rem', flexShrink: 0
            }}>
              {user.full_name?.charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.full_name}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                {user.role.replace('_', ' ')}
              </div>
            </div>
          </div>

          {/* Points & Badge */}
          <div style={{
            marginTop: 10, display: 'flex', justifyContent: 'space-between',
            background: 'white', borderRadius: 8, padding: '8px 12px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--primary)' }}>
                {points || 0}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Points</div>
            </div>
            <div style={{ width: 1, background: 'var(--border)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.1rem' }}>{BADGE_ICONS[badgeKey] || '🌱'}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {BADGE_LABELS[badgeKey] || 'Newcomer'}
              </div>
            </div>
            {user.role === 'officer' && (
              <>
                <div style={{ width: 1, background: 'var(--border)' }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--success)' }}>
                    {user.complaints_resolved || 0}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Resolved</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Navigation links */}
        <div className="nav-section-title">Navigation</div>
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <span className="nav-icon">{link.icon}</span>
            <span>{link.label}</span>
          </NavLink>
        ))}

        {/* App version */}
        <div style={{
          position: 'absolute', bottom: 16, left: 0, right: 0,
          textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)'
        }}>
          JanSamadhan v1.0 • जन समाधान
        </div>
      </aside>

      <style>{`
        @media (max-width: 768px) {
          #sidebar-overlay { display: block !important; }
        }
      `}</style>
    </>
  );
}
