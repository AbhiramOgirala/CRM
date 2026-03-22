import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { complaintsAPI } from '../../services/api';
import { SkeletonCard, Pagination, StatusBadge, PriorityBadge, Modal } from '../../components/common';
import useAuthStore from '../../store/authStore';

const TABS = [
  { key: 'all',        label: '🌐 All Complaints',    desc: 'View (read-only for other depts)' },
  { key: 'mine',       label: '📌 My Department',      desc: 'Your dept — full control' },
  { key: 'escalated',  label: '🔺 Escalated',          desc: 'Needs urgent attention' },
];

export default function OfficerComplaints() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const isAdmin = ['admin', 'super_admin'].includes(user?.role);

  const [activeTab, setActiveTab] = useState('mine');
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({ status: '', category: '', priority: '', search: '', page: 1 });
  const [selected, setSelected] = useState(null);
  const [updateForm, setUpdateForm] = useState({ status: '', notes: '', rejection_reason: '', proof_images: [] });
  const [updating, setUpdating] = useState(false);
  const proofInputRef = useRef();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filters, limit: 15 };
      // Tab filters
      if (activeTab === 'mine' && !isAdmin) params.department_id = user?.department_id;
      if (activeTab === 'escalated') params.status = 'escalated';

      const res = await complaintsAPI.getAll(params);
      setComplaints(res.complaints || []);
      setPagination(res.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      toast.error('Failed to load complaints');
    } finally {
      setLoading(false);
    }
  }, [filters, activeTab, user?.department_id, isAdmin]);

  useEffect(() => { load(); }, [load]);

  const setFilter = (k, v) => setFilters(p => ({ ...p, [k]: v, page: 1 }));

  const openUpdate = (complaint) => {
    // Officers can only UPDATE their department's complaints
    if (user?.role === 'officer' && complaint.department_id !== user?.department_id) {
      toast.error('You can only update complaints assigned to your department');
      return;
    }
    setSelected(complaint);
    setUpdateForm({ status: '', notes: '', rejection_reason: '', proof_images: [] });
  };

  const handleProofUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + updateForm.proof_images.length > 5) { toast.error('Max 5 proof images'); return; }
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => setUpdateForm(p => ({ ...p, proof_images: [...p.proof_images, ev.target.result] }));
      reader.readAsDataURL(file);
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!updateForm.status) { toast.error('Please select a new status'); return; }
    if (updateForm.status === 'resolved' && !updateForm.notes.trim()) { toast.error('Please add resolution notes'); return; }
    if (updateForm.status === 'resolved' && updateForm.proof_images.length === 0) {
      toast.error('Please upload at least one proof-of-work photo');
      return;
    }
    if (updateForm.status === 'rejected' && !updateForm.rejection_reason.trim()) { toast.error('Please add rejection reason'); return; }

    setUpdating(true);
    try {
      await complaintsAPI.updateStatus(selected.id, updateForm);
      toast.success(`✅ Status updated to "${updateForm.status}"`);
      setSelected(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const canAct = (complaint) => {
    if (isAdmin) return true;
    return user?.role === 'officer' && complaint.department_id === user?.department_id;
  };

  const statusColor = {
    pending: '#F9A825', assigned: '#0277BD', in_progress: '#7B1FA2',
    resolved: '#2E7D32', rejected: '#C62828', escalated: '#E65100', closed: '#546E7A'
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{isAdmin ? '⚙️ All Complaints' : '📋 Complaints Portal'}</h1>
          <p className="page-subtitle">
            {isAdmin ? 'System-wide complaint management' : `${user?.departments?.name || 'Your Department'} — View all, manage your queue`}
          </p>
        </div>
        <span style={{ background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 20, padding: '6px 16px', fontWeight: 700 }}>
          {pagination.total} complaints
        </span>
      </div>

      {/* Officer Info Banner */}
      {user?.role === 'officer' && (
        <div style={{
          background: 'linear-gradient(135deg, #1B5E20, #2E7D32)',
          borderRadius: 'var(--radius)', padding: '14px 20px', marginBottom: 20,
          color: 'white', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
        }}>
          <div style={{ fontSize: '1.5rem' }}>👮</div>
          <div>
            <div style={{ fontWeight: 700 }}>{user?.full_name} — {user?.departments?.name}</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>
              You can <strong>view all complaints</strong> below. You can only <strong>update status</strong> for complaints in your department.
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 16 }}>
            <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 14px' }}>
              <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#A5D6A7' }}>{user?.complaints_resolved || 0}</div>
              <div style={{ fontSize: '0.68rem', opacity: 0.8 }}>Resolved</div>
            </div>
            <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 14px' }}>
              <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#FFD54F' }}>{user?.govt_points || 0}</div>
              <div style={{ fontSize: '0.68rem', opacity: 0.8 }}>Points</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 0 }}>
        {TABS.map(t => (
          <button key={t.key} className={`tab ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => { setActiveTab(t.key); setFilters(p => ({ ...p, status: '', page: 1 })); }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="filter-bar" style={{ borderRadius: '0 0 var(--radius) var(--radius)', marginBottom: 16 }}>
        <input className="form-control" placeholder="🔍 Search ticket, title..." value={filters.search}
          onChange={e => setFilter('search', e.target.value)} style={{ flex: 2, minWidth: 160 }} />
        {activeTab !== 'escalated' && (
          <select className="form-control" value={filters.status} onChange={e => setFilter('status', e.target.value)}>
            <option value="">All Statuses</option>
            {['pending','assigned','in_progress','escalated','resolved','rejected'].map(s => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
        )}
        <select className="form-control" value={filters.priority} onChange={e => setFilter('priority', e.target.value)}>
          <option value="">All Priorities</option>
          {['critical','high','medium','low'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="form-control" value={filters.category} onChange={e => setFilter('category', e.target.value)}>
          <option value="">All Categories</option>
          {['roads','water_supply','electricity','waste_management','drainage','infrastructure','parks','health','education','other'].map(c => (
            <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ status: '', category: '', priority: '', search: '', page: 1 })}>
          Clear
        </button>
      </div>

      {/* Complaints Table */}
      {loading ? (
        <div style={{ display: 'grid', gap: 10 }}>
          {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : complaints.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🎉</div>
            <h3 className="empty-state-title">No complaints found</h3>
            <p className="empty-state-desc">Adjust your filters or great work — queue is clear!</p>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)' }}>Ticket</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border)' }}>Issue</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)' }}>Priority</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)' }}>Department</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)' }}>SLA</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map(c => {
                  const isMyDept = c.department_id === user?.department_id;
                  const slaBreach = c.sla_deadline && new Date(c.sla_deadline) < new Date() && c.status !== 'resolved';
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border)', background: c.status === 'escalated' ? '#FFF8E1' : isMyDept ? '#F1F8E9' : 'white' }}>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 700, color: 'var(--secondary)', background: 'var(--secondary-light)', padding: '3px 8px', borderRadius: 4, display: 'inline-block', cursor: 'pointer' }}
                          onClick={() => navigate(`/complaint/${c.id}`)}>
                          #{c.ticket_number}
                        </div>
                        {c.escalation_level > 0 && (
                          <div style={{ fontSize: '0.68rem', color: '#C62828', fontWeight: 700, marginTop: 3 }}>
                            🔺 L{c.escalation_level} Escalated
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', maxWidth: 220 }}>
                        <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer', color: 'var(--primary)' }}
                          onClick={() => navigate(`/complaint/${c.id}`)}>
                          {c.title}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {c.category?.replace(/_/g, ' ')} • {c.districts?.name || c.address?.split(',')[0] || '—'}
                        </div>
                        {c.duplicate_count > 0 && (
                          <span style={{ fontSize: '0.7rem', background: '#FCE4EC', color: '#C2185B', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                            🔗 {c.duplicate_count} similar reports
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <PriorityBadge priority={c.priority} />
                      </td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <StatusBadge status={c.status} />
                      </td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                        <div style={{ fontWeight: 600 }}>{c.departments?.name || '—'}</div>
                        {isMyDept && (
                          <div style={{ fontSize: '0.68rem', color: '#2E7D32', fontWeight: 700 }}>✓ Your Dept</div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                        {c.sla_deadline ? (
                          <div style={{ color: slaBreach ? '#C62828' : 'var(--text-muted)' }}>
                            {new Date(c.sla_deadline).toLocaleDateString('en-IN')}
                            {slaBreach && <div style={{ fontSize: '0.68rem', fontWeight: 700 }}>⚠️ BREACHED</div>}
                          </div>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/complaint/${c.id}`)}>
                            View
                          </button>
                          {canAct(c) && c.status !== 'resolved' && c.status !== 'rejected' && (
                            <button className="btn btn-primary btn-sm" onClick={() => openUpdate(c)}>
                              Update
                            </button>
                          )}
                          {!canAct(c) && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', padding: '4px 8px' }}>View only</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination page={pagination.page} totalPages={pagination.totalPages}
        onPageChange={p => setFilters(prev => ({ ...prev, page: p }))} />

      {/* Update Status Modal */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)}
        title={`Update Complaint — #${selected?.ticket_number}`}
        size="lg"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setSelected(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleUpdate} disabled={updating}>
              {updating ? 'Updating...' : '✅ Update Status'}
            </button>
          </>
        }
      >
        {selected && (
          <form onSubmit={handleUpdate}>
            {/* Complaint summary */}
            <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: '0.875rem' }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{selected.title}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <StatusBadge status={selected.status} />
                <PriorityBadge priority={selected.priority} />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>#{selected.ticket_number}</span>
              </div>
            </div>

            {/* Status selection */}
            <div className="form-group">
              <label className="form-label">New Status <span className="required">*</span></label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { value: 'assigned',    icon: '📌', label: 'Assigned',    desc: 'Acknowledged and assigned' },
                  { value: 'in_progress', icon: '🔄', label: 'In Progress', desc: 'Actively working on it' },
                  { value: 'resolved',    icon: '✅', label: 'Resolved',    desc: 'Issue fixed — needs proof photo' },
                  { value: 'rejected',    icon: '❌', label: 'Rejected',    desc: 'Not valid / out of scope' },
                ].map(opt => (
                  <div key={opt.value}
                    onClick={() => setUpdateForm(p => ({ ...p, status: opt.value }))}
                    style={{
                      padding: '12px 14px', borderRadius: 8, cursor: 'pointer',
                      border: `2px solid ${updateForm.status === opt.value ? 'var(--primary)' : 'var(--border)'}`,
                      background: updateForm.status === opt.value ? 'var(--primary-light)' : 'white',
                      transition: 'all 0.15s'
                    }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 2 }}>
                      {opt.icon} {opt.label}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{opt.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resolution notes + Proof photo (REQUIRED for resolve) */}
            {updateForm.status === 'resolved' && (
              <>
                <div className="form-group">
                  <label className="form-label">Resolution Notes <span className="required">*</span></label>
                  <textarea className="form-control"
                    placeholder="Describe exactly what was done to fix this issue, when, and by whom..."
                    value={updateForm.notes}
                    onChange={e => setUpdateForm(p => ({ ...p, notes: e.target.value }))}
                    rows={4} required />
                </div>

                {/* Proof of Work Upload */}
                <div className="form-group">
                  <label className="form-label">
                    📷 Proof of Work Photos <span className="required">*</span>
                  </label>
                  <div style={{
                    border: `2px dashed ${updateForm.proof_images.length > 0 ? 'var(--success)' : '#E65100'}`,
                    borderRadius: 'var(--radius)', padding: 20, textAlign: 'center',
                    cursor: 'pointer', background: updateForm.proof_images.length > 0 ? 'var(--success-bg)' : '#FFF8E1',
                    transition: 'all 0.2s'
                  }} onClick={() => proofInputRef.current?.click()}>
                    <div style={{ fontSize: '2rem', marginBottom: 8 }}>
                      {updateForm.proof_images.length > 0 ? '✅' : '📸'}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: updateForm.proof_images.length > 0 ? 'var(--success)' : '#E65100' }}>
                      {updateForm.proof_images.length > 0
                        ? `${updateForm.proof_images.length} proof photo(s) uploaded`
                        : 'Upload before-after or work completion photos'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      Required to mark as resolved • Max 5 photos • JPG, PNG
                    </div>
                  </div>
                  <input ref={proofInputRef} type="file" style={{ display: 'none' }} accept="image/*" multiple onChange={handleProofUpload} />

                  {updateForm.proof_images.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                      {updateForm.proof_images.map((img, i) => (
                        <div key={i} style={{ position: 'relative' }}>
                          <img src={img} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '2px solid var(--success)' }} />
                          <button type="button"
                            onClick={() => setUpdateForm(p => ({ ...p, proof_images: p.proof_images.filter((_, j) => j !== i) }))}
                            style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: 'var(--danger)', color: 'white', border: '2px solid white', cursor: 'pointer', fontSize: '0.6rem', fontWeight: 800 }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ background: 'var(--success-bg)', border: '1px solid #A5D6A7', borderRadius: 8, padding: '10px 14px', fontSize: '0.82rem', color: 'var(--success)', marginBottom: 8 }}>
                  🏅 You will earn points for resolving this complaint! Priority bonus applies.
                </div>
              </>
            )}

            {/* Rejection reason */}
            {updateForm.status === 'rejected' && (
              <div className="form-group">
                <label className="form-label">Rejection Reason <span className="required">*</span></label>
                <textarea className="form-control"
                  placeholder="Why is this complaint being rejected? Be specific so the citizen understands."
                  value={updateForm.rejection_reason}
                  onChange={e => setUpdateForm(p => ({ ...p, rejection_reason: e.target.value }))}
                  rows={3} required />
              </div>
            )}

            {/* Remarks for other statuses */}
            {updateForm.status && !['resolved', 'rejected'].includes(updateForm.status) && (
              <div className="form-group">
                <label className="form-label">Remarks <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                <textarea className="form-control"
                  placeholder="Any additional notes for the citizen or for internal records..."
                  value={updateForm.notes}
                  onChange={e => setUpdateForm(p => ({ ...p, notes: e.target.value }))}
                  rows={3} />
              </div>
            )}
          </form>
        )}
      </Modal>
    </div>
  );
}
