import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { complaintsAPI, adminAPI } from '../../services/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement);

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([adminAPI.getStats(), complaintsAPI.getDashboard()])
      .then(([sysStats, dashboard]) => {
        setStats(sysStats);
        setDashboardData(dashboard);
      })
      .finally(() => setLoading(false));
  }, []);

  const donutData = dashboardData?.stats ? {
    labels: ['Pending', 'In Progress', 'Resolved'],
    datasets: [{
      data: [dashboardData.stats.pending || 0, dashboardData.stats.inProgress || 0, dashboardData.stats.resolved || 0],
      backgroundColor: ['#F59E0B', '#6366F1', '#10B981'],
      borderWidth: 0,
      hoverOffset: 4
    }]
  } : null;

  const barData = dashboardData?.byCategory ? {
    labels: dashboardData.byCategory.slice(0, 8).map(c => c.category?.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())),
    datasets: [{
      label: 'Complaints',
      data: dashboardData.byCategory.slice(0, 8).map(c => c.count),
      backgroundColor: '#7C3AED',
      borderRadius: 4
    }]
  } : null;

  const lineData = dashboardData?.monthlyTrends ? {
    labels: dashboardData.monthlyTrends.map(m => {
      const d = new Date(m.month + '-01');
      return d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
    }),
    datasets: [{
      label: 'Monthly Trend',
      data: dashboardData.monthlyTrends.map(m => m.count),
      borderColor: '#6366F1',
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
      tension: 0.4, fill: true, pointRadius: 4,
      pointBackgroundColor: '#6366F1'
    }]
  } : null;

  const darkChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index', intersect: false }
    },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false }, ticks: { color: '#8b92a5', maxTicksLimit: 5 } },
      x: { grid: { display: false, drawBorder: false }, ticks: { color: '#8b92a5' } }
    }
  };

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true }
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">⚙️ Admin Dashboard</h1>
          <p className="page-subtitle">System-wide overview and management</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/admin/users" className="btn btn-outline btn-sm">👥 Manage Users</Link>
          <Link to="/admin/complaints" className="btn btn-primary btn-sm">📋 All Complaints</Link>
        </div>
      </div>

      {/* System stats */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[
          { label: 'Registered Citizens', value: stats?.citizens || 0, icon: '👥', bg: 'var(--secondary-light)', color: 'var(--secondary)' },
          { label: 'Dept Officers', value: stats?.officers || 0, icon: '👮', bg: 'var(--accent-light)', color: 'var(--accent)' },
          { label: 'Total Complaints', value: stats?.totalComplaints || 0, icon: '📋', bg: 'var(--warning-bg)', color: 'var(--warning)' },
          { label: 'Resolved', value: stats?.resolved || 0, icon: '✅', bg: 'var(--success-bg)', color: 'var(--success)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg }}><span style={{ fontSize: '1.3rem' }}>{s.icon}</span></div>
            <div className="stat-info">
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Complaint stats */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[
          { label: 'Pending', value: dashboardData?.stats?.pending || 0, icon: '⏳', bg: 'var(--warning-bg)', color: 'var(--warning)' },
          { label: 'In Progress', value: dashboardData?.stats?.inProgress || 0, icon: '🔄', bg: 'var(--info-bg)', color: 'var(--info)' },
          { label: 'Escalated', value: dashboardData?.stats?.escalated || 0, icon: '🔺', bg: '#FCE4EC', color: '#C2185B' },
          { label: 'Resolution Rate', value: `${dashboardData?.stats?.resolutionRate || 0}%`, icon: '📈', bg: 'var(--success-bg)', color: 'var(--success)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg }}><span style={{ fontSize: '1.3rem' }}>{s.icon}</span></div>
            <div className="stat-info">
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid-2" style={{ marginBottom: 24, gap: '24px' }}>
        <div style={{ background: '#111827', borderRadius: '12px', padding: '24px', border: '1px solid #1f2937' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'white', marginBottom: '24px', fontFamily: 'Inter, sans-serif' }}>Status Breakdown</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
            <div style={{ width: '160px', height: '160px', position: 'relative' }}>
              {donutData ? (
                <Doughnut data={donutData} options={donutOptions} />
              ) : (
                <div className="skeleton" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
              )}
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { label: 'Pending', color: '#F59E0B', value: dashboardData?.stats?.pending || 0 },
                { label: 'In Progress', color: '#6366F1', value: dashboardData?.stats?.inProgress || 0 },
                { label: 'Resolved', color: '#10B981', value: dashboardData?.stats?.resolved || 0 }
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                    <span style={{ color: '#8b92a5', fontSize: '0.85rem' }}>{item.label}</span>
                  </div>
                  <span style={{ color: 'white', fontWeight: 700, fontSize: '0.9rem' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ background: '#111827', borderRadius: '12px', padding: '24px', border: '1px solid #1f2937' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'white', marginBottom: '24px', fontFamily: 'Inter, sans-serif' }}>By Category</h2>
          <div style={{ height: '160px' }}>
            {barData ? (
              <Bar data={barData} options={darkChartOptions} />
            ) : (
              <div className="skeleton" style={{ height: '100%' }} />
            )}
          </div>
        </div>
      </div>

      <div style={{ background: '#111827', borderRadius: '12px', padding: '24px', border: '1px solid #1f2937', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'white', marginBottom: '24px', fontFamily: 'Inter, sans-serif' }}>Monthly Trend</h2>
        <div style={{ height: '200px' }}>
          {lineData ? (
            <Line data={lineData} options={{ ...darkChartOptions, plugins: { ...darkChartOptions.plugins, legend: { display: false } } }} />
          ) : (
            <div className="skeleton" style={{ height: '100%' }} />
          )}
        </div>
      </div>

      {/* Quick admin actions */}
      <div className="card">
        <h2 className="card-title" style={{ marginBottom: 16 }}>⚡ Quick Actions</h2>
        <div className="grid-3">
          {[
            { to: '/admin/users', icon: '👥', label: 'Manage Users', desc: 'Add officers, manage accounts', color: 'var(--secondary)' },
            { to: '/admin/complaints', icon: '📋', label: 'All Complaints', desc: 'View and assign all complaints', color: 'var(--primary)' },
            { to: '/leaderboard', icon: '🏆', label: 'Leaderboard', desc: 'View citizen & officer rankings', color: 'var(--accent)' },
            { to: '/map', icon: '🗺️', label: 'Hotspot Map', desc: 'Identify problem areas geographically', color: '#880E4F' },
            { to: '/feed', icon: '📢', label: 'Public Feed', desc: 'Monitor public complaint activity', color: '#004D40' },
          ].map(a => (
            <Link key={a.to} to={a.to} style={{ textDecoration: 'none' }}>
              <div style={{
                border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                padding: '16px', display: 'flex', alignItems: 'center', gap: 12,
                transition: 'all 0.2s', background: 'var(--surface)', cursor: 'pointer'
              }}
                onMouseOver={e => { e.currentTarget.style.borderColor = a.color; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}
              >
                <div style={{ fontSize: '1.8rem' }}>{a.icon}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{a.label}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{a.desc}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
