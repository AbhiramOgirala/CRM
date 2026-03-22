import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { complaintsAPI } from '../../services/api';
import { ComplaintCard, SkeletonCard } from '../../components/common';
import useAuthStore from '../../store/authStore';

// Badge data — text only, formal government style, no emoji
const BADGE_DATA = {
  newcomer:      { label: 'Newcomer',      next: 'Contributor',    nextPts: 50,   color: '#2E7D32', accent: '#E8F5E9' },
  contributor:   { label: 'Contributor',   next: 'Active Citizen', nextPts: 150,  color: '#E65100', accent: '#FFF3E0' },
  active_citizen:{ label: 'Active Citizen',next: 'Champion',       nextPts: 400,  color: '#0277BD', accent: '#E1F5FE' },
  champion:      { label: 'Champion',      next: 'Civic Hero',     nextPts: 1000, color: '#6A1B9A', accent: '#F3E5F5' },
  civic_hero:    { label: 'Civic Hero',    next: null,             nextPts: null, color: '#C62828', accent: '#FFEBEE' },
};

// Stat card SVG icons — formal, no emoji
const StatIcon = ({ type }) => {
  const icons = {
    total: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
    pending: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    inProgress: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
        <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
      </svg>
    ),
    resolved: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
  };
  return icons[type] || null;
};

// Quick action SVG icons
const ActionIcon = ({ type }) => {
  const icons = {
    file: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
      </svg>
    ),
    track: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
        <line x1="8" y1="18" x2="21" y2="18"/>
        <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
      </svg>
    ),
    map: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
        <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
      </svg>
    ),
  };
  return icons[type] || null;
};

export default function CitizenDashboard() {
  const { user, refreshProfile } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [recentComplaints, setRecentComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    refreshProfile();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, complaintsRes] = await Promise.all([
        complaintsAPI.getDashboard(),
        complaintsAPI.getMy({ limit: 5, sortBy: 'created_at', sortOrder: 'desc' })
      ]);
      setStats(statsRes.stats);
      setRecentComplaints(complaintsRes.complaints || []);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const badge = BADGE_DATA[user?.badge_level] || BADGE_DATA.newcomer;
  const progress = badge.nextPts ? Math.min(((user?.points || 0) / badge.nextPts) * 100, 100) : 100;

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome, {user?.full_name?.split(' ')[0]}</h1>
          <p className="page-subtitle">Your civic engagement dashboard</p>
        </div>
        <Link to="/file-complaint" className="btn btn-primary">
          + File New Complaint
        </Link>
      </div>

      {/* Points & Badge Card — formal, government styled */}
      <div style={{
        background: `linear-gradient(135deg, var(--secondary) 0%, #283593 100%)`,
        borderRadius: 'var(--radius-lg)', padding: 24, color: 'white', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap'
      }}>
        {/* Badge rank indicator — colored bar instead of emoji */}
        <div style={{
          width: 56, height: 56, borderRadius: 12, flexShrink: 0,
          background: badge.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)'
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: '0.8rem', opacity: 0.75, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Your Badge Level</div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800 }}>{badge.label}</div>
          {badge.next && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', opacity: 0.8, marginBottom: 4 }}>
                <span>Progress to {badge.next}</span>
                <span>{user?.points || 0} / {badge.nextPts} pts</span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 3 }}>
                <div style={{ height: '100%', width: `${progress}%`, background: '#FFD54F', borderRadius: 3, transition: 'width 1s ease' }} />
              </div>
            </div>
          )}
          {!badge.next && (
            <div style={{ fontSize: '0.82rem', opacity: 0.8, marginTop: 4 }}>
              Maximum badge level achieved.
            </div>
          )}
        </div>
        <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.15)', borderRadius: 'var(--radius)', padding: '12px 20px' }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800, color: '#FFD54F' }}>
            {user?.points || 0}
          </div>
          <div style={{ fontSize: '0.78rem', opacity: 0.8 }}>Total Points</div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total Filed',  value: stats?.total       || 0, type: 'total',      bg: 'var(--secondary-light)', color: 'var(--secondary)' },
          { label: 'Pending',      value: stats?.pending     || 0, type: 'pending',    bg: 'var(--warning-bg)',      color: 'var(--warning)' },
          { label: 'In Progress',  value: stats?.inProgress  || 0, type: 'inProgress', bg: 'var(--info-bg)',         color: 'var(--info)' },
          { label: 'Resolved',     value: stats?.resolved    || 0, type: 'resolved',   bg: 'var(--success-bg)',      color: 'var(--success)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg, color: s.color }}>
              <StatIcon type={s.type} />
            </div>
            <div className="stat-info">
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        {[
          { to: '/file-complaint', iconType: 'file',  label: 'File Complaint',    desc: 'Report a new civic issue',          primary: true },
          { to: '/my-complaints',  iconType: 'track', label: 'Track Complaints',  desc: 'View status of your complaints' },
          { to: '/map',            iconType: 'map',   label: 'View Hotspot Map',  desc: 'See issues in your area' },
        ].map(a => (
          <Link key={a.to} to={a.to} style={{ textDecoration: 'none' }}>
            <div style={{
              background: a.primary ? 'var(--primary)' : 'var(--surface)',
              border: a.primary ? 'none' : '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '18px 20px',
              color: a.primary ? 'white' : 'var(--text-primary)',
              boxShadow: 'var(--shadow)', transition: 'all 0.2s', cursor: 'pointer'
            }}
              onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ marginBottom: 10, opacity: a.primary ? 0.9 : 0.7 }}>
                <ActionIcon type={a.iconType} />
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 4 }}>{a.label}</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{a.desc}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent complaints */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Recent Complaints</h2>
          <Link to="/my-complaints" style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
            View All →
          </Link>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gap: 12 }}>
            {[1,2,3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : recentComplaints.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <h3 className="empty-state-title">No complaints yet</h3>
            <p className="empty-state-desc">File your first complaint to get started. Every report makes your community better.</p>
            <Link to="/file-complaint" className="btn btn-primary">File First Complaint</Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {recentComplaints.map(c => <ComplaintCard key={c.id} complaint={c} />)}
          </div>
        )}
      </div>
    </div>
  );
}
