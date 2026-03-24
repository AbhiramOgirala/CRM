import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { complaintsAPI, adminAPI } from '../../services/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend);

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

  const statusData = dashboardData?.stats ? {
    labels: ['Pending', 'In Progress', 'Resolved'],
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
    labels: dashboardData.byCategory.slice(0, 8).map(c => c.category?.replace(/_/g, ' ')),
    datasets: [{
      label: 'Complaints',
      data: dashboardData.byCategory.slice(0, 8).map(c => c.count),
      backgroundColor: '#5C6BC0', // Indigo color from screenshot
      borderRadius: 4,
      barPercentage: 0.6
    }]
  } : null;

  const lineData = dashboardData?.monthlyTrends ? {
    labels: dashboardData.monthlyTrends.map(m => {
      const d = new Date(m.month + '-01');
      return d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
    }),
    datasets: [{
      label: 'Complaints Filed',
      data: dashboardData.monthlyTrends.map(m => m.count),
      borderColor: '#5C6BC0', // Indigo color
      backgroundColor: 'rgba(92, 107, 192, 0.1)',
      tension: 0.4,
      fill: true,
      pointRadius: 4,
      pointHoverRadius: 6
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
        titleFont: { size: 13 },
        bodyFont: { size: 13 },
        cornerRadius: 4,
        displayColors: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: '#E0E3EF', drawBorder: false },
        ticks: { font: { size: 11 }, color: '#666' }
      },
      x: {
        grid: { display: false, drawBorder: false },
        ticks: { font: { size: 11 }, color: '#666' }
      }
    }
  };

  const donutOptions = {
    cutout: '70%',
    plugins: {
      legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8 } }
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">System-wide overview and management</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link to="/admin/users" className="btn btn-outline btn-sm">Manage Users</Link>
          <Link to="/admin/complaints" className="btn btn-primary btn-sm">All Complaints</Link>
        </div>
      </div>

      {/* System stats */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[
          { label: 'Registered Citizens', value: stats?.citizens || 0, bg: 'var(--secondary-light)', color: 'var(--secondary)' },
          { label: 'Dept Officers', value: stats?.officers || 0, bg: 'var(--accent-light)', color: 'var(--accent)' },
          { label: 'Total Complaints', value: stats?.totalComplaints || 0, bg: 'var(--warning-bg)', color: 'var(--warning)' },
          { label: 'Resolved', value: stats?.resolved || 0, bg: 'var(--success-bg)', color: 'var(--success)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
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
          { label: 'Pending', value: dashboardData?.stats?.pending || 0, bg: 'var(--warning-bg)', color: 'var(--warning)' },
          { label: 'In Progress', value: dashboardData?.stats?.inProgress || 0, bg: 'var(--info-bg)', color: 'var(--info)' },
          { label: 'Escalated', value: dashboardData?.stats?.escalated || 0, bg: '#FCE4EC', color: '#C2185B' },
          { label: 'Resolution Rate', value: `${dashboardData?.stats?.resolutionRate || 0}%`, bg: 'var(--success-bg)', color: 'var(--success)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-info">
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid-2" style={{ marginBottom: 24, alignItems: 'stretch' }}>
        {/* Status Breakdown (Donut) */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 className="card-title" style={{ marginBottom: 16 }}>Status Breakdown</h2>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200, position: 'relative' }}>
            {statusData ? (
              <div style={{ width: '100%', height: 200 }}>
                <Doughnut data={statusData} options={{ maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8, padding: 20, font: { size: 12 } } } } }} />
                <div style={{ position: 'absolute', top: '50%', left: '35%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {dashboardData?.stats?.total || 0}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total</div>
                </div>
              </div>
            ) : (
              <div className="skeleton" style={{ width: '100%', height: 200 }} />
            )}
          </div>
        </div>

        {/* Complaints by Category (Bar) */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 className="card-title" style={{ margin: 0 }}>By Category</h2>
          </div>
          <div style={{ flex: 1, minHeight: 200 }}>
            {barData ? (
              <Bar data={barData} options={chartOptions} />
            ) : (
              <div className="skeleton" style={{ width: '100%', height: 200 }} />
            )}
          </div>
        </div>
      </div>

      {/* Monthly Trends - Full Width */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 className="card-title" style={{ marginBottom: 16 }}>Monthly Trends</h2>
        <div style={{ height: 250 }}>
          {lineData ? (
            <Line data={lineData} options={chartOptions} />
          ) : (
            <div className="skeleton" style={{ width: '100%', height: 250 }} />
          )}
        </div>
      </div>

      {/* Quick admin actions */}
      <div className="card">
        <h2 className="card-title" style={{ marginBottom: 16 }}>Quick Actions</h2>
        <div className="grid-3">
          {[
            { to: '/admin/users', label: 'Manage Users', desc: 'Add officers, manage accounts', color: 'var(--secondary)' },
            { to: '/admin/complaints', label: 'All Complaints', desc: 'View and assign all complaints', color: 'var(--primary)' },
            { to: '/leaderboard', label: 'Leaderboard', desc: 'View citizen & officer rankings', color: 'var(--accent)' },
            { to: '/map', label: 'Hotspot Map', desc: 'Identify problem areas geographically', color: '#880E4F' },
            { to: '/feed', label: 'Public Feed', desc: 'Monitor public complaint activity', color: '#004D40' },
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
