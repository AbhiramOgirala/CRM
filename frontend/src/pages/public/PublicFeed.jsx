// Public Feed — 4-col grid on desktop, single-col list on mobile
import React, { useState, useEffect, useCallback } from 'react';
import { complaintsAPI } from '../../services/api';
import { SkeletonCard, Pagination } from '../../components/common';
import { FeedCard, FeedCardDesktop } from '../../components/common/FeedCard';
import useAuthStore from '../../store/authStore';
import { Link } from 'react-router-dom';

const CATEGORIES = ['roads','water_supply','electricity','waste_management','drainage','health','education','other'];

export function PublicFeed() {
  const { user } = useAuthStore();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({
    category: '', search: '',
    sortBy: 'created_at', sortOrder: 'desc', page: 1,
  });
  const [filtersOpen, setFiltersOpen] = useState(false);

  const isCitizen = user?.role === 'citizen';
  const areaLabel = user?.district_name
    ? `${user.district_name}, ${user.state_name || ''}`
    : user?.state_name || null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await complaintsAPI.getAll({ ...filters, is_public: true, limit: 12 });
      setComplaints(res.complaints || []);
      setPagination(res.pagination);
    } catch {} finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const handleUpvote = async (id) => {
    const complaint = complaints.find(c => c.id === id);
    const wasUpvoted = !!complaint?._upvoted;
    // Optimistic toggle
    setComplaints(prev => prev.map(c =>
      c.id === id ? {
        ...c,
        upvote_count: wasUpvoted ? Math.max((c.upvote_count || 1) - 1, 0) : (c.upvote_count || 0) + 1,
        _upvoted: !wasUpvoted,
      } : c
    ));
    try {
      const res = await complaintsAPI.upvote(id);
      // Sync with server response
      setComplaints(prev => prev.map(c =>
        c.id === id ? { ...c, _upvoted: res.upvoted } : c
      ));
    } catch {
      // Revert on failure
      setComplaints(prev => prev.map(c =>
        c.id === id ? {
          ...c,
          upvote_count: wasUpvoted ? (c.upvote_count || 0) + 1 : Math.max((c.upvote_count || 1) - 1, 0),
          _upvoted: wasUpvoted,
        } : c
      ));
    }
  };

  const activeFilterCount = [filters.category, filters.search].filter(Boolean).length;

  const EmptyState = () => (
    <div className="card">
      <div className="empty-state">
        <h3 className="empty-state-title">No complaints found</h3>
        <p className="empty-state-desc">Try different filters or be the first to report an issue.</p>
      </div>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Public Grievance Feed</h1>
          <p className="page-subtitle">
            {isCitizen && areaLabel
              ? `Showing issues in ${areaLabel}`
              : 'Community-reported civic issues across India'}
          </p>
        </div>
      </div>

      {isCitizen && !areaLabel && (
        <div style={{
          background: 'var(--warning-bg)', border: '1px solid var(--warning)',
          borderRadius: 'var(--radius)', padding: '10px 16px', marginBottom: 16,
          fontSize: '0.85rem', color: 'var(--warning)',
        }}>
          Your profile doesn't have a location set. Update your profile to see local complaints.
        </div>
      )}

      {!user && (
        <div style={{
          background: 'var(--accent-light)', border: '1px solid var(--accent)',
          borderRadius: 'var(--radius)', padding: '10px 16px', marginBottom: 16,
          fontSize: '0.85rem', color: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
        }}>
          <span>Browsing as guest — no login required.</span>
          <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 700 }}>Register to file</Link>
        </div>
      )}

      {/* ── Desktop filters ── */}
      <div className="filter-bar desktop-only" style={{ marginBottom: 20 }}>
        <input
          className="form-control"
          placeholder="Search complaints..."
          value={filters.search}
          onChange={e => setFilters(p => ({ ...p, search: e.target.value, page: 1 }))}
          style={{ flex: 2 }}
          aria-label="Search complaints"
        />
        <select className="form-control" value={filters.category} onChange={e => setFilters(p => ({ ...p, category: e.target.value, page: 1 }))} aria-label="Filter by category">
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())}</option>)}
        </select>
        <select className="form-control" value={filters.sortBy} onChange={e => setFilters(p => ({ ...p, sortBy: e.target.value, page: 1 }))} aria-label="Sort by">
          <option value="created_at">Newest First</option>
          <option value="upvote_count">Most Upvoted</option>
          <option value="priority">Highest Priority</option>
        </select>
      </div>

      {/* ── Mobile filters — compact bar ── */}
      <div className="mobile-only" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            className="form-control"
            placeholder="Search..."
            value={filters.search}
            onChange={e => setFilters(p => ({ ...p, search: e.target.value, page: 1 }))}
            style={{ flex: 1, fontSize: '0.85rem', padding: '8px 12px' }}
            aria-label="Search complaints"
          />
          <button
            onClick={() => setFiltersOpen(v => !v)}
            aria-expanded={filtersOpen}
            aria-label="Toggle filters"
            style={{
              flexShrink: 0, height: 40, width: 40,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: activeFilterCount > 0 ? 'var(--primary)' : 'var(--surface)',
              border: `1px solid ${activeFilterCount > 0 ? 'var(--primary)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-sm)',
              color: activeFilterCount > 0 ? 'white' : 'var(--text-secondary)',
              cursor: 'pointer', position: 'relative',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
            </svg>
            {activeFilterCount > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                background: 'var(--danger)', color: 'white', borderRadius: '50%',
                width: 14, height: 14, fontSize: '0.55rem', fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{activeFilterCount}</span>
            )}
          </button>
        </div>
        {filtersOpen && (
          <div style={{
            marginTop: 8, padding: 12,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
          }}>
            <select className="form-control" value={filters.category} onChange={e => setFilters(p => ({ ...p, category: e.target.value, page: 1 }))} style={{ fontSize: '0.82rem', padding: '7px 10px' }} aria-label="Filter by category">
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())}</option>)}
            </select>
            <select className="form-control" value={filters.sortBy} onChange={e => setFilters(p => ({ ...p, sortBy: e.target.value, page: 1 }))} style={{ fontSize: '0.82rem', padding: '7px 10px' }} aria-label="Sort by">
              <option value="created_at">Newest First</option>
              <option value="upvote_count">Most Upvoted</option>
              <option value="priority">Highest Priority</option>
            </select>
          </div>
        )}
      </div>

      {/* ── Desktop: 4-column grid ── */}
      <div className="desktop-only">
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : complaints.length === 0 ? <EmptyState /> : (
          <div className="feed-grid-desktop" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, alignItems: 'start' }}>
            {complaints.map(c => (
              <FeedCardDesktop key={c.id} complaint={c} onUpvote={handleUpvote} />
            ))}
          </div>
        )}
        <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={p => setFilters(prev => ({ ...prev, page: p }))} />
      </div>

      {/* ── Mobile: single-column list ── */}
      <div className="mobile-only">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : complaints.length === 0 ? <EmptyState /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {complaints.map(c => (
              <FeedCard key={c.id} complaint={c} onUpvote={handleUpvote} />
            ))}
          </div>
        )}
        <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={p => setFilters(prev => ({ ...prev, page: p }))} />
      </div>
    </div>
  );
}

export default PublicFeed;
