import React, { useState, useEffect, useCallback } from 'react';
import { complaintsAPI } from '../../services/api';
import { ComplaintCard, SkeletonCard, Pagination } from '../../components/common';
import { useTranslation } from 'react-i18next';

const STATUSES = ['', 'pending', 'assigned', 'in_progress', 'resolved', 'rejected', 'escalated'];
const CATEGORIES = ['', 'roads', 'water_supply', 'electricity', 'waste_management', 'drainage', 'infrastructure', 'parks', 'health', 'education', 'public_services', 'other'];

export default function MyComplaints() {
  const { t } = useTranslation();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({ status: '', category: '', search: '', page: 1 });

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

      {/* Filters */}
      <div className="filter-bar">
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

      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        onPageChange={(p) => setFilters(prev => ({ ...prev, page: p }))}
      />
    </div>
  );
}
