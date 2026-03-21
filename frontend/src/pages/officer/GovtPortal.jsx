import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { complaintsAPI, adminAPI } from '../../services/api';
import { StatusBadge, PriorityBadge, Modal } from '../../components/common';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';

const CATEGORY_ICONS = {
  roads:'🛣️', water_supply:'💧', electricity:'⚡', waste_management:'🗑️',
  drainage:'🌊', infrastructure:'🏗️', parks:'🌳', health:'🏥',
  education:'📚', public_services:'🏢', street_lights:'💡',
  law_enforcement:'👮', noise_pollution:'🔊', other:'📌'
};

const PRIORITY_COLORS = { critical:'#B71C1C', high:'#E65100', medium:'#F57F17', low:'#33691E' };

export default function GovtPortal() {
  const { user, refreshProfile } = useAuthStore();
  const navigate = useNavigate();
  const fileInputRef = useRef();

  const [activeTab, setActiveTab] = useState('my_dept');  // 'my_dept' | 'all' | 'leaderboard'
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({ status: '', category: '', priority: '', search: '', page: 1 });
  const [selected, setSelected] = useState(null);
  const [updateForm, setUpdateForm] = useState({ status: '', notes: '', rejection_reason: '' });
  const [completionImages, setCompletionImages] = useState([]);
  const [updating, setUpdating] = useState(false);
  const [leaderboard, setLeaderboard] = useState({ level: 'district', data: [] });
  const [lbLoading, setLbLoading] = useState(false);

  useEffect(() => { refreshProfile(); }, []);

  const loadComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filters, limit: 20 };
      if (activeTab === 'my_dept') {
        // Officer sees only their dept
        const res = await api.get('/complaints', { params });
        setComplaints(res.complaints || []);
        setPagination(res.pagination || {});
      } else {
        // View all (read-only)
        const res = await api.get('/complaints', { params: { ...params, dept_view: 'all' } });
        setComplaints(res.complaints || []);
        setPagination(res.pagination || {});
      }
    } catch (err) {
      toast.error('Failed to load complaints');
    } finally {
      setLoading(false);
    }
  }, [filters, activeTab]);

  useEffect(() => {
    if (activeTab !== 'leaderboard') loadComplaints();
  }, [loadComplaints, activeTab]);

  const loadLeaderboard = async (level) => {
    setLbLoading(true);
    setLeaderboard({ level, data: [] });
    try {
      const res = await api.get('/leaderboard/govt', { params: { level, month: new Date().getMonth()+1, year: new Date().getFullYear() } });
      setLeaderboard({ level, data: res.leaderboard || [] });
    } catch {}
    setLbLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'leaderboard') loadLeaderboard(leaderboard.level);
  }, [activeTab]);

  const setFilter = (k, v) => setFilters(prev => ({ ...prev, [k]: v, page: 1 }));

  const handleCompletionImageUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = e => setCompletionImages(prev => [...prev, e.target.result]);
      reader.readAsDataURL(file);
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!updateForm.status) { toast.error('Please select a status'); return; }
    if ((updateForm.status === 'resolved' || updateForm.status === 'closed') && completionImages.length === 0) {
      toast.error('Please upload at least one completion photo to close this complaint');
      return;
    }
    if ((updateForm.status === 'resolved' || updateForm.status === 'closed') && !updateForm.notes?.trim()) {
      toast.error('Please add resolution notes');
      return;
    }
    setUpdating(true);
    try {
      await complaintsAPI.updateStatus(selected.id, {
        ...updateForm,
        proof_images: completionImages
      });
      toast.success('Complaint updated successfully');
      setSelected(null);
      setUpdateForm({ status: '', notes: '', rejection_reason: '' });
      setCompletionImages([]);
      loadComplaints();
      refreshProfile();
    } catch (err) { toast.error(err.message); }
    finally { setUpdating(false); }
  };

  const isOfficer = user?.role === 'officer';
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const MEDAL = (i) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`;
  const MEDAL_COLOR = (i) => i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'var(--border)';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🏛️ Government Portal</h1>
          <p className="page-subtitle">
            {user?.department?.name || 'Department'} |
            <span style={{ color: 'var(--success)', fontWeight: 700, marginLeft: 6 }}>
              🏅 {user?.govt_points || 0} pts · {user?.complaints_resolved || 0} resolved
            </span>
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'my_dept' ? 'active' : ''}`} onClick={() => setActiveTab('my_dept')}>
          📋 My Department Queue
        </button>
        <button className={`tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
          👁️ All Complaints (View Only)
        </button>
        <button className={`tab ${activeTab === 'leaderboard' ? 'active' : ''}`} onClick={() => setActiveTab('leaderboard')}>
          🏆 Performance Leaderboard
        </button>
      </div>

      {/* ===== MY DEPT / ALL COMPLAINTS ===== */}
      {(activeTab === 'my_dept' || activeTab === 'all') && (
        <div>
          {activeTab === 'all' && (
            <div style={{ background: 'var(--info-bg)', border: '1px solid #90CAF9', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 12, fontSize: '0.82rem', color: 'var(--info)' }}>
              👁️ <strong>View-Only Mode:</strong> You can see all complaints but can only update complaints in your department ({user?.department?.name || 'your dept'}).
            </div>
          )}

          {/* Filters */}
          <div className="filter-bar">
            <input className="form-control" placeholder="🔍 Search complaints..." value={filters.search}
              onChange={e => setFilter('search', e.target.value)} style={{ flex: 2, minWidth: 180 }} />
            <select className="form-control" value={filters.status} onChange={e => setFilter('status', e.target.value)}>
              <option value="">All Statuses</option>
              {['pending','assigned','in_progress','escalated','resolved','rejected','closed'].map(s => (
                <option key={s} value={s}>{s.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
              ))}
            </select>
            <select className="form-control" value={filters.priority} onChange={e => setFilter('priority', e.target.value)}>
              <option value="">All Priorities</option>
              {['critical','high','medium','low'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
            </select>
            <select className="form-control" value={filters.category} onChange={e => setFilter('category', e.target.value)}>
              <option value="">All Categories</option>
              {Object.entries(CATEGORY_ICONS).map(([k,v]) => (
                <option key={k} value={k}>{v} {k.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
              ))}
            </select>
            <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ status:'', category:'', priority:'', search:'', page:1 })}>Clear</button>
          </div>

          {/* Stats bar */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '4px 14px', fontSize: '0.78rem', fontWeight: 600 }}>Total: {pagination.total}</span>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              <div className="loading-spinner" style={{ margin: '0 auto 12px' }} />Loading complaints...
            </div>
          ) : complaints.length === 0 ? (
            <div className="card"><div className="empty-state"><div className="empty-state-icon">🎉</div><h3 className="empty-state-title">No complaints found</h3></div></div>
          ) : (
            <div className="card" style={{ padding: 0 }}>
              <div className="table-container">
                <table>
                  <thead><tr>
                    <th>Ticket</th><th>Title & Department</th><th>Category</th>
                    <th>Priority</th><th>Status</th><th>Location</th>
                    <th>SLA</th><th>Actions</th>
                  </tr></thead>
                  <tbody>
                    {complaints.map(c => {
                      const isMyDept = user?.department_id === c.department_id;
                      const isSLABreached = c.sla_deadline && new Date(c.sla_deadline) < new Date() && !['resolved','closed','rejected'].includes(c.status);
                      return (
                        <tr key={c.id} style={{ background: isSLABreached ? '#FFF3E0' : 'transparent' }}>
                          <td>
                            <span className="ticket-badge" style={{ cursor:'pointer' }} onClick={() => navigate(`/complaint/${c.id}`)}>#{c.ticket_number}</span>
                            {isSLABreached && <div style={{ fontSize:'0.65rem', color:'var(--danger)', fontWeight:700 }}>⚠️ SLA Breached</div>}
                            {c.escalation_level > 0 && <div style={{ fontSize:'0.65rem', color:'#C2185B', fontWeight:700 }}>🔺 Escalated L{c.escalation_level}</div>}
                          </td>
                          <td style={{ maxWidth:200 }}>
                            <div style={{ fontWeight:600, fontSize:'0.85rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', cursor:'pointer', color:'var(--primary)' }} onClick={() => navigate(`/complaint/${c.id}`)}>
                              {c.title}
                            </div>
                            <div style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>
                              🏢 {c.department_name || c.department_code || 'Unassigned'}
                              {!isMyDept && <span style={{ color:'var(--warning)', marginLeft:4 }}>⚡ Other dept</span>}
                            </div>
                            {c.duplicate_count > 0 && <span style={{ fontSize:'0.68rem', background:'var(--danger-bg)', color:'var(--danger)', borderRadius:4, padding:'1px 5px' }}>🔗 {c.duplicate_count} reports</span>}
                          </td>
                          <td style={{ fontSize:'0.8rem' }}>
                            {CATEGORY_ICONS[c.category]} {c.category?.replace(/_/g,' ')}
                          </td>
                          <td><PriorityBadge priority={c.priority} /></td>
                          <td><StatusBadge status={c.status} /></td>
                          <td style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>
                            {c.district_name || c.mandal_name || c.address?.split(',')[0] || '—'}
                          </td>
                          <td style={{ fontSize:'0.75rem', whiteSpace:'nowrap' }}>
                            {c.sla_deadline ? (
                              <div style={{ color: isSLABreached ? 'var(--danger)' : 'var(--text-muted)' }}>
                                {new Date(c.sla_deadline).toLocaleDateString('en-IN')}
                                {c.sla_hours_assigned && <div style={{ fontSize:'0.65rem' }}>{c.sla_hours_assigned}h SLA</div>}
                              </div>
                            ) : '—'}
                          </td>
                          <td>
                            <div style={{ display:'flex', gap:4 }}>
                              <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/complaint/${c.id}`)}>View</button>
                              {(isMyDept || isAdmin) && !['resolved','closed','rejected'].includes(c.status) && (
                                <button className="btn btn-primary btn-sm"
                                  onClick={() => { setSelected(c); setUpdateForm({ status:'', notes:'', rejection_reason:'' }); setCompletionImages([]); }}>
                                  Update
                                </button>
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

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button className="pagination-btn" onClick={() => setFilter('page', filters.page - 1)} disabled={filters.page <= 1}>‹</button>
              <span style={{ padding:'0 12px', fontSize:'0.85rem', color:'var(--text-muted)' }}>Page {filters.page} of {pagination.totalPages}</span>
              <button className="pagination-btn" onClick={() => setFilter('page', filters.page + 1)} disabled={filters.page >= pagination.totalPages}>›</button>
            </div>
          )}
        </div>
      )}

      {/* ===== LEADERBOARD ===== */}
      {activeTab === 'leaderboard' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: '0.9rem' }}>View Rankings By Level</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { key: 'area', label: '📍 Area / Ward' },
                { key: 'mandal', label: '🗺️ Mandal' },
                { key: 'district', label: '🏙️ District' },
                { key: 'state', label: '🏛️ State' },
                { key: 'officer', label: '👮 Officer' },
              ].map(l => (
                <button key={l.key} onClick={() => loadLeaderboard(l.key)}
                  className={`btn btn-sm ${leaderboard.level === l.key ? 'btn-primary' : 'btn-ghost'}`}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--warning-bg)', border: '1px solid var(--primary-border)', borderRadius: 'var(--radius)', padding: '10px 16px', marginBottom: 12, fontSize: '0.82rem', color: 'var(--warning)' }}>
            🏆 Rankings are based on: Complaints resolved × Priority multiplier (Critical=25pts, High=20, Medium=15, Low=10) — Current month
          </div>

          {lbLoading ? (
            <div style={{ textAlign:'center', padding:40 }}><div className="loading-spinner" style={{ margin:'0 auto 12px' }} />Loading rankings...</div>
          ) : leaderboard.data.length === 0 ? (
            <div className="card"><div className="empty-state"><div className="empty-state-icon">📊</div><h3 className="empty-state-title">No data yet for this level</h3><p className="empty-state-desc">Rankings appear after complaints are resolved</p></div></div>
          ) : (
            <div>
              {leaderboard.data.map((item, i) => (
                <div key={item.id || i} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', marginBottom:8, borderLeft:`4px solid ${MEDAL_COLOR(i)}`, boxShadow:'var(--shadow)' }}>
                  <div style={{ width:36, height:36, borderRadius:'50%', background:MEDAL_COLOR(i), display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:i<3?'1rem':'0.85rem', color:i<3?'white':'var(--text-muted)', flexShrink:0 }}>
                    {MEDAL(i)}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:'0.95rem' }}>{item.entity_name}</div>
                    <div style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>
                      🏢 {item.department_name} · ✅ {item.complaints_resolved} resolved this month
                    </div>
                    {item.district_name && <div style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>📍 {item.district_name}</div>}
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontFamily:'var(--font-heading)', fontSize:'1.4rem', fontWeight:800, color:'var(--warning)' }}>{item.points_earned}</div>
                    <div style={{ fontSize:'0.68rem', color:'var(--text-muted)' }}>points</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== UPDATE MODAL with completion photo ===== */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={`Update: #${selected?.ticket_number}`}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setSelected(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleUpdate} disabled={updating}>
            {updating ? 'Updating...' : '✅ Update Status'}
          </button>
        </>}>
        {selected && (
          <div>
            <div style={{ background:'var(--surface-2)', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:'0.85rem' }}>
              <strong>{selected.title}</strong>
              <div style={{ color:'var(--text-muted)', marginTop:2, display:'flex', gap:8, flexWrap:'wrap' }}>
                Current: <StatusBadge status={selected.status} /> <PriorityBadge priority={selected.priority} />
              </div>
              {selected.dept_routing_reason && (
                <div style={{ fontSize:'0.75rem', color:'var(--info)', marginTop:4 }}>ℹ️ {selected.dept_routing_reason}</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">New Status <span className="required">*</span></label>
              <select className="form-control" value={updateForm.status} onChange={e => setUpdateForm(p => ({ ...p, status: e.target.value }))}>
                <option value="">Select status</option>
                {selected.status === 'pending' && <option value="assigned">📌 Assigned — Taking up</option>}
                {['pending','assigned'].includes(selected.status) && <option value="in_progress">🔄 In Progress — Work started</option>}
                <option value="resolved">✅ Resolved / Completed</option>
                <option value="rejected">❌ Rejected — Not valid</option>
                <option value="escalated">🔺 Escalate to Higher Authority</option>
              </select>
            </div>

            {(updateForm.status === 'resolved' || updateForm.status === 'closed') && (
              <>
                <div className="form-group">
                  <label className="form-label">Work Done / Resolution Notes <span className="required">*</span></label>
                  <textarea className="form-control" placeholder="What work was done? Be specific — e.g., 'Pothole filled with bitumen and levelled on 20 March 2026 by contractor XYZ'" value={updateForm.notes} onChange={e => setUpdateForm(p => ({ ...p, notes: e.target.value }))} rows={3} />
                </div>

                {/* COMPLETION PHOTO — MANDATORY */}
                <div className="form-group">
                  <label className="form-label">Completion Photos <span className="required">* (Required to close)</span></label>
                  <div style={{ background:'var(--warning-bg)', border:'2px dashed var(--warning)', borderRadius:'var(--radius-sm)', padding:16, textAlign:'center', cursor:'pointer', marginBottom:8 }}
                    onClick={() => fileInputRef.current?.click()}>
                    <div style={{ fontSize:'1.5rem' }}>📸</div>
                    <div style={{ fontSize:'0.82rem', color:'var(--warning)', fontWeight:700 }}>Upload photos of completed work (mandatory)</div>
                    <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginTop:2 }}>Before/after photos show accountability</div>
                  </div>
                  <input type="file" ref={fileInputRef} style={{ display:'none' }} accept="image/*" multiple onChange={handleCompletionImageUpload} />
                  {completionImages.length > 0 && (
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      {completionImages.map((img, i) => (
                        <div key={i} style={{ position:'relative' }}>
                          <img src={img} alt="" style={{ width:72, height:72, objectFit:'cover', borderRadius:8, border:'2px solid var(--success)' }} />
                          <button type="button" onClick={() => setCompletionImages(prev => prev.filter((_,j) => j !== i))}
                            style={{ position:'absolute', top:-6, right:-6, width:18, height:18, borderRadius:'50%', background:'var(--danger)', color:'white', border:'none', cursor:'pointer', fontSize:'0.6rem' }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  {completionImages.length === 0 && (
                    <div style={{ color:'var(--danger)', fontSize:'0.75rem', fontWeight:600 }}>⚠️ At least 1 photo required to resolve complaint</div>
                  )}
                </div>

                <div style={{ background:'var(--success-bg)', borderRadius:6, padding:'8px 10px', fontSize:'0.78rem', color:'var(--success)', marginBottom:8 }}>
                  🏅 You will earn {selected.priority === 'critical' ? 25 : selected.priority === 'high' ? 20 : selected.priority === 'medium' ? 15 : 10} points for resolving this {selected.priority} priority complaint!
                </div>
              </>
            )}

            {updateForm.status === 'rejected' && (
              <div className="form-group">
                <label className="form-label">Rejection Reason <span className="required">*</span></label>
                <textarea className="form-control" placeholder="Why is this complaint being rejected?" value={updateForm.rejection_reason} onChange={e => setUpdateForm(p => ({ ...p, rejection_reason: e.target.value }))} rows={3} />
              </div>
            )}

            {updateForm.status === 'in_progress' && (
              <div className="form-group">
                <label className="form-label">Update Notes</label>
                <textarea className="form-control" placeholder="What work is being done / expected completion date..." value={updateForm.notes} onChange={e => setUpdateForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
