import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import toast from 'react-hot-toast';
import { complaintsAPI } from '../../services/api';
import { StatusBadge, PriorityBadge, CategoryChip, Modal } from '../../components/common';
import useAuthStore from '../../store/authStore';
import SpeakButton from '../../components/ui/SpeakButton';
import { buildComplaintReadout, buildDescriptionReadout } from '../../hooks/useTextToSpeech';
import { useLanguage } from '../../context/LanguageContext';

// Fix Leaflet default marker icon broken by webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function ComplaintDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [upvoting, setUpvoting] = useState(false);
  const [showCommentsMobile, setShowCommentsMobile] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingComplaint, setDeletingComplaint] = useState(false);
  const [deleteReasons, setDeleteReasons] = useState([]);
  const [deleteForm, setDeleteForm] = useState({ reason_code: '', reason_text: '' });
  const [updateForm, setUpdateForm] = useState({ status: '', notes: '', rejection_reason: '', proof_images: [] });
  const proofInputRef = useRef();

  const handleProofUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + updateForm.proof_images.length > 5) { toast.error('Max 5 proof images'); return; }
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => setUpdateForm(p => ({ ...p, proof_images: [...p.proof_images, ev.target.result] }));
      reader.readAsDataURL(file);
    });
    e.target.value = ''; // Allow selecting same image repeatedly or individually
  };
  const [mapCoords, setMapCoords] = useState(null);
  const { activeLang } = useLanguage();

  useEffect(() => { loadDetail(); }, [id]);
  useEffect(() => {
    if (user?.role !== 'citizen') return;
    (async () => {
      try {
        const res = await complaintsAPI.getDeleteReasons();
        setDeleteReasons(res.reasons || []);
      } catch {
        setDeleteReasons([]);
      }
    })();
  }, [user?.role]);

  const loadDetail = async () => {
    setLoading(true);
    try {
      const res = await complaintsAPI.getById(id);
      setData(res);
      const c = res.complaint;
      if (c.latitude && c.longitude) {
        setMapCoords([parseFloat(c.latitude), parseFloat(c.longitude)]);
      } else if (c.address || c.pincode) {
        // Geocode address on the fly
        const query = [c.address, c.pincode, c.districts?.name, c.states?.name].filter(Boolean).join(', ');
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`);
          const d = await r.json();
          if (d?.[0]) setMapCoords([parseFloat(d[0].lat), parseFloat(d[0].lon)]);
        } catch { }
      }
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
    } catch { }
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
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    if (!updateForm.status) { toast.error('Please select a new status'); return; }
    if (updateForm.status === 'resolved' && !updateForm.notes.trim()) { toast.error('Please add resolution notes'); return; }
    if (updateForm.status === 'resolved' && updateForm.proof_images.length === 0) {
      toast.error('Please upload at least one proof-of-work photo');
      return;
    }
    if (updateForm.status === 'rejected' && !updateForm.rejection_reason.trim()) { toast.error('Please add rejection reason'); return; }

    try {
      await complaintsAPI.updateStatus(id, updateForm);
      setShowUpdateModal(false);
      loadDetail();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteComplaint = async (e) => {
    e.preventDefault();
    if (!deleteForm.reason_code) {
      toast.error('Please select a deletion reason');
      return;
    }
    if (deleteForm.reason_code === 'other' && !deleteForm.reason_text.trim()) {
      toast.error('Please provide details for "Other reason"');
      return;
    }

    setDeletingComplaint(true);
    try {
      await complaintsAPI.deleteByCitizen(id, {
        reason_code: deleteForm.reason_code,
        reason_text: deleteForm.reason_text
      });
      toast.success('Complaint deleted successfully');
      navigate('/my-complaints');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeletingComplaint(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'grid', gap: 16 }}>
        {[1, 2, 3].map(i => (
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
  const canDeleteComplaint = isOwner && complaint.status !== 'closed';

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
            <div className="detail-title-row" style={{ marginTop: 8 }}>
              <SpeakButton
                text={buildComplaintReadout(complaint, activeLang)}
                lang={activeLang}
                variant="pill"
                label="Read complaint"
                translate={false}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {canDeleteComplaint && (
              <button
                className="btn btn-danger"
                onClick={() => {
                  setDeleteForm({ reason_code: '', reason_text: '' });
                  setShowDeleteModal(true);
                }}
              >
                Delete Complaint
              </button>
            )}
            {isOfficer && (
              <button className="btn btn-primary" onClick={() => setShowUpdateModal(true)}>
                Update Status
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 380px', 
        gap: 24
      }} className="complaint-detail-grid">
        {/* Main content - Twitter/X style */}
        <div>
          {/* Complaint card - like a tweet */}
          <div className="card complaint-main-card" style={{ 
            padding: '20px',
            borderBottom: '1px solid var(--border)',
            marginBottom: 0,
            borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0'
          }}>
            {/* Header with badges */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                <span className="ticket-badge">#{complaint.ticket_number}</span>
                <StatusBadge status={complaint.status} />
                <PriorityBadge priority={complaint.priority} />
              </div>
              
              {/* Title */}
              <h1 style={{ 
                fontFamily: 'var(--font-heading)', 
                fontSize: '1.75rem', 
                fontWeight: 800,
                lineHeight: 1.2,
                marginBottom: 8
              }}>
                {complaint.title}
              </h1>

              <div className="complaint-read-aloud">
                <SpeakButton
                  text={buildComplaintReadout(complaint, activeLang)}
                  lang={activeLang}
                  variant="pill"
                  label="🔊 Read aloud"
                  translate={false}
                />
              </div>

              {/* Meta info */}
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                {complaint.category && (
                  <>
                    Category: <CategoryChip category={complaint.category} style={{ display: 'inline-block' }} />
                  </>
                )}
              </div>
            </div>

            {/* Description */}
            <div style={{ 
              fontSize: '1rem',
              lineHeight: 1.6,
              color: 'var(--text-secondary)',
              marginBottom: 20
            }}>
              {complaint.description}
            </div>

            {/* Images gallery */}
            {complaint.images?.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                {complaint.images.length === 1 ? (
                  <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
                    <img 
                      src={complaint.images[0]} 
                      alt="Complaint" 
                      style={{ 
                        width: '100%',
                        maxHeight: 500,
                        objectFit: 'cover',
                        cursor: 'pointer'
                      }}
                      onClick={() => window.open(complaint.images[0], '_blank')}
                    />
                  </div>
                ) : (
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: complaint.images.length === 2 ? 'repeat(2, 1fr)' : 'repeat(2, 1fr)',
                    gap: 8,
                    marginBottom: 16,
                    borderRadius: 12,
                    overflow: 'hidden'
                  }}>
                    {complaint.images.map((img, i) => (
                      <div key={i} style={{ aspectRatio: '1', overflow: 'hidden' }}>
                        <img 
                          src={img} 
                          alt={`Photo ${i+1}`}
                          style={{ 
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            cursor: 'pointer'
                          }}
                          onClick={() => window.open(img, '_blank')}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Date posted */}
            <div style={{ 
              paddingBottom: 16,
              borderBottom: '1px solid var(--border)',
              fontSize: '0.875rem',
              color: 'var(--text-muted)'
            }}>
              {new Date(complaint.created_at).toLocaleString('en-IN', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>

            {/* Engagement metrics row - like Twitter stats */}
            <div className="complaint-metrics-row" style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 16,
              padding: '16px 0',
              borderBottom: '1px solid var(--border)',
              fontSize: '0.875rem'
            }}>
              <div className="complaint-metric-item" style={{ textAlign: 'center' }}>
                <div className="complaint-metric-number" style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                  {complaint.upvote_count || 0}
                </div>
                <div className="complaint-metric-label" style={{ color: 'var(--text-muted)' }}>Supports</div>
              </div>
              <div
                className="complaint-metric-item complaint-comments-toggle"
                style={{ textAlign: 'center', cursor: 'pointer' }}
                onClick={() => setShowCommentsMobile(v => !v)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowCommentsMobile(v => !v); } }}
                aria-expanded={showCommentsMobile}
                aria-controls="complaint-comments-section"
              >
                <div className="complaint-metric-number" style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                  {comments?.length || 0}
                </div>
                <div className="complaint-metric-label" style={{ color: 'var(--text-muted)' }}>
                  Comments
                </div>
              </div>
              <div className="complaint-metric-item" style={{ textAlign: 'center' }}>
                <div className="complaint-metric-number" style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                  {complaint.view_count || 0}
                </div>
                <div className="complaint-metric-label" style={{ color: 'var(--text-muted)' }}>Views</div>
              </div>
            </div>

            {/* Action buttons - like Twitter */}
            <div style={{ 
              display: 'flex',
              justifyContent: 'space-between',
              padding: '12px 0',
              gap: 12,
              borderBottom: '1px solid var(--border)'
            }}>
              <button
                className={`btn ${userUpvoted ? 'btn-primary' : 'btn-ghost'}`}
                onClick={handleUpvote}
                disabled={upvoting}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                👍 {userUpvoted ? 'Supported' : 'Support'}
              </button>
              
              {isOfficer && (
                <button 
                  className="btn btn-primary" 
                  onClick={() => setShowUpdateModal(true)}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  📝 Update Status
                </button>
              )}
            </div>

          </div>

          {/* Similar Reports */}
          {linkedComplaints?.length > 0 && (
            <div className="card" style={{ 
              padding: '20px',
              borderRadius: 0,
              borderBottom: '1px solid var(--border)',
              marginBottom: 0
            }}>
              <h2 style={{ 
                fontSize: '0.95rem',
                fontWeight: 700,
                marginBottom: 12 
              }}>
                Similar Reports ({linkedComplaints.length})
              </h2>
              {linkedComplaints.map(lc => (
                <div 
                  key={lc.id} 
                  style={{ 
                    padding: '12px',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    marginBottom: 8,
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    transition: 'background 0.2s'
                  }}
                  onClick={() => navigate(`/complaint/${lc.id}`)}
                  onMouseOver={(e) => e.target.parentElement.style.background = 'var(--surface-2)'}
                  onMouseOut={(e) => e.target.parentElement.style.background = 'transparent'}
                >
                  <span className="ticket-badge">#{lc.ticket_number}</span>
                  {' '}{lc.title}
                </div>
              ))}
            </div>
          )}

          {/* Comments section */}
          <div id="complaint-comments-section" className={`card complaint-comments-card ${showCommentsMobile ? 'open' : ''}`} style={{ 
            padding: '20px',
            borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
            marginBottom: 20
          }}>
            <h2 className="complaint-comments-title" style={{ 
              fontSize: '1rem',
              fontWeight: 700,
              marginBottom: 20 
            }}>
              Comments ({comments?.length || 0})
            </h2>

            {/* Comment form */}
            {user && (
              <form onSubmit={handleComment} style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
                <textarea
                  className="form-control"
                  placeholder={isOfficer ? "Add official response or update..." : "Add a comment or ask for update..."}
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  rows={3}
                  style={{ marginBottom: 12 }}
                />
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={submittingComment || !comment.trim()}
                  style={{ width: '100%' }}
                >
                  {submittingComment ? 'Posting...' : isOfficer ? 'Post Official Response' : 'Post Comment'}
                </button>
              </form>
            )}

            {/* Comments list */}
            {comments?.length === 0 ? (
              <div style={{ 
                padding: '40px 20px', 
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.875rem'
              }}>
                No comments yet — be the first to share your thoughts!
              </div>
            ) : (
              comments.map(c => (
                <div key={c.id} style={{
                  paddingBottom: 20,
                  marginBottom: 20,
                  borderBottom: '1px solid var(--border)',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'var(--surface-2)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', gap: 12, marginBottom: 8, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                        <strong className="complaint-comment-name" style={{ fontSize: '0.95rem' }}>{c.users?.full_name}</strong>
                        {c.is_official && (
                          <span style={{ 
                            background: 'var(--info-bg)', 
                            color: 'var(--info)', 
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}>
                            Official
                          </span>
                        )}
                        <span className="complaint-comment-time" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {new Date(c.created_at).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <p className="complaint-comment-content" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {c.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          {/* Details card */}
          <div className="card">
            <h2 style={{ 
              fontSize: '0.95rem',
              fontWeight: 700,
              marginBottom: 16 
            }}>Details</h2>
            {[
              { label: 'Status', value: <StatusBadge status={complaint.status} /> },
              { label: 'Priority', value: <PriorityBadge priority={complaint.priority} /> },
              { label: 'Department', value: complaint.departments?.name || 'Unassigned' },
              { label: 'Filed On', value: new Date(complaint.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
              complaint.resolved_at && { label: 'Resolved', value: new Date(complaint.resolved_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
              complaint.sla_deadline && { label: 'SLA Deadline', value: new Date(complaint.sla_deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
            ].filter(Boolean).map(item => (
              <div key={item.label} style={{ paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                  {item.label}
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          {/* Location card */}
          <div className="card">
            <h2 style={{ 
              fontSize: '0.95rem',
              fontWeight: 700,
              marginBottom: 12 
            }}>📍 Location</h2>
            <div style={{ fontSize: '0.85rem', display: 'grid', gap: 8 }}>
              {complaint.reporter_name && (
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 2 }}>Reported by</div>
                  <div style={{ fontWeight: 600 }}>{complaint.reporter_name}</div>
                </div>
              )}
              {complaint.states && (
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 2 }}>State</div>
                  <div style={{ fontWeight: 600 }}>{complaint.states.name}</div>
                </div>
              )}
              {complaint.districts && (
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 2 }}>District</div>
                  <div style={{ fontWeight: 600 }}>{complaint.districts.name}</div>
                </div>
              )}
              {complaint.mandals && (
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 2 }}>Mandal</div>
                  <div style={{ fontWeight: 600 }}>{complaint.mandals.name}</div>
                </div>
              )}
              {complaint.address && (
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 2 }}>Address</div>
                  <div style={{ fontWeight: 600 }}>{complaint.address}</div>
                </div>
              )}
              {complaint.pincode && (
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 2 }}>Pincode</div>
                  <div style={{ fontWeight: 600 }}>{complaint.pincode}</div>
                </div>
              )}
              {mapCoords ? (
                <div style={{ marginTop: 8 }}>
                  <MapContainer
                    center={mapCoords}
                    zoom={15}
                    style={{ height: 200, width: '100%', borderRadius: 8, zIndex: 0 }}
                    scrollWheelZoom={false}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; OpenStreetMap contributors'
                    />
                    <Marker position={mapCoords}>
                      <Popup>{complaint.title}</Popup>
                    </Marker>
                  </MapContainer>
                  <a
                    href={`https://maps.google.com/?q=${mapCoords[0]},${mapCoords[1]}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ display: 'block', textAlign: 'center', marginTop: 8, fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}
                  >
                    Open in Google Maps ↗
                  </a>
                </div>
              ) : (complaint.address || complaint.districts) ? (
                <div style={{ marginTop: 8, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 8, fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                  📍 Map unavailable
                </div>
              ) : null}
            </div>
          </div>

          {/* Timeline */}
          <div className="card">
            <h2 style={{ 
              fontSize: '0.95rem',
              fontWeight: 700,
              marginBottom: 12 
            }}>Timeline</h2>
            <div className="timeline" style={{ fontSize: '0.8rem' }}>
              {timeline?.map(t => (
                <div key={t.id} className="timeline-item">
                  <div className="timeline-dot" />
                  <div className="timeline-time">{new Date(t.created_at).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                  <div className="timeline-content">
                    <div style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: 2 }}>
                      {t.action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </div>
                    {t.notes && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t.notes}</div>}
                    {t.users && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>by {t.users.full_name}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resolution notes if resolved */}
          {complaint.status === 'resolved' && complaint.resolution_notes && (
            <div className="card" style={{ background: 'var(--success-bg)', borderColor: '#A5D6A7' }}>
              <h2 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--success)', marginBottom: 12 }}>✅ Resolution Notes</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--success)', marginBottom: complaint.proof_images?.length ? 12 : 0, lineHeight: 1.5 }}>
                {complaint.resolution_notes}
              </p>
              {complaint.proof_images?.length > 0 && (
                <>
                  <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--success)', marginBottom: 8 }}>
                    Proof of Work:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                    {complaint.proof_images.map((img, i) => (
                      <img key={i} src={img} alt={`Proof ${i+1}`}
                        style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, border: '2px solid #A5D6A7', cursor: 'pointer' }}
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
              <h2 style={{ fontWeight: 700, fontSize: '0.9rem', color: '#E65100', marginBottom: 12 }}>⚠️ Escalation Status</h2>
              <div style={{ fontSize: '0.875rem',  display: 'grid', gap: 8 }}>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 2 }}>Level</div>
                  <div style={{ fontWeight: 600 }}>Level {complaint.escalation_level} — {complaint.escalated_to}</div>
                </div>
                {complaint.escalated_at && (
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 2 }}>Escalated on</div>
                    <div style={{ fontWeight: 600 }}>
                      {new Date(complaint.escalated_at).toLocaleString('en-IN')}
                    </div>
                  </div>
                )}
                <div style={{ marginTop: 4, fontSize: '0.8rem', color: '#5C6080', lineHeight: 1.5 }}>
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
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
              <option value="escalated">Escalated</option>
            </select>
          </div>
          {updateForm.status === 'resolved' && (
            <>
              <div className="form-group">
                <label className="form-label">Resolution Notes <span className="required">*</span></label>
                <textarea className="form-control" placeholder="Describe what was done to resolve this issue..."
                  value={updateForm.notes} onChange={e => setUpdateForm(prev => ({ ...prev, notes: e.target.value }))} rows={3} required />
              </div>

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
            </>
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

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Complaint"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setShowDeleteModal(false)} disabled={deletingComplaint}>Cancel</button>
            <button className="btn btn-danger" onClick={handleDeleteComplaint} disabled={deletingComplaint}>
              {deletingComplaint ? 'Deleting...' : 'Delete Complaint'}
            </button>
          </>
        }
      >
        <form onSubmit={handleDeleteComplaint}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 12, fontSize: '0.9rem' }}>
            Please tell us why you are deleting this complaint.
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
