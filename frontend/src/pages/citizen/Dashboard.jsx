import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { complaintsAPI } from '../../services/api';
import { ComplaintCard, SkeletonCard } from '../../components/common';
import useAuthStore from '../../store/authStore';
import { useTranslation } from 'react-i18next';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend);

const BADGE_DATA = {
  newcomer:      { label: 'Newcomer',      next: 'Contributor',    nextPts: 50,   color: '#2E7D32' },
  contributor:   { label: 'Contributor',   next: 'Active Citizen', nextPts: 150,  color: '#E65100' },
  active_citizen:{ label: 'Active Citizen',next: 'Champion',       nextPts: 400,  color: '#0277BD' },
  champion:      { label: 'Champion',      next: 'Civic Hero',     nextPts: 1000, color: '#6A1B9A' },
  civic_hero:    { label: 'Civic Hero',    next: null,             nextPts: null, color: '#C62828' },
};

const StatIcon = ({ type }) => {
  const icons = {
    total: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    pending: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    inProgress: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>,
    resolved: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  };
  return icons[type] || null;
};

export default function CitizenDashboard() {
  const { user, refreshProfile } = useAuthStore();
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
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
      setDashboardData(statsRes);
      setRecentComplaints(complaintsRes.complaints || []);
    } catch { } finally { setLoading(false); }
  };

  const badge = BADGE_DATA[user?.badge_level] || BADGE_DATA.newcomer;
  const progress = badge.nextPts ? Math.min(((user?.points || 0) / badge.nextPts) * 100, 100) : 100;

  const statusData = dashboardData?.stats ? {
    labels: [t('Pending'), t('Active'), t('Resolved')],
    datasets: [{
      data: [
        dashboardData.stats.pending || 0,
        dashboardData.stats.inProgress || 0,
        dashboardData.stats.resolved || 0
      ],
      backgroundColor: ['#FF9800', '#2979FF', '#00C853'],
      borderWidth: 0,
    }]
  } : null;

  const barData = dashboardData?.byCategory ? {
    labels: dashboardData.byCategory.slice(0, 5).map(c => c.category?.replace(/_/g, ' ')),
    datasets: [{
      label: 'Complaints',
      data: dashboardData.byCategory.slice(0, 5).map(c => c.count),
      backgroundColor: '#5C6BC0', 
      borderRadius: 4,
      barPercentage: 0.6
    }]
  } : null;

  const lineData = dashboardData?.monthlyTrends ? {
    labels: dashboardData.monthlyTrends.map(m => {
      const d = new Date(m.month + '-01');
      return d.toLocaleString('en-IN', { month: 'short' });
    }),
    datasets: [{
      label: 'Trend',
      data: dashboardData.monthlyTrends.map(m => m.count),
      borderColor: '#5C6BC0', 
      backgroundColor: 'rgba(92, 107, 192, 0.1)',
      tension: 0.4,
      fill: true,
      pointRadius: 3
    }]
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1A237E',
        padding: 12,
        cornerRadius: 4,
        displayColors: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: '#E0E3EF', drawBorder: false },
        ticks: { font: { size: 10 }, color: '#666' }
      },
      x: {
        grid: { display: false, drawBorder: false },
        ticks: { font: { size: 10 }, color: '#666' }
      }
    }
  };

  const statItems = [
    { label: t('dashboard.stat_total', 'Total'),      value: stats?.total      || 0, type: 'total',      color: 'var(--secondary)' },
    { label: t('dashboard.stat_pending', 'Pending'),    value: stats?.pending    || 0, type: 'pending',    color: 'var(--warning)' },
    { label: t('dashboard.stat_in_progress', 'Active'), value: stats?.inProgress || 0, type: 'inProgress', color: 'var(--info)' },
    { label: t('dashboard.stat_resolved', 'Resolved'),  value: stats?.resolved   || 0, type: 'resolved',   color: 'var(--success)' },
  ];

  return (
    <>
      {/* ── MOBILE layout (CSS shows this, hides desktop) ── */}
      <div className="mobile-only mobile-dashboard">
        <div className="dash-greeting">
          <div style={{ fontSize: '0.72rem', opacity: 0.7, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {badge.label}
          </div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 800, marginBottom: 10 }}>
            {t('dashboard.welcome', 'Welcome')}, {user?.full_name?.split(' ')[0]}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 12px', textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, color: '#FFD54F', lineHeight: 1 }}>
                {user?.points || 0}
              </div>
              <div style={{ fontSize: '0.62rem', opacity: 0.75 }}>{t('dashboard.pts', 'pts')}</div>
            </div>
            {badge.next && (
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.68rem', opacity: 0.75, marginBottom: 3 }}>
                  {t('dashboard.progress_to', 'Next')}: {badge.next}
                </div>
                <div style={{ height: 5, background: 'rgba(255,255,255,0.2)', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${progress}%`, background: '#FFD54F', borderRadius: 3 }} />
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

        {/* Mobile Community Overview Charts */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: '0.95rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>Community Overview</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Status Breakdown (Donut) */}
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 12 }}>Status Breakdown</div>
              <div style={{ height: 180, position: 'relative' }}>
                {statusData ? <Doughnut data={statusData} options={{ maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'right', labels: { boxWidth: 8, font: { size: 10 } } } } }} /> : <div className="skeleton" style={{ height: '100%' }} />}
              </div>
            </div>

            {/* By Category (Bar) */}
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 12 }}>Top Categories</div>
              <div style={{ height: 180 }}>
                {barData ? <Bar data={barData} options={chartOptions} /> : <div className="skeleton" style={{ height: '100%' }} />}
              </div>
            </div>

            {/* Monthly Trend (Line) */}
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 12 }}>Monthly Trend</div>
              <div style={{ height: 180 }}>
                {lineData ? <Line data={lineData} options={chartOptions} /> : <div className="skeleton" style={{ height: '100%' }} />}
              </div>
            </div>
          </div>
        </div>

        <div className="dash-actions">
          <Link to="/file-complaint" className="dash-action-tile primary">
            <div className="tile-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </div>
            <span className="tile-label">{t('dashboard.act_file', 'File a Complaint')}</span>
          </Link>
          <Link to="/my-complaints" className="dash-action-tile">
            <div className="tile-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <span className="tile-label">{t('dashboard.act_track', 'My Complaints')}</span>
          </Link>
          <Link to="/map" className="dash-action-tile">
            <div className="tile-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
                <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
              </svg>
            </div>
            <span className="tile-label">{t('dashboard.act_map', 'Hotspot Map')}</span>
          </Link>
          <Link to="/leaderboard" className="dash-action-tile">
            <div className="tile-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
              </svg>
            </div>
            <span className="tile-label">{t('nav_leaderboard', 'Leaderboard')}</span>
          </Link>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title" style={{ fontSize: '0.95rem' }}>{t('dashboard.recent', 'Recent Complaints')}</h2>
            <Link to="/my-complaints" style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
              {t('dashboard.view_all', 'View All')}
            </Link>
          </div>
          {loading ? (
            <div style={{ display: 'grid', gap: 8 }}>{[1,2].map(i => <SkeletonCard key={i} />)}</div>
          ) : recentComplaints.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 12px' }}>
              <h3 className="empty-state-title" style={{ fontSize: '0.95rem' }}>{t('dashboard.no_complaints', 'No complaints yet')}</h3>
              <Link to="/file-complaint" className="btn btn-primary" style={{ marginTop: 10, fontSize: '0.85rem' }}>
                {t('dashboard.file_first', 'File First Complaint')}
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {recentComplaints.slice(0, 3).map(c => <ComplaintCard key={c.id} complaint={c} />)}
            </div>
          )}
        </div>
      </div>

      {/* ── DESKTOP layout (CSS hides on mobile) ── */}
      <div className="desktop-only">
        <div className="page-header">
          <div>
            <h1 className="page-title">{t('dashboard.welcome', 'Welcome')}, {user?.full_name?.split(' ')[0]}</h1>
            <p className="page-subtitle">{t('dashboard.subtitle', 'Your civic engagement dashboard')}</p>
          </div>
          <Link to="/file-complaint" className="btn btn-primary">
            {t('dashboard.file_new', '+ File New Complaint')}
          </Link>
        </div>

        {/* Points & Badge Card */}
        <div style={{
          background: `linear-gradient(135deg, var(--secondary) 0%, #283593 100%)`,
          borderRadius: 'var(--radius-lg)', padding: 24, color: 'white', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap'
        }}>
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
            <div style={{ fontSize: '0.8rem', opacity: 0.75, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('dashboard.badge_level', 'Your Badge Level')}</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800 }}>{badge.label}</div>
            {badge.next && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', opacity: 0.8, marginBottom: 4 }}>
                  <span>{t('dashboard.progress_to', 'Progress to')} {badge.next}</span>
                  <span>{user?.points || 0} / {badge.nextPts} {t('dashboard.pts', 'pts')}</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${progress}%`, background: '#FFD54F', borderRadius: 3, transition: 'width 1s ease' }} />
                </div>
              </div>
            )}
            {!badge.next && <div style={{ fontSize: '0.82rem', opacity: 0.8, marginTop: 4 }}>{t('dashboard.max_badge', 'Maximum badge level achieved.')}</div>}
          </div>
          <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.15)', borderRadius: 'var(--radius)', padding: '12px 20px' }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800, color: '#FFD54F' }}>{user?.points || 0}</div>
            <div style={{ fontSize: '0.78rem', opacity: 0.8 }}>{t('dashboard.total_pts', 'Total Points')}</div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid-4" style={{ marginBottom: 24 }}>
          {[
            { label: t('dashboard.stat_total', 'Total Filed'),      value: stats?.total      || 0, type: 'total',      bg: 'var(--secondary-light)', color: 'var(--secondary)' },
            { label: t('dashboard.stat_pending', 'Pending'),          value: stats?.pending    || 0, type: 'pending',    bg: 'var(--warning-bg)',      color: 'var(--warning)' },
            { label: t('dashboard.stat_in_progress', 'In Progress'),  value: stats?.inProgress || 0, type: 'inProgress', bg: 'var(--info-bg)',         color: 'var(--info)' },
            { label: t('dashboard.stat_resolved', 'Resolved'),        value: stats?.resolved   || 0, type: 'resolved',   bg: 'var(--success-bg)',      color: 'var(--success)' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-icon" style={{ background: s.bg, color: s.color }}><StatIcon type={s.type} /></div>
              <div className="stat-info">
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Community Overview Charts */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: '0.95rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            Community Overview
            <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)', background: 'var(--surface-variant)', padding: '2px 8px', borderRadius: 4 }}>
              Current city stats
            </span>
          </h2>
          <div className="grid-3">
            {/* Status Breakdown (Donut) */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 16 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 12 }}>Status Breakdown</div>
              <div style={{ flex: 1, position: 'relative', minHeight: 140 }}>
                {statusData ? <Doughnut data={statusData} options={{ maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'right', labels: { boxWidth: 8, font: { size: 10 } } } } }} /> : <div className="skeleton" style={{ height: '100%' }} />}
              </div>
            </div>

            {/* By Category (Bar) */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 16 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 12 }}>Top Categories</div>
              <div style={{ flex: 1, minHeight: 140 }}>
                {barData ? <Bar data={barData} options={chartOptions} /> : <div className="skeleton" style={{ height: '100%' }} />}
              </div>
            </div>

            {/* Monthly Trend (Line) */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 16 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 12 }}>Monthly Trend</div>
              <div style={{ flex: 1, minHeight: 140 }}>
                {lineData ? <Line data={lineData} options={chartOptions} /> : <div className="skeleton" style={{ height: '100%' }} />}
              </div>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid-3" style={{ marginBottom: 24 }}>
          {[
            { to: '/file-complaint', label: t('dashboard.act_file', 'File Complaint'),   desc: t('dashboard.act_file_desc', 'Report a new civic issue'),         primary: true },
            { to: '/my-complaints',  label: t('dashboard.act_track', 'Track Complaints'), desc: t('dashboard.act_track_desc', 'View status of your complaints') },
            { to: '/map',            label: t('dashboard.act_map', 'View Hotspot Map'),  desc: t('dashboard.act_map_desc', 'See issues in your area') },
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
                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 4 }}>{a.label}</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{a.desc}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Recent complaints */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">{t('dashboard.recent', 'Recent Complaints')}</h2>
            <Link to="/my-complaints" style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
              {t('dashboard.view_all', 'View All')}
            </Link>
          </div>
          {loading ? (
            <div style={{ display: 'grid', gap: 12 }}>{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
          ) : recentComplaints.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <h3 className="empty-state-title">{t('dashboard.no_complaints', 'No complaints yet')}</h3>
              <p className="empty-state-desc">{t('dashboard.no_complaints_desc', 'File your first complaint to get started.')}</p>
              <Link to="/file-complaint" className="btn btn-primary">{t('dashboard.file_first', 'File First Complaint')}</Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {recentComplaints.map(c => <ComplaintCard key={c.id} complaint={c} />)}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
