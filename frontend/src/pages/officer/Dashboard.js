import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { complaintsAPI } from '../../services/api';
import { StatusBadge, PriorityBadge } from '../../components/common';
import useAuthStore from '../../store/authStore';

const GOVT_BADGE_DATA = {
  new_officer: { icon: '🔰', label: 'New Officer', next: 'Active Officer', nextPts: 100 },
  active_officer: { icon: '⚙️', label: 'Active Officer', next: 'Efficient Officer', nextPts: 300 },
  efficient_officer: { icon: '🌟', label: 'Efficient Officer', next: 'Star Officer', nextPts: 700 },
  star_officer: { icon: '💫', label: 'Star Officer', next: 'Excellence Award', nextPts: 1500 },
  excellence_award: { icon: '🏅', label: 'Excellence Award', next: null, nextPts: null },
};

const getCalculatedGovtBadge = (points) => {
  const pts = points || 0;
  if (pts >= 1500) return GOVT_BADGE_DATA.excellence_award;
  if (pts >= 700) return GOVT_BADGE_DATA.star_officer;
  if (pts >= 300) return GOVT_BADGE_DATA.efficient_officer;
  if (pts >= 100) return GOVT_BADGE_DATA.active_officer;
  return GOVT_BADGE_DATA.new_officer;
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

  const badge = getCalculatedGovtBadge(user?.govt_points);
  const progress = badge.nextPts ? Math.min(((user?.govt_points || 0) / badge.nextPts) * 100, 100) : 100;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Officer Dashboard 👮</h1>
          <p className="page-subtitle">
            {user?.departments?.name || 'Department'} — View all complaints, manage your queue
          </p>
        </div>
        <Link to="/officer/complaints" className="btn btn-primary">View Full Queue →</Link>
      </div>

      {/* Officer Badge + Points Card */}
      <div style={{
        background: 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%)',
        borderRadius: 'var(--radius-lg)', padding: 24, color: 'white',
        marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap'
      }}>
        <div style={{ fontSize: '3rem' }}>{badge.icon}</div>
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
          {!badge.next && <div style={{ fontSize: '0.82rem', opacity: 0.8, marginTop: 4 }}>🎉 Maximum rank achieved!</div>}
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

      {/* Points earning guide */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '14px 20px', marginBottom: 20,
        display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: '0.82rem'
      }}>
        <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>💡 Earn Points:</span>
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
        {[
          { label: 'Total (All Depts)', value: stats?.total || 0, icon: '📋', bg: 'var(--secondary-light)', color: 'var(--secondary)' },
          { label: 'Pending', value: stats?.pending || 0, icon: '⏳', bg: 'var(--warning-bg)', color: 'var(--warning)' },
          { label: 'Escalated', value: stats?.escalated || 0, icon: '🔺', bg: '#FCE4EC', color: '#C2185B' },
          { label: 'Resolved', value: stats?.resolved || 0, icon: '✅', bg: 'var(--success-bg)', color: 'var(--success)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg }}>
              <span style={{ fontSize: '1.3rem' }}>{s.icon}</span>
            </div>
            <div className="stat-info">
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Escalated complaints alert */}
      {escalated.length > 0 && (
        <div className="card" style={{ marginBottom: 20, borderColor: '#FFCC02', background: '#FFFDE7' }}>
          <div className="card-header">
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700, color: '#E65100' }}>
              🔺 Escalated — Needs Immediate Action
            </h2>
            <Link to="/officer/complaints?status=escalated" style={{ fontSize: '0.82rem', color: '#E65100', fontWeight: 600, textDecoration: 'none' }}>
              View All →
            </Link>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {escalated.map(c => (
              <Link key={c.id} to={`/complaint/${c.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', background: 'white',
                  borderRadius: 8, border: '1px solid #FFCC02'
                }}>
                  <span style={{ background: '#FCE4EC', color: '#C62828', borderRadius: 6, padding: '4px 10px', fontWeight: 800, fontSize: '0.72rem', flexShrink: 0 }}>
                    L{c.escalation_level}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.departments?.name} • {c.districts?.name}</div>
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
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 800, color: 'var(--success)' }}>
              {stats.resolutionRate}%
            </span>
          </div>
          <div className="progress">
            <div className="progress-bar" style={{ width: `${stats.resolutionRate}%`, background: 'var(--success)' }} />
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {stats.resolved} of {stats.total} total complaints resolved across all departments
          </div>
        </div>
      )}

      {/* Pending queue for my dept */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">⏳ Pending — All Departments</h2>
          <Link to="/officer/complaints" style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
            View All →
          </Link>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div className="loading-spinner" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading...</p>
          </div>
        ) : myQueue.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎉</div>
            <h3 className="empty-state-title">No pending complaints!</h3>
            <p className="empty-state-desc">Great work! The system queue is clear.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Ticket', 'Title', 'Category', 'Priority', 'Department', 'SLA Deadline'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {myQueue.map(c => {
                  const isMyDept = c.department_id === user?.department_id;
                  const slaBreach = c.sla_deadline && new Date(c.sla_deadline) < new Date();
                  return (
                    <tr key={c.id} style={{ cursor: 'pointer', background: isMyDept ? '#F1F8E9' : 'white', borderBottom: '1px solid var(--border)' }}
                      onClick={() => window.location.href = `/complaint/${c.id}`}>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 700, color: 'var(--secondary)', background: 'var(--secondary-light)', padding: '2px 8px', borderRadius: 4 }}>
                          #{c.ticket_number}
                        </span>
                        {isMyDept && <div style={{ fontSize: '0.65rem', color: '#2E7D32', fontWeight: 700, marginTop: 2 }}>✓ Your Dept</div>}
                      </td>
                      <td style={{ padding: '10px 14px', maxWidth: 200 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '0.8rem' }}>{c.category?.replace(/_/g, ' ')}</td>
                      <td style={{ padding: '10px 14px' }}><PriorityBadge priority={c.priority} /></td>
                      <td style={{ padding: '10px 14px', fontSize: '0.8rem' }}>{c.departments?.name || '—'}</td>
                      <td style={{ padding: '10px 14px', fontSize: '0.8rem', color: slaBreach ? '#C62828' : 'var(--text-muted)', fontWeight: slaBreach ? 700 : 400 }}>
                        {c.sla_deadline ? new Date(c.sla_deadline).toLocaleDateString('en-IN') : '—'}
                        {slaBreach && ' ⚠️'}
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
  );
}
