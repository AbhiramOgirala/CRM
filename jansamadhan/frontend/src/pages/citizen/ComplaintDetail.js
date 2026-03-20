import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { complaintsAPI } from '../../services/api';
import { StatusBadge, PriorityBadge, CategoryChip, Modal } from '../../components/common';
import useAuthStore from '../../store/authStore';

export default function ComplaintDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [upvoting, setUpvoting] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateForm, setUpdateForm] = useState({ status: '', notes: '', rejection_reason: '' });

  useEffect(() => { loadDetail(); }, [id]);

  const loadDetail = async () => {
    setLoading(true);
    try {
      const res = await complaintsAPI.getById(id);
      setData(res);
    } catch (err) {
      toast.error('Complaint not found');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async () => {
    if (!user) { toast.error('Please login to upvote'); return; }
    setUpvoting(true);
    try {
      const res = await complaintsAPI.upvote(id);
      setData(prev => ({
        ...prev,
        complaint: { ...prev.complaint, upvote_count: prev.complaint.upvote_count + (res.upvoted ? 1 : -1) },
        userUpvoted: res.upvoted
      }));
    } catch {}
    setUpvoting(false);
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await complaintsAPI.addComment(id, { content: comment });
      setData(prev => ({ ...prev, comments: [...(prev.comments || []), res.comment] }));
      setComment('');
      toast.success('Comment added');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    try {
      await complaintsAPI.updateStatus(id, updateForm);
      toast.success('Status updated successfully');
      setShowUpdateModal(false);
      loadDetail();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'grid', gap: 16 }}>
        {[1,2,3].map(i => (
          <div key={i} className="card">
            <div className="skeleton" style={{ height: 20, width: '60%', marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 16, width: '90%', marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 16, width: '70%' }} />
          </div>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const { complaint, timeline, comments, linkedComplaints, userUpvoted } = data;
  const isOwner = user?.id === complaint.citizen_id;
  const isOfficer = user?.role === 'officer' || user?.role === 'admin' || user?.role === 'super_admin';

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}>
          ← Back
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <span className="ticket-badge">#{complaint.ticket_number}</span>
              <StatusBadge status={complaint.status} />
              <PriorityBadge priority={complaint.priority} />
              <CategoryChip category={complaint.category} />
            </div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800 }}>
              {complaint.title}
            </h1>
          </div>
          {isOfficer && (
            <button className="btn btn-primary" onClick={() => setShowUpdateModal(true)}>
              Update Status
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        {/* Left column */}
        <div style={{ display: 'grid', gap: 16 }}>
          {/* Description */}
          <div className="card">
            <h2 className="card-title" style={{ marginBottom: 12 }}>📄 Description</h2>
            <p style={{ lineHeight: 1.7, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{complaint.description}</p>

            {complaint.images?.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h3 style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 8, color: 'var(--text-secondary)' }}>Attached Photos</h3>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {complaint.images.map((img, i) => (
                    <img key={i} src={img} alt="" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer' }}
                      onClick={() => window.open(img, '_blank')} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Engagement */}
          <div className="card" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              className={`btn ${userUpvoted ? 'btn-primary' : 'btn-ghost'}`}
              onClick={handleUpvote}
              disabled={upvoting}
            >
              👍 {complaint.upvote_count || 0} Upvotes {!userUpvoted ? '(Click to support)' : '(Supported)'}
            </button>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              💬 {comments?.length || 0} comments
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              👁️ {complaint.view_count || 0} views
            </span>
            {complaint.duplicate_count > 0 && (
              <span style={{ background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 20, padding: '4px 12px', fontSize: '0.8rem', fontWeight: 700 }}>
                🔗 {complaint.duplicate_count} similar reports
              </span>
            )}
          </div>

          {/* Linked duplicates */}
          {linkedComplaints?.length > 0 && (
            <div className="card">
              <h2 className="card-title" style={{ marginBottom: 12 }}>🔗 Similar Reports ({linkedComplaints.length})</h2>
              {linkedComplaints.map(lc => (
                <div key={lc.id} style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 8, cursor: 'pointer', fontSize: '0.85rem' }}
                  onClick={() => navigate(`/complaint/${lc.id}`)}>
                  <span className="ticket-badge">#{lc.ticket_number}</span>
                  {' '}{lc.title}
                </div>
              ))}
            </div>
          )}

          {/* Comments */}
          <div className="card">
            <h2 className="card-title" style={{ marginBottom: 16 }}>💬 Comments & Updates</h2>

            {user && (
              <form onSubmit={handleComment} style={{ marginBottom: 20 }}>
                <textarea
                  className="form-control"
                  placeholder={isOfficer ? "Add official response or update..." : "Add a comment or ask for update..."}
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  rows={3}
                  style={{ marginBottom: 8 }}
                />
                <button type="submit" className="btn btn-primary btn-sm" disabled={submittingComment || !comment.trim()}>
                  {submittingComment ? 'Posting...' : isOfficer ? '📢 Post Official Response' : '💬 Add Comment'}
                </button>
              </form>
            )}

            {comments?.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px 0' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No comments yet</p>
              </div>
            ) : (
              comments.map(c => (
                <div key={c.id} style={{
                  padding: '12px 14px', marginBottom: 10,
                  border: c.is_official ? '1px solid #90CAF9' : '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  background: c.is_official ? 'var(--info-bg)' : 'var(--surface-2)'
                }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '0.875rem' }}>{c.users?.full_name}</strong>
                    {c.is_official && <span className="badge" style={{ background: 'var(--info-bg)', color: 'var(--info)', borderColor: '#90CAF9' }}>📢 Official</span>}
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                      {new Date(c.created_at).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{c.content}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          {/* Details */}
          <div className="card">
            <h2 className="card-title" style={{ marginBottom: 12 }}>📊 Complaint Details</h2>
            {[
              { label: 'Ticket No', value: `#${complaint.ticket_number}` },
              { label: 'Status', value: <StatusBadge status={complaint.status} /> },
              { label: 'Priority', value: <PriorityBadge priority={complaint.priority} /> },
              { label: 'Department', value: complaint.departments?.name || 'Unassigned' },
              { label: 'Filed On', value: new Date(complaint.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) },
              complaint.resolved_at && { label: 'Resolved On', value: new Date(complaint.resolved_at).toLocaleDateString('en-IN') },
              complaint.sla_deadline && { label: 'SLA Deadline', value: new Date(complaint.sla_deadline).toLocaleDateString('en-IN') },
            ].filter(Boolean).map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                <span style={{ fontWeight: 600, textAlign: 'right' }}>{item.value}</span>
              </div>
            ))}
          </div>

          {/* Location */}
          <div className="card">
            <h2 className="card-title" style={{ marginBottom: 12 }}>📍 Location</h2>
            <div style={{ fontSize: '0.85rem', display: 'grid', gap: 6 }}>
              {complaint.states && <div>🏛️ <strong>State:</strong> {complaint.states.name}</div>}
              {complaint.districts && <div>🏙️ <strong>District:</strong> {complaint.districts.name}</div>}
              {complaint.mandals && <div>🗺️ <strong>Mandal:</strong> {complaint.mandals.name}</div>}
              {complaint.address && <div>📮 <strong>Address:</strong> {complaint.address}</div>}
              {complaint.pincode && <div>📮 <strong>Pincode:</strong> {complaint.pincode}</div>}
              {complaint.latitude && complaint.longitude && (
                <a href={`https://maps.google.com/?q=${complaint.latitude},${complaint.longitude}`}
                  target="_blank" rel="noopener noreferrer"
                  className="btn btn-ghost btn-sm" style={{ marginTop: 8, width: '100%' }}>
                  🗺️ View on Google Maps
                </a>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="card">
            <h2 className="card-title" style={{ marginBottom: 16 }}>🕐 Timeline</h2>
            <div className="timeline">
              {timeline?.map(t => (
                <div key={t.id} className="timeline-item">
                  <div className="timeline-dot" />
                  <div className="timeline-time">{new Date(t.created_at).toLocaleString('en-IN')}</div>
                  <div className="timeline-content">
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 2 }}>
                      {t.action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </div>
                    {t.notes && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t.notes}</div>}
                    {t.users && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>by {t.users.full_name}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resolution notes if resolved */}
          {complaint.status === 'resolved' && complaint.resolution_notes && (
            <div className="card" style={{ background: 'var(--success-bg)', borderColor: '#A5D6A7' }}>
              <h2 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--success)', marginBottom: 8 }}>✅ Resolution Notes</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--success)', marginBottom: complaint.proof_images?.length ? 12 : 0 }}>
                {complaint.resolution_notes}
              </p>
              {complaint.proof_images?.length > 0 && (
                <>
                  <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--success)', marginBottom: 8 }}>
                    📷 Proof of Work Photos:
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {complaint.proof_images.map((img, i) => (
                      <img key={i} src={img} alt={`Proof ${i+1}`}
                        style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, border: '2px solid #A5D6A7', cursor: 'pointer' }}
                        onClick={() => window.open(img, '_blank')} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Escalation info */}
          {complaint.escalation_level > 0 && (
            <div className="card" style={{ background: '#FFF8E1', borderColor: '#FFCC02' }}>
              <h2 style={{ fontWeight: 700, fontSize: '0.9rem', color: '#E65100', marginBottom: 8 }}>🔺 Escalation Status</h2>
              <div style={{ fontSize: '0.875rem' }}>
                <div><strong>Level:</strong> {complaint.escalation_level} — {complaint.escalated_to}</div>
                {complaint.escalated_at && (
                  <div style={{ color: 'var(--text-muted)', marginTop: 4 }}>
                    Escalated on: {new Date(complaint.escalated_at).toLocaleString('en-IN')}
                  </div>
                )}
                <div style={{ marginTop: 8, fontSize: '0.8rem', color: '#5C6080' }}>
                  This complaint has been escalated to higher authorities for priority attention.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Update Status Modal */}
      <Modal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        title="Update Complaint Status"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setShowUpdateModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleStatusUpdate}>Update</button>
          </>
        }
      >
        <form onSubmit={handleStatusUpdate}>
          <div className="form-group">
            <label className="form-label">New Status <span className="required">*</span></label>
            <select className="form-control" value={updateForm.status} onChange={e => setUpdateForm(prev => ({ ...prev, status: e.target.value }))} required>
              <option value="">Select status</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved ✅</option>
              <option value="rejected">Rejected ❌</option>
              <option value="escalated">Escalated 🔺</option>
            </select>
          </div>
          {updateForm.status === 'resolved' && (
            <div className="form-group">
              <label className="form-label">Resolution Notes <span className="required">*</span></label>
              <textarea className="form-control" placeholder="Describe what was done to resolve this issue..."
                value={updateForm.notes} onChange={e => setUpdateForm(prev => ({ ...prev, notes: e.target.value }))} rows={3} required />
            </div>
          )}
          {updateForm.status === 'rejected' && (
            <div className="form-group">
              <label className="form-label">Rejection Reason <span className="required">*</span></label>
              <textarea className="form-control" placeholder="Why is this complaint being rejected?"
                value={updateForm.rejection_reason} onChange={e => setUpdateForm(prev => ({ ...prev, rejection_reason: e.target.value }))} rows={3} required />
            </div>
          )}
          {!['resolved', 'rejected'].includes(updateForm.status) && (
            <div className="form-group">
              <label className="form-label">Notes (optional)</label>
              <textarea className="form-control" placeholder="Add any notes or remarks..."
                value={updateForm.notes} onChange={e => setUpdateForm(prev => ({ ...prev, notes: e.target.value }))} rows={3} />
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
