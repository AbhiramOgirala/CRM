import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { complaintsAPI } from '../../services/api';
import { StatusBadge, PriorityBadge } from '../../components/common';
import useAuthStore from '../../store/authStore';

const GOVT_BADGE_DATA = {
  new_officer:       { label: 'New Officer',       next: 'Active Officer',    nextPts: 100  },
  active_officer:    { label: 'Active Officer',     next: 'Efficient Officer', nextPts: 300  },
  efficient_officer: { label: 'Efficient Officer',  next: 'Star Officer',      nextPts: 700  },
  star_officer:      { label: 'Star Officer',       next: 'Excellence Award',  nextPts: 1500 },
  excellence_award:  { label: 'Excellence Award',   next: null,                nextPts: null },
};

const BADGE_COLORS = {
  new_officer: '#0277BD', active_officer: '#2E7D32',
  efficient_officer: '#E65100', star_officer: '#6A1B9A', excellence_award: '#C62828',
};

export default function OfficerDashboard() {
  const { user, refreshProfile } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [myQueue, setMyQueue] = useState([]);
  const [escalated, setEscalated] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, pendingRes, escRes] = await Promise.all([
          complaintsAPI.getDashboard(),
          complaintsAPI.getAll({ limit: 6, status: 'pending', sortBy: 'created_at', sortOrder: 'asc' }),
          complaintsAPI.getAll({ limit: 5, status: 'escalated', sortBy: 'created_at', sortOrder: 'asc' })
        ]);
        setStats(statsRes.stats);
        setMyQueue(pendingRes.complaints || []);
        setEscalated(escRes.complaints || []);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
    refreshProfile();
  }, []);

  const badge = GOVT_BADGE_DATA[user?.govt_badge] || GOVT_BADGE_DATA.new_officer;
  const badgeColor = BADGE_COLORS[user?.govt_badge] || BADGE_COLORS.new_officer;
  const progress = badge.nextPts ? Math.min(((user?.govt_points || 0) / badge.nextPts) * 100, 100) : 100;

  const statItems = [
    { label: 'Total', value: stats?.total || 0, bg: 'var(--secondary-light)', color: 'var(--secondary)' },
    { label: 'Pending', value: stats?.pending || 0, bg: 'var(--warning-bg)', color: 'var(--warning)' },
    { label: 'Escalated', value: stats?.escalated || 0, bg: '#FCE4EC', color: '#C2185B' },
    { label: 'Resolved', value: stats?.resolved || 0, bg: 'var(--success-bg)', color: 'var(--success)' },
  ];

  return (
    <>
      {/* ── MOBILE layout ── */}
      <div className="mobile-only mobile-dashboard">
        {/* Greeting / rank card */}
        <div className="dash-greeting" style={{ background: 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%)' }}>
          <div style={{ fontSize: '0.72rem', opacity: 0.7, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {badge.label}
          </div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 800, marginBottom: 10 }}>
            {user?.full_name?.split(' ')[0]}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 12px', textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, color: '#A5D6A7', lineHeight: 1 }}>
                {user?.govt_points || 0}
              </div>
              <div style={{ fontSize: '0.62rem', opacity: 0.75 }}>pts</div>
            </div>
            {badge.next && (
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.68rem', opacity: 0.75, marginBottom: 3 }}>Next: {badge.next}</div>
                <div style={{ height: 5, background: 'rgba(255,255,255,0.2)', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${progress}%`, background: '#A5D6A7', borderRadius: 3 }} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="dash-stats-row">
          {statItems.map(s => (
            <div key={s.label} className="dash-stat-tile">
              <div className="tile-value" style={{ color: s.color }}>{s.value}</div>
              <div className="tile-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="dash-actions">
          <Link to="/officer/complaints" className="dash-action-tile primary">
            <div className="tile-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
                <line x1="8" y1="18" x2="21" y2="18"/>
              </svg>
            </div>
            <span className="tile-label">View Queue</span>
          </Link>
          <Link to="/map" className="dash-action-tile">
            <div className="tile-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
                <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
              </svg>
            </div>
            <span className="tile-label">Hotspot Map</span>
          </Link>
          <Link to="/leaderboard" className="dash-action-tile">
            <div className="tile-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
              </svg>
            </div>
            <span className="tile-label">Leaderboard</span>
          </Link>
          <Link to="/profile" className="dash-action-tile">
            <div className="tile-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <span className="tile-label">Profile</span>
          </Link>
        </div>

        {escalated.length > 0 && (
          <div className="card" style={{ borderColor: '#FFCC02', background: '#FFFDE7', marginBottom: 12 }}>
            <div className="card-header" style={{ paddingBottom: 10, marginBottom: 10 }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.9rem', fontWeight: 700, color: '#E65100' }}>
                Escalated — Immediate Action
              </h2>
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              {escalated.slice(0, 3).map(c => (
                <Link key={c.id} to={`/complaint/${c.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'white', borderRadius: 8, border: '1px solid #FFCC02' }}>
                    <span style={{ background: '#FCE4EC', color: '#C62828', borderRadius: 6, padding: '2px 8px', fontWeight: 800, fontSize: '0.68rem', flexShrink: 0 }}>L{c.escalation_level}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
                    </div>
                    <PriorityBadge priority={c.priority} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-header">
            <h2 className="card-title" style={{ fontSize: '0.95rem' }}>Pending Queue</h2>
            <Link to="/officer/complaints" style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>View All</Link>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 24 }}><div className="loading-spinner" style={{ margin: '0 auto' }} /></div>
          ) : myQueue.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 12px' }}>
              <h3 className="empty-state-title" style={{ fontSize: '0.95rem' }}>Queue is clear</h3>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {myQueue.slice(0, 4).map(c => (
                <Link key={c.id} to={`/complaint/${c.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 700, color: 'var(--secondary)', background: 'var(--secondary-light)', padding: '1px 6px', borderRadius: 4 }}>#{c.ticket_number}</span>
                      <PriorityBadge priority={c.priority} />
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{c.departments?.name}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── DESKTOP layout ── */}
      <div className="desktop-only">
        <div className="page-header">
          <div>
            <h1 className="page-title">Officer Dashboard</h1>
            <p className="page-subtitle">{user?.departments?.name || 'Department'} — Manage your queue</p>
          </div>
          <Link to="/officer/complaints" className="btn btn-primary">View Full Queue</Link>
        </div>

        {/* Rank card */}
        <div style={{
          background: 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%)',
          borderRadius: 'var(--radius-lg)', padding: 24, color: 'white',
          marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap'
        }}>
          <div style={{ width: 56, height: 56, borderRadius: 12, flexShrink: 0, background: badgeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.25)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Officer Rank</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800 }}>{badge.label}</div>
            {badge.next && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', opacity: 0.8, marginBottom: 4 }}>
                  <span>Progress to {badge.next}</span>
                  <span>{user?.govt_points || 0} / {badge.nextPts} pts</span>
                </div>
                <div style={{ height: 8, background: 'rgba(255,255,255,0.2)', borderRadius: 4 }}>
                  <div style={{ height: '100%', width: `${progress}%`, background: '#A5D6A7', borderRadius: 4, transition: 'width 1s ease' }} />
                </div>
              </div>
            )}
            {!badge.next && <div style={{ fontSize: '0.82rem', opacity: 0.8, marginTop: 4 }}>Maximum rank achieved.</div>}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { label: 'Govt Points', value: user?.govt_points || 0, color: '#FFD54F' },
              { label: 'Resolved', value: user?.complaints_resolved || 0, color: '#A5D6A7' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.15)', borderRadius: 'var(--radius)', padding: '12px 16px' }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.72rem', opacity: 0.8 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Points guide */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 20px', marginBottom: 20, display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: '0.82rem' }}>
          <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Earn Points:</span>
          {[
            { label: 'Critical resolved', pts: '+25' },
            { label: 'High resolved', pts: '+20' },
            { label: 'Medium resolved', pts: '+15' },
            { label: 'Low resolved', pts: '+10' },
            { label: 'Within SLA bonus', pts: '+10' },
          ].map(p => (
            <span key={p.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ background: '#E8F5E9', color: '#2E7D32', borderRadius: 10, padding: '2px 8px', fontWeight: 700, fontSize: '0.75rem' }}>{p.pts}</span>
              {p.label}
            </span>
          ))}
        </div>

        {/* Stats */}
        <div className="grid-4" style={{ marginBottom: 24 }}>
          {statItems.map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-info">
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Escalated */}
        {escalated.length > 0 && (
          <div className="card" style={{ marginBottom: 20, borderColor: '#FFCC02', background: '#FFFDE7' }}>
            <div className="card-header">
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700, color: '#E65100' }}>
                Escalated — Needs Immediate Action
              </h2>
              <Link to="/officer/complaints?status=escalated" style={{ fontSize: '0.82rem', color: '#E65100', fontWeight: 600, textDecoration: 'none' }}>View All</Link>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {escalated.map(c => (
                <Link key={c.id} to={`/complaint/${c.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'white', borderRadius: 8, border: '1px solid #FFCC02' }}>
                    <span style={{ background: '#FCE4EC', color: '#C62828', borderRadius: 6, padding: '4px 10px', fontWeight: 800, fontSize: '0.72rem', flexShrink: 0 }}>L{c.escalation_level}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.departments?.name} — {c.districts?.name}</div>
                    </div>
                    <PriorityBadge priority={c.priority} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Resolution rate */}
        {stats && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontWeight: 700 }}>System-wide Resolution Rate</span>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 800, color: 'var(--success)' }}>{stats.resolutionRate}%</span>
            </div>
            <div className="progress">
              <div className="progress-bar" style={{ width: `${stats.resolutionRate}%`, background: 'var(--success)' }} />
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
              {stats.resolved} of {stats.total} total complaints resolved
            </div>
          </div>
        )}

        {/* Pending queue table */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Pending — All Departments</h2>
            <Link to="/officer/complaints" style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>View All</Link>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div className="loading-spinner" style={{ margin: '0 auto 12px' }} />
            </div>
          ) : myQueue.length === 0 ? (
            <div className="empty-state">
              <h3 className="empty-state-title">No pending complaints</h3>
              <p className="empty-state-desc">The system queue is clear.</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    {['Ticket', 'Title', 'Category', 'Priority', 'Department', 'SLA Deadline'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {myQueue.map(c => {
                    const isMyDept = c.department_id === user?.department_id;
                    const slaBreach = c.sla_deadline && new Date(c.sla_deadline) < new Date();
                    return (
                      <tr key={c.id} style={{ cursor: 'pointer', background: isMyDept ? '#F1F8E9' : 'white' }}
                        onClick={() => window.location.href = `/complaint/${c.id}`}>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 700, color: 'var(--secondary)', background: 'var(--secondary-light)', padding: '2px 8px', borderRadius: 4 }}>
                            #{c.ticket_number}
                          </span>
                          {isMyDept && <div style={{ fontSize: '0.65rem', color: '#2E7D32', fontWeight: 700, marginTop: 2 }}>Your Dept</div>}
                        </td>
                        <td style={{ maxWidth: 200 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
                        </td>
                        <td style={{ fontSize: '0.8rem' }}>{c.category?.replace(/_/g, ' ')}</td>
                        <td><PriorityBadge priority={c.priority} /></td>
                        <td style={{ fontSize: '0.8rem' }}>{c.departments?.name || '—'}</td>
                        <td style={{ fontSize: '0.8rem', color: slaBreach ? '#C62828' : 'var(--text-muted)', fontWeight: slaBreach ? 700 : 400 }}>
                          {c.sla_deadline ? new Date(c.sla_deadline).toLocaleDateString('en-IN') : '—'}
                          {slaBreach && ' (Overdue)'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
