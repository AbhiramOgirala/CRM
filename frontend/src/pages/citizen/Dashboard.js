import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Doughnut, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { complaintsAPI } from '../../services/api';
import { ComplaintCard, SkeletonCard } from '../../components/common';
import useAuthStore from '../../store/authStore';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const BADGE_DATA = {
  newcomer: { icon: '🌱', label: 'Newcomer', next: 'Contributor', nextPts: 50, color: '#66BB6A', minPts: 0 },
  contributor: { icon: '⭐', label: 'Contributor', next: 'Active Citizen', nextPts: 150, color: '#FFA726', minPts: 50 },
  active_citizen: { icon: '🏆', label: 'Active Citizen', next: 'Champion', nextPts: 400, color: '#42A5F5', minPts: 150 },
  champion: { icon: '🎖️', label: 'Champion', next: 'Civic Hero', nextPts: 1000, color: '#AB47BC', minPts: 400 },
  civic_hero: { icon: '🦸', label: 'Civic Hero', next: null, nextPts: null, color: '#EF5350', minPts: 1000 },
};

const getCalculatedBadge = (points) => {
  const pts = points || 0;
  if (pts >= 1000) return BADGE_DATA.civic_hero;
  if (pts >= 400) return BADGE_DATA.champion;
  if (pts >= 150) return BADGE_DATA.active_citizen;
  if (pts >= 50) return BADGE_DATA.contributor;
  return BADGE_DATA.newcomer;
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
      // For citizen, we want stats specifically for their complaints. 
      // Current getDashboard returns system-wide stats. We can calculate basic user stats from their own recent complaints or a specialized endpoint.
      // But let's fetch all their complaints to build accurate charts.
      const complaintsRes = await complaintsAPI.getMy({ limit: 100, sortBy: 'created_at', sortOrder: 'desc' });
      const myComplaints = complaintsRes.complaints || [];

      const userStats = {
        total: myComplaints.length,
        pending: myComplaints.filter(c => c.status === 'pending').length,
        inProgress: myComplaints.filter(c => c.status === 'in_progress').length,
        resolved: myComplaints.filter(c => c.status === 'resolved').length,
        escalated: myComplaints.filter(c => c.status === 'escalated').length,
      };

      const byCategoryCounts = {};
      myComplaints.forEach(c => {
        byCategoryCounts[c.category] = (byCategoryCounts[c.category] || 0) + 1;
      });
      const byCategory = Object.entries(byCategoryCounts).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);

      setStats({ ...userStats, byCategory });
      setRecentComplaints(myComplaints.slice(0, 5));
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const badge = getCalculatedBadge(user?.points);
  const progress = badge.nextPts ? Math.min(((user?.points || 0) / badge.nextPts) * 100, 100) : 100;

  const donutData = stats ? {
    labels: ['Pending', 'In Progress', 'Resolved', 'Escalated'],
    datasets: [{
      data: [stats.pending || 0, stats.inProgress || 0, stats.resolved || 0, stats.escalated || 0],
      backgroundColor: ['#F59E0B', '#6366F1', '#10B981', '#EF4444'],
      borderWidth: 0,
    }]
  } : null;

  const barData = stats?.byCategory ? {
    labels: stats.byCategory.slice(0, 5).map(c => c.category?.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())),
    datasets: [{
      label: 'My Complaints',
      data: stats.byCategory.slice(0, 5).map(c => c.count),
      backgroundColor: '#3b82f6',
      borderRadius: 4
    }]
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(26, 26, 46, 0.08)', drawBorder: false }, ticks: { color: '#5C6080', maxTicksLimit: 5 } },
      x: { grid: { display: false, drawBorder: false }, ticks: { color: '#5C6080' } }
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome, {user?.full_name?.split(' ')[0]}! 👋</h1>
          <p className="page-subtitle">Your civic engagement dashboard</p>
        </div>
        <Link to="/file-complaint" className="btn btn-primary">
          ✍️ File New Complaint
        </Link>
      </div>

      {/* Points & Badge Card */}
      <div style={{
        background: `linear-gradient(135deg, var(--secondary) 0%, #283593 100%)`,
        borderRadius: 'var(--radius-lg)', padding: 24, color: 'white', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap'
      }}>
        <div style={{ fontSize: '3rem' }}>{badge.icon}</div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: 2 }}>Your Badge</div>
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
          {!badge.next && <div style={{ fontSize: '0.82rem', opacity: 0.8, marginTop: 4 }}>🎉 Maximum badge achieved!</div>}
        </div>
        <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.15)', borderRadius: 'var(--radius)', padding: '12px 20px' }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800, color: '#FFD54F' }}>
            {user?.points || 0}
          </div>
          <div style={{ fontSize: '0.78rem', opacity: 0.8 }}>Total Points</div>
        </div>
      </div>

      {/* Citizen Personal Charts */}
      {stats && stats.total > 0 && (
        <div className="grid-2" style={{ marginBottom: 24, gap: '24px' }}>
          <div className="card citizen-chart-card">
            <h2 className="card-title" style={{ marginBottom: 24 }}>My Complaints by Status</h2>
            <div className="citizen-chart-content">
              <div style={{ width: '150px', height: '150px', position: 'relative' }}>
                {donutData ? (
                  <Doughnut data={donutData} options={{ maintainAspectRatio: false, cutout: '70%', plugins: { legend: { display: false } } }} />
                ) : (
                  <div className="skeleton" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                )}
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { label: 'Pending', color: '#F59E0B', value: stats.pending },
                  { label: 'In Progress', color: '#6366F1', value: stats.inProgress },
                  { label: 'Resolved', color: '#10B981', value: stats.resolved },
                  { label: 'Escalated', color: '#EF4444', value: stats.escalated }
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{item.label}</span>
                    </div>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.9rem' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card citizen-chart-card">
            <h2 className="card-title" style={{ marginBottom: 24 }}>Most Frequent Categories</h2>
            <div style={{ height: '150px' }}>
              {barData ? (
                <Bar data={barData} options={chartOptions} />
              ) : (
                <div className="skeleton" style={{ height: '100%' }} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total Filed', value: stats?.total || 0, icon: '📋', bg: 'var(--secondary-light)', color: 'var(--secondary)' },
          { label: 'Pending', value: stats?.pending || 0, icon: '⏳', bg: 'var(--warning-bg)', color: 'var(--warning)' },
          { label: 'In Progress', value: stats?.inProgress || 0, icon: '🔄', bg: 'var(--info-bg)', color: 'var(--info)' },
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

      {/* Quick actions */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        {[
          { to: '/file-complaint', icon: '✍️', label: 'File Complaint', desc: 'Report a new civic issue', primary: true },
          { to: '/my-complaints', icon: '📋', label: 'Track Complaints', desc: 'View status of your complaints' },
          { to: '/map', icon: '🗺️', label: 'View Hotspot Map', desc: 'See issues in your area' },
        ].map(a => (
          <Link key={a.to} to={a.to} style={{ textDecoration: 'none' }}>
            <div style={{
              background: a.primary ? 'var(--primary)' : 'var(--surface)',
              border: a.primary ? 'none' : '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '18px 20px',
              color: a.primary ? 'white' : 'var(--text-primary)',
              boxShadow: 'var(--shadow)', transition: 'all 0.2s',
              cursor: 'pointer'
            }}
              onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>{a.icon}</div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 4 }}>{a.label}</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{a.desc}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent complaints */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">📋 Recent Complaints</h2>
          <Link to="/my-complaints" style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
            View All →
          </Link>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gap: 12 }}>
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : recentComplaints.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <h3 className="empty-state-title">No complaints yet</h3>
            <p className="empty-state-desc">File your first complaint to get started. Every report makes your community better!</p>
            <Link to="/file-complaint" className="btn btn-primary">✍️ File First Complaint</Link>
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
