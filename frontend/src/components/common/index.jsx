import React from 'react';
import { useNavigate } from 'react-router-dom';
import SpeakButton from '../ui/SpeakButton';
import { buildComplaintReadout } from '../../hooks/useTextToSpeech';
import { useLanguage } from '../../context/LanguageContext';

// =============================================
// STATUS BADGE
// =============================================
export function StatusBadge({ status }) {
  const labels = {
    pending: 'Pending', assigned: 'Assigned', in_progress: 'In Progress',
    resolved: 'Resolved', rejected: 'Rejected', escalated: 'Escalated',
    closed: 'Closed', reopened: 'Reopened'
  };
  return (
    <span className={`badge badge-${status}`}>
      {labels[status] || status}
    </span>
  );
}

// =============================================
// PRIORITY BADGE
// =============================================
export function PriorityBadge({ priority }) {
  // Text-only labels, no emoji — formal government UI
  const labels = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
  return (
    <span className={`badge badge-${priority}`}>
      {labels[priority] || priority}
    </span>
  );
}

// =============================================
// CATEGORY CHIP
// =============================================
export function CategoryChip({ category }) {
  const label = category?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return (
    <span className="category-chip">
      {label}
    </span>
  );
}

// =============================================
// COMPLAINT CARD
// =============================================
export function ComplaintCard({ complaint, showCitizenInfo = false, actions }) {
  const navigate = useNavigate();
  const { activeLang } = useLanguage();

  return (
    <div
      className={`complaint-card priority-${complaint.priority}`}
      onClick={() => navigate(`/complaint/${complaint.id}`)}
    >
      <div className="complaint-card-header">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <span className="ticket-badge">#{complaint.ticket_number}</span>
            <StatusBadge status={complaint.status} />
            <PriorityBadge priority={complaint.priority} />
            {complaint.is_duplicate && (
            <span className="badge" style={{ background: '#F3E5F5', color: '#7B1FA2' }}>Duplicate</span>
          )}
          </div>
          <h3 className="complaint-title">{complaint.title}</h3>
        </div>
        <SpeakButton
          text={buildComplaintReadout(complaint, activeLang)}
          lang={activeLang}
          size="sm"
          variant="icon"
          translate={false}
        />
        {complaint.duplicate_count > 0 && (
          <div style={{
            textAlign: 'center', background: 'var(--danger-bg)',
            color: 'var(--danger)', borderRadius: 8, padding: '4px 10px', flexShrink: 0
          }}>
            <div style={{ fontSize: '1rem', fontWeight: 800 }}>{complaint.duplicate_count}</div>
            <div style={{ fontSize: '0.65rem' }}>reports</div>
          </div>
        )}
      </div>

      {/* Render image if available */}
      {complaint.images?.length > 0 && (
        <div style={{ padding: '0 16px', marginBottom: 12 }}>
          <img
            src={complaint.images[0]}
            alt={`Photo for complaint ${complaint.ticket_number}`}
            loading="lazy"
            style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
          />
        </div>
      )}

      <div className="complaint-meta">
        <CategoryChip category={complaint.category} />

        {complaint.reporter_name && (
          <span className="complaint-meta-item">
            Reported by: {complaint.reporter_name}
          </span>
        )}

        {complaint.address && (
          <span className="complaint-meta-item">
            Location: {complaint.address?.split(',').slice(0, 2).join(',')}
          </span>
        )}

        {complaint.districts && (
          <span className="complaint-meta-item">
            District: {complaint.districts.name}
          </span>
        )}

        <span className="complaint-meta-item">
          Filed: {new Date(complaint.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>

        {complaint.departments && (
          <span className="complaint-meta-item">
            Dept: {complaint.departments.name}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 10, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <span>{complaint.upvote_count || 0} upvotes</span>
        <span>{complaint.comment_count || 0} comments</span>
        {complaint.sla_deadline && (
          <span style={{ color: new Date(complaint.sla_deadline) < new Date() && complaint.status !== 'resolved' ? 'var(--danger)' : 'var(--text-muted)' }}>
            SLA: {new Date(complaint.sla_deadline).toLocaleDateString('en-IN')}
            {new Date(complaint.sla_deadline) < new Date() && complaint.status !== 'resolved' && ' [Breached]'}
          </span>
        )}
      </div>

      {actions && (
        <div className="complaint-actions" onClick={e => e.stopPropagation()}>
          {actions}
        </div>
      )}
    </div>
  );
}

// =============================================
// PAGINATION
// =============================================
export function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);

  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="pagination">
      <button
        className="pagination-btn"
        onClick={() => onPageChange(1)}
        disabled={page === 1}
      >«</button>
      <button
        className="pagination-btn"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
      >‹</button>

      {start > 1 && <span style={{ padding: '0 4px', color: 'var(--text-muted)' }}>...</span>}
      {pages.map(p => (
        <button
          key={p}
          className={`pagination-btn ${p === page ? 'active' : ''}`}
          onClick={() => onPageChange(p)}
        >{p}</button>
      ))}
      {end < totalPages && <span style={{ padding: '0 4px', color: 'var(--text-muted)' }}>...</span>}

      <button
        className="pagination-btn"
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
      >›</button>
      <button
        className="pagination-btn"
        onClick={() => onPageChange(totalPages)}
        disabled={page === totalPages}
      >»</button>
    </div>
  );
}

// =============================================
// LOCATION SELECTOR CHAIN
// =============================================
export function LocationSelector({ value, onChange, required = false }) {
  const [states, setStates] = React.useState([]);
  const [districts, setDistricts] = React.useState([]);
  const [talukas, setTalukas] = React.useState([]);
  const [mandals, setMandals] = React.useState([]);
  const [gramPanchayats, setGramPanchayats] = React.useState([]);
  const [corporations, setCorporations] = React.useState([]);
  const [municipalities, setMunicipalities] = React.useState([]);

  React.useEffect(() => {
    import('../../services/api').then(({ locationAPI }) => {
      locationAPI.getStates().then(res => {
        const all = res.states || [];
        // Only show the 5 cities we have full data for
        const supported = ['Delhi', 'Telangana', 'Maharashtra', 'West Bengal', 'Karnataka'];
        const filtered = all.filter(s => supported.includes(s.name));
        setStates(filtered);
        // Auto-select Delhi by default only if nothing chosen yet
        if (!value.state_id) {
          const delhi = filtered.find(s => s.name === 'Delhi');
          if (delhi) handleStateChange(delhi.id, filtered);
        } else {
          // Already has a state selected — load its districts
          locationAPI.getDistricts(value.state_id).then(r => setDistricts(r.districts || []));
        }
      });
    });
  }, []);

  const handleStateChange = async (stateId, stateList) => {
    const list = stateList || states;
    const stateName = list.find(s => s.id === stateId)?.name || '';
    onChange({ ...value, state_id: stateId, state_name: stateName, district_id: '', taluka_id: '', mandal_id: '', gram_panchayat_id: '' });
    if (stateId) {
      const { locationAPI } = await import('../../services/api');
      const res = await locationAPI.getDistricts(stateId);
      setDistricts(res.districts || []);
    }
  };

  const handleDistrictChange = async (districtId) => {
    onChange({ ...value, district_id: districtId, taluka_id: '', mandal_id: '', gram_panchayat_id: '' });
    if (districtId) {
      const { locationAPI } = await import('../../services/api');
      const [tRes, cRes, mRes] = await Promise.all([
        locationAPI.getTalukas(districtId),
        locationAPI.getCorporations(districtId),
        locationAPI.getMunicipalities(districtId)
      ]);
      setTalukas(tRes.talukas || []);
      setCorporations(cRes.corporations || []);
      setMunicipalities(mRes.municipalities || []);
    }
  };

  const handleTalukaChange = async (talukaId) => {
    onChange({ ...value, taluka_id: talukaId, mandal_id: '', gram_panchayat_id: '' });
    if (talukaId) {
      const { locationAPI } = await import('../../services/api');
      const res = await locationAPI.getMandals(talukaId);
      setMandals(res.mandals || []);
    }
  };

  const handleMandalChange = async (mandalId) => {
    onChange({ ...value, mandal_id: mandalId, gram_panchayat_id: '' });
    if (mandalId) {
      const { locationAPI } = await import('../../services/api');
      const res = await locationAPI.getGramPanchayats(mandalId);
      setGramPanchayats(res.gram_panchayats || []);
    }
  };

  return (
    <div>
      <div className="grid-2" style={{ gap: 12 }}>
        <div className="form-group">
          <label className="form-label">State {required && <span className="required">*</span>}</label>
          <select className="form-control" value={value.state_id || ''} onChange={e => handleStateChange(e.target.value)}>
            <option value="">Select State</option>
            {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">District {required && <span className="required">*</span>}</label>
          <select className="form-control" value={value.district_id || ''} onChange={e => handleDistrictChange(e.target.value)} disabled={!value.state_id}>
            <option value="">Select District</option>
            {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>

        {corporations.length > 0 && (
          <div className="form-group">
            <label className="form-label">Corporation</label>
            <select className="form-control" value={value.corporation_id || ''} onChange={e => onChange({ ...value, corporation_id: e.target.value })}>
              <option value="">Select Corporation</option>
              {corporations.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}

        {municipalities.length > 0 && (
          <div className="form-group">
            <label className="form-label">Municipality</label>
            <select className="form-control" value={value.municipality_id || ''} onChange={e => onChange({ ...value, municipality_id: e.target.value })}>
              <option value="">Select Municipality</option>
              {municipalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Taluka / Block</label>
          <select className="form-control" value={value.taluka_id || ''} onChange={e => handleTalukaChange(e.target.value)} disabled={!value.district_id}>
            <option value="">Select Taluka</option>
            {talukas.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Mandal / Block</label>
          <select className="form-control" value={value.mandal_id || ''} onChange={e => handleMandalChange(e.target.value)} disabled={!value.taluka_id}>
            <option value="">Select Mandal</option>
            {mandals.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>

        {gramPanchayats.length > 0 && (
          <div className="form-group">
            <label className="form-label">Gram Panchayat / Ward</label>
            <select className="form-control" value={value.gram_panchayat_id || ''} onChange={e => onChange({ ...value, gram_panchayat_id: e.target.value })} disabled={!value.mandal_id}>
              <option value="">Select Gram Panchayat</option>
              {gramPanchayats.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================
// MODAL
// =============================================
export function Modal({ isOpen, onClose, title, children, footer, size = '' }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${size === 'lg' ? 'modal-lg' : ''}`}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)' }}
          >✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// =============================================
// LOADING SKELETON
// =============================================
export function SkeletonCard() {
  return (
    <div className="complaint-card" style={{ cursor: 'default' }}>
      <div className="skeleton" style={{ height: 16, width: '60%', marginBottom: 12 }} />
      <div className="skeleton" style={{ height: 20, width: '90%', marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 14, width: '40%' }} />
    </div>
  );
}
