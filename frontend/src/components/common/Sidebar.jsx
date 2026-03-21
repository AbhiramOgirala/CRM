import React from 'react';
import { NavLink } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

// SVG icon components — no emoji, formal government UI
const Icons = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  file: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
      <line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
    </svg>
  ),
  list: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
      <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  ),
  feed: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>
    </svg>
  ),
  map: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
      <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
    </svg>
  ),
  leaderboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
    </svg>
  ),
  profile: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  portal: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  ),
  users: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
    </svg>
  ),
};

const CITIZEN_LINKS = [
  { to: '/dashboard',      icon: Icons.dashboard,   label: 'Dashboard' },
  { to: '/file-complaint', icon: Icons.file,         label: 'File Complaint' },
  { to: '/my-complaints',  icon: Icons.list,         label: 'My Complaints' },
  { to: '/feed',           icon: Icons.feed,         label: 'Public Feed' },
  { to: '/map',            icon: Icons.map,          label: 'Hotspot Map' },
  { to: '/leaderboard',    icon: Icons.leaderboard,  label: 'Leaderboard' },
  { to: '/profile',        icon: Icons.profile,      label: 'My Profile' },
];

const OFFICER_LINKS = [
  { to: '/officer/dashboard',  icon: Icons.dashboard,   label: 'Dashboard' },
  { to: '/officer/portal',     icon: Icons.portal,      label: 'Govt Portal' },
  { to: '/officer/complaints', icon: Icons.list,        label: 'My Queue' },
  { to: '/map',                icon: Icons.map,         label: 'Hotspot Map' },
  { to: '/leaderboard',        icon: Icons.leaderboard, label: 'Leaderboard' },
  { to: '/profile',            icon: Icons.profile,     label: 'My Profile' },
];

const ADMIN_LINKS = [
  { to: '/admin/dashboard',   icon: Icons.dashboard,   label: 'Dashboard' },
  { to: '/officer/portal',    icon: Icons.portal,      label: 'Govt Portal' },
  { to: '/admin/complaints',  icon: Icons.list,        label: 'All Complaints' },
  { to: '/admin/users',       icon: Icons.users,       label: 'Users' },
  { to: '/map',               icon: Icons.map,         label: 'Hotspot Map' },
  { to: '/leaderboard',       icon: Icons.leaderboard, label: 'Leaderboard' },
  { to: '/profile',           icon: Icons.profile,     label: 'My Profile' },
];

const BADGE_LABELS = {
  newcomer: 'Newcomer', contributor: 'Contributor', active_citizen: 'Active Citizen',
  champion: 'Champion', civic_hero: 'Civic Hero',
  new_officer: 'New Officer', active_officer: 'Active Officer',
  efficient_officer: 'Efficient Officer', star_officer: 'Star Officer', excellence_award: 'Excellence Award'
};

// Badge level color accent
const BADGE_COLORS = {
  newcomer: '#5C6080', contributor: '#0277BD', active_citizen: '#E65100',
  champion: '#C62828', civic_hero: '#6A1B9A',
  new_officer: '#5C6080', active_officer: '#0277BD', efficient_officer: '#E65100',
  star_officer: '#C62828', excellence_award: '#6A1B9A',
};

export default function Sidebar({ isOpen, onClose }) {
  const { user } = useAuthStore();

  if (!user) return null;

  const links = user.role === 'citizen' ? CITIZEN_LINKS
    : user.role === 'officer' ? OFFICER_LINKS
    : ADMIN_LINKS;

  const badgeKey = user.role === 'citizen' ? user.badge_level : user.govt_badge;
  const points = user.role === 'citizen' ? user.points : user.govt_points;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 99, display: 'none' }}
          id="sidebar-overlay"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`} aria-label="Sidebar navigation">
        {/* User summary card */}
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
            }} aria-hidden="true">
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

          {/* Points & Badge — text only, no emoji */}
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
              {/* Colored dot instead of emoji */}
              <div style={{
                width: 18, height: 18, borderRadius: '50%', margin: '0 auto 2px',
                background: BADGE_COLORS[badgeKey] || '#5C6080'
              }} aria-hidden="true" />
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
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
            <span className="nav-icon" aria-hidden="true">{link.icon}</span>
            <span>{link.label}</span>
          </NavLink>
        ))}

        {/* App version */}
        <div style={{
          position: 'absolute', bottom: 16, left: 0, right: 0,
          textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)'
        }}>
          JanSamadhan v1.0 — जन समाधान
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
