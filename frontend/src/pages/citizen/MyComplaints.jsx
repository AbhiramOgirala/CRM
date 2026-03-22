import React, { useState, useEffect, useCallback } from 'react';
import { complaintsAPI } from '../../services/api';
import { ComplaintCard, SkeletonCard, Pagination } from '../../components/common';
import { FeedCard } from '../../components/common/FeedCard';
import { useTranslation } from 'react-i18next';

const STATUSES = ['', 'pending', 'assigned', 'in_progress', 'resolved', 'rejected', 'escalated'];
const CATEGORIES = ['', 'roads', 'water_supply', 'electricity', 'waste_management', 'drainage', 'infrastructure', 'parks', 'health', 'education', 'public_services', 'other'];

export default function MyComplaints() {
  const { t } = useTranslation();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({ status: '', category: '', search: '', page: 1 });
  const [filtersOpen, setFiltersOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await complaintsAPI.getMy({
        ...filters,
        limit: 10,
        sortBy: 'created_at',
        sortOrder: 'desc'
      });
      setComplaints(res.complaints || []);
      setPagination(res.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch {
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const setFilter = (key, val) => setFilters(prev => ({ ...prev, [key]: val, page: 1 }));
  const activeFilterCount = [filters.status, filters.category, filters.search].filter(Boolean).length;

  const handleUpvote = async (id) => {
    const complaint = complaints.find(c => c.id === id);
    const wasUpvoted = !!complaint?._upvoted;

    setComplaints(prev => prev.map(c =>
      c.id === id ? {
        ...c,
        upvote_count: wasUpvoted ? Math.max((c.upvote_count || 1) - 1, 0) : (c.upvote_count || 0) + 1,
        _upvoted: !wasUpvoted,
      } : c
    ));

    try {
      const res = await complaintsAPI.upvote(id);
      setComplaints(prev => prev.map(c =>
        c.id === id ? { ...c, _upvoted: res.upvoted } : c
      ));
    } catch {
      setComplaints(prev => prev.map(c =>
        c.id === id ? {
          ...c,
          upvote_count: wasUpvoted ? (c.upvote_count || 0) + 1 : Math.max((c.upvote_count || 1) - 1, 0),
          _upvoted: wasUpvoted,
        } : c
      ));
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('my_complaints.title', 'My Complaints')}</h1>
          <p className="page-subtitle">{t('my_complaints.subtitle', 'Track status of all your filed complaints')}</p>
        </div>
        <span style={{ background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 20, padding: '4px 12px', fontWeight: 700, fontSize: '0.85rem' }}>
          {pagination.total} {t('my_complaints.total', 'total')}
        </span>
      </div>

      {/* Desktop filters */}
      <div className="filter-bar desktop-only">
        <input
          className="form-control"
          placeholder={t('my_complaints.search', 'Search by title or ticket...')}
          value={filters.search}
          onChange={e => setFilter('search', e.target.value)}
          style={{ flex: 2 }}
        />
        <select className="form-control" value={filters.status} onChange={e => setFilter('status', e.target.value)}>
          <option value="">{t('my_complaints.all_statuses', 'All Statuses')}</option>
          {STATUSES.filter(Boolean).map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
          ))}
        </select>
        <select className="form-control" value={filters.category} onChange={e => setFilter('category', e.target.value)}>
          <option value="">{t('my_complaints.all_categories', 'All Categories')}</option>
          {CATEGORIES.filter(Boolean).map(c => (
            <option key={c} value={c}>{c.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())}</option>
          ))}
        </select>
        <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ status: '', category: '', search: '', page: 1 })}>
          {t('my_complaints.clear', 'Clear')}
        </button>
      </div>

      {/* Mobile filters — same pattern as Public Feed */}
      <div className="mobile-only" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            className="form-control"
            placeholder={t('my_complaints.search', 'Search...')}
            value={filters.search}
            onChange={e => setFilter('search', e.target.value)}
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
            <select className="form-control" value={filters.status} onChange={e => setFilter('status', e.target.value)} style={{ fontSize: '0.82rem', padding: '7px 10px' }} aria-label="Filter by status">
              <option value="">{t('my_complaints.all_statuses', 'All Statuses')}</option>
              {STATUSES.filter(Boolean).map(s => (
                <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
              ))}
            </select>
            <select className="form-control" value={filters.category} onChange={e => setFilter('category', e.target.value)} style={{ fontSize: '0.82rem', padding: '7px 10px' }} aria-label="Filter by category">
              <option value="">{t('my_complaints.all_categories', 'All Categories')}</option>
              {CATEGORIES.filter(Boolean).map(c => (
                <option key={c} value={c}>{c.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())}</option>
              ))}
            </select>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setFilters({ status: '', category: '', search: '', page: 1 })}
              style={{ gridColumn: '1 / -1' }}
            >
              {t('my_complaints.clear', 'Clear')}
            </button>
          </div>
        )}
      </div>

      {/* Desktop list */}
      <div className="desktop-only">
        {loading ? (
          <div style={{ display: 'grid', gap: 12 }}>
            {[1,2,3,4,5].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : complaints.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon" style={{ opacity: 0.5 }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
              </div>
              <h3 className="empty-state-title">{t('my_complaints.no_found', 'No complaints found')}</h3>
              <p className="empty-state-desc">
                {filters.search || filters.status || filters.category
                  ? t('my_complaints.adjust_filters', 'Try adjusting your filters')
                  : t('my_complaints.none_filed', 'You have not filed any complaints yet')}
              </p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {complaints.map(c => <ComplaintCard key={c.id} complaint={c} />)}
          </div>
        )}
      </div>

      {/* Mobile list — same UI pattern as Public Feed */}
      <div className="mobile-only">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : complaints.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon" style={{ opacity: 0.5 }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
              </div>
              <h3 className="empty-state-title">{t('my_complaints.no_found', 'No complaints found')}</h3>
              <p className="empty-state-desc">
                {filters.search || filters.status || filters.category
                  ? t('my_complaints.adjust_filters', 'Try adjusting your filters')
                  : t('my_complaints.none_filed', 'You have not filed any complaints yet')}
              </p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {complaints.map(c => <FeedCard key={c.id} complaint={c} onUpvote={handleUpvote} />)}
          </div>
        )}
      </div>

      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        onPageChange={(p) => setFilters(prev => ({ ...prev, page: p }))}
      />
    </div>
  );
}
