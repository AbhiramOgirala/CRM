// Public Feed — social-style layout using FeedCard
import React, { useState, useEffect, useCallback } from 'react';
import { complaintsAPI, locationAPI } from '../../services/api';
import { SkeletonCard, Pagination } from '../../components/common';
import { FeedCard } from '../../components/common/FeedCard';
import useAuthStore from '../../store/authStore';
import { Link } from 'react-router-dom';

const CATEGORIES = ['roads','water_supply','electricity','waste_management','drainage','health','education','other'];

export function PublicFeed() {
  const { user } = useAuthStore();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({
    category: '', priority: '', state_id: '', search: '',
    sortBy: 'created_at', sortOrder: 'desc', page: 1,
  });
  const [states, setStates] = useState([]);

  useEffect(() => {
    locationAPI.getStates().then(r => setStates(r.states || []));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await complaintsAPI.getAll({ ...filters, is_public: true, limit: 10 });
      setComplaints(res.complaints || []);
      setPagination(res.pagination);
    } catch {} finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  return (
    // Outer wrapper — full width
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Public Feed</h1>
          <p className="page-subtitle">Community-reported civic issues across India</p>
        </div>
      </div>

      {/* Guest banner */}
      {!user && (
        <div style={{
          background: 'var(--accent-light)', border: '1px solid var(--accent)',
          borderRadius: 'var(--radius)', padding: '10px 16px',
          marginBottom: 16, fontSize: '0.85rem', color: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
        }}>
          <span>You are browsing as a guest — no login required to view complaints.</span>
          <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 700 }}>Register to file a complaint</Link>
        </div>
      )}

      {/* Filters */}
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <input
          className="form-control"
          placeholder="Search complaints..."
          value={filters.search}
          onChange={e => setFilters(p => ({ ...p, search: e.target.value, page: 1 }))}
          style={{ flex: 2 }}
          aria-label="Search complaints"
        />
        <select
          className="form-control"
          value={filters.state_id}
          onChange={e => setFilters(p => ({ ...p, state_id: e.target.value, page: 1 }))}
          aria-label="Filter by state"
        >
          <option value="">All States</option>
          {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select
          className="form-control"
          value={filters.category}
          onChange={e => setFilters(p => ({ ...p, category: e.target.value, page: 1 }))}
          aria-label="Filter by category"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(c => (
            <option key={c} value={c}>{c.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())}</option>
          ))}
        </select>
        <select
          className="form-control"
          value={filters.sortBy}
          onChange={e => setFilters(p => ({ ...p, sortBy: e.target.value, page: 1 }))}
          aria-label="Sort by"
        >
          <option value="created_at">Newest First</option>
          <option value="upvote_count">Most Upvoted</option>
          <option value="priority">Highest Priority</option>
        </select>
      </div>

      {/* Feed — centered single column, max 680px (Twitter-style) */}
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : complaints.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <h3 className="empty-state-title">No complaints found</h3>
              <p className="empty-state-desc">Try different filters or be the first to report an issue.</p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {complaints.map(c => <FeedCard key={c.id} complaint={c} />)}
          </div>
        )}

        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={p => setFilters(prev => ({ ...prev, page: p }))}
        />
      </div>
    </div>
  );
}

export default PublicFeed;
