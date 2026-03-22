import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { complaintsAPI } from '../../services/api';
import { ComplaintCard, SkeletonCard, Pagination, Modal } from '../../components/common';
import { useTranslation } from 'react-i18next';

const STATUSES = ['', 'pending', 'assigned', 'in_progress', 'resolved', 'rejected', 'escalated'];
const CATEGORIES = ['', 'roads', 'water_supply', 'electricity', 'waste_management', 'drainage', 'infrastructure', 'parks', 'health', 'education', 'public_services', 'other'];

export default function MyComplaints() {
  const { t } = useTranslation();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [deleteReasons, setDeleteReasons] = useState([]);
  const [deleteForm, setDeleteForm] = useState({ reason_code: '', reason_text: '' });
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
    } catch (err) {
      toast.error(err?.message || 'Failed to load your complaints');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    (async () => {
      try {
        const res = await complaintsAPI.getDeleteReasons();
        setDeleteReasons(res.reasons || []);
      } catch {
        setDeleteReasons([]);
      }
    })();
  }, []);

  const setFilter = (key, val) => setFilters(prev => ({ ...prev, [key]: val, page: 1 }));

  const openDeleteModal = (complaint) => {
    setSelectedComplaint(complaint);
    setDeleteForm({ reason_code: '', reason_text: '' });
    setShowDeleteModal(true);
  };

  const handleDeleteComplaint = async (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    if (!deleteForm.reason_code) {
      toast.error('Please select a deletion reason');
      return;
    }
    if (deleteForm.reason_code === 'other' && !deleteForm.reason_text.trim()) {
      toast.error('Please provide details for "Other reason"');
      return;
    }

    setDeleting(true);
    try {
      await complaintsAPI.deleteByCitizen(selectedComplaint.id, {
        reason_code: deleteForm.reason_code,
        reason_text: deleteForm.reason_text
      });
      toast.success('Complaint deleted successfully');
      setShowDeleteModal(false);
      setSelectedComplaint(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
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
          {[1, 2, 3, 4, 5].map(i => <SkeletonCard key={i} />)}
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
          {complaints.map(c => (
            <ComplaintCard
              key={c.id}
              complaint={c}
              actions={
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => openDeleteModal(c)}
                  disabled={c.status === 'closed'}
                  title={c.status === 'closed' ? 'Already deleted' : 'Delete complaint'}
                >
                  Delete
                </button>
              }
            />
          ))}
        </div>
      )}

      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        onPageChange={(p) => setFilters(prev => ({ ...prev, page: p }))}
      />

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Complaint"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setShowDeleteModal(false)} disabled={deleting}>Cancel</button>
            <button className="btn btn-danger" onClick={handleDeleteComplaint} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete Complaint'}
            </button>
          </>
        }
      >
        <form onSubmit={handleDeleteComplaint}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 12, fontSize: '0.9rem' }}>
            {selectedComplaint ? `Why are you deleting complaint #${selectedComplaint.ticket_number}?` : 'Please select a reason.'}
          </p>
          <div className="form-group">
            <label className="form-label">Reason <span className="required">*</span></label>
            <select
              className="form-control"
              value={deleteForm.reason_code}
              onChange={e => setDeleteForm(prev => ({ ...prev, reason_code: e.target.value }))}
              required
            >
              <option value="">Select reason</option>
              {deleteReasons.map(r => (
                <option key={r.code} value={r.code}>{r.label}</option>
              ))}
            </select>
          </div>
          {deleteForm.reason_code === 'other' && (
            <div className="form-group">
              <label className="form-label">Details <span className="required">*</span></label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Please share your reason"
                value={deleteForm.reason_text}
                onChange={e => setDeleteForm(prev => ({ ...prev, reason_text: e.target.value }))}
                required
              />
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
