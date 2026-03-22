import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

const PRIORITY_COLORS = {
  critical: { bg: '#FFCDD2', color: '#B71C1C', label: 'Critical' },
  high:     { bg: '#FFE0B2', color: '#E65100', label: 'High' },
  medium:   { bg: '#FFF9C4', color: '#F57F17', label: 'Medium' },
  low:      { bg: '#DCEDC8', color: '#33691E', label: 'Low' },
};

const STATUS_COLORS = {
  pending:     { bg: '#FFF8E1', color: '#E65100', label: 'Pending' },
  assigned:    { bg: '#E3F2FD', color: '#0277BD', label: 'Assigned' },
  in_progress: { bg: '#E8EAF6', color: '#3949AB', label: 'In Progress' },
  escalated:   { bg: '#FCE4EC', color: '#C2185B', label: 'Escalated' },
  resolved:    { bg: '#E8F5E9', color: '#2E7D32', label: 'Resolved' },
  rejected:    { bg: '#FFEBEE', color: '#C62828', label: 'Rejected' },
};

const timeAgo = (dateStr) => {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
};

// ── Desktop card — matches the reference image layout ──────────────────────
export function FeedCardDesktop({ complaint, onUpvote }) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [imgError, setImgError] = useState(false);

  const hasImage = complaint.images?.length > 0 && !imgError;
  const pri = PRIORITY_COLORS[complaint.priority] || PRIORITY_COLORS.low;
  const sta = STATUS_COLORS[complaint.status] || STATUS_COLORS.pending;
  const slaBreach = complaint.sla_deadline && complaint.status !== 'resolved' && new Date(complaint.sla_deadline) < new Date();
  const slaDate = complaint.sla_deadline ? new Date(complaint.sla_deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

  const locationTags = [
    complaint.address?.split(',')[0],
    complaint.districts?.name,
    complaint.states?.name,
  ].filter(Boolean);

  return (
    <article
      onClick={() => navigate(`/complaint/${complaint.id}`)}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow)',
        transition: 'box-shadow 200ms ease, transform 200ms ease',
      }}
      onMouseOver={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseOut={e => { e.currentTarget.style.boxShadow = 'var(--shadow)'; e.currentTarget.style.transform = 'none'; }}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && navigate(`/complaint/${complaint.id}`)}
      aria-label={`View complaint: ${complaint.title}`}
    >
      {/* Image */}
      <div style={{ width: '100%', aspectRatio: '4/3', overflow: 'hidden', background: 'var(--surface-2)', flexShrink: 0 }}>
        {hasImage ? (
          <img
            src={complaint.images[0]}
            alt=""
            loading="lazy"
            onError={() => setImgError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--secondary-light)' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--secondary)" strokeWidth="1.5" opacity="0.4">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Reporter row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            background: 'var(--secondary-light)', color: 'var(--secondary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '0.75rem',
          }}>
            {complaint.reporter_name?.[0]?.toUpperCase() || 'A'}
          </div>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              {complaint.reporter_name || 'Anonymous'}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              {timeAgo(complaint.created_at)}
            </div>
          </div>
        </div>

        {/* Badges row: ticket + status + priority */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          <span style={{ fontFamily: 'monospace', fontSize: '0.68rem', fontWeight: 700, color: 'var(--secondary)', background: 'var(--secondary-light)', padding: '2px 6px', borderRadius: 4 }}>
            #{complaint.ticket_number}
          </span>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: sta.bg, color: sta.color }}>
            {sta.label}
          </span>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: pri.bg, color: pri.color }}>
            {pri.label}
          </span>
        </div>

        {/* Title */}
        <h2 style={{
          fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)',
          lineHeight: 1.4, marginBottom: 6,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {complaint.title}
        </h2>

        {/* Description */}
        {complaint.description && (
          <p style={{
            fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 8,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {complaint.description}
          </p>
        )}

        {/* Location tags */}
        {locationTags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
            {locationTags.map((tag, i) => (
              <span key={i} style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                fontSize: '0.68rem', color: 'var(--text-secondary)',
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 4, padding: '2px 6px',
              }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Department tag */}
        {complaint.departments?.name && (
          <div style={{ marginBottom: 8 }}>
            <span style={{
              fontSize: '0.68rem', color: 'var(--secondary)',
              background: 'var(--secondary-light)', border: '1px solid var(--border-hover)',
              borderRadius: 4, padding: '2px 7px', display: 'inline-flex', alignItems: 'center', gap: 3,
            }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
              </svg>
              {complaint.departments.name}
            </span>
          </div>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Footer */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 8, borderTop: '1px solid var(--border)', flexWrap: 'nowrap' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Upvote — toggle; redirect to login if guest */}
          <button
            onClick={e => {
              e.stopPropagation();
              if (!user) { navigate('/login'); return; }
              onUpvote && onUpvote(complaint.id);
            }}
            aria-label={`${complaint._upvoted ? 'Remove upvote' : 'Upvote'}. ${complaint.upvote_count || 0} upvotes`}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: complaint._upvoted ? 'var(--primary-light)' : 'none',
              border: 'none', cursor: 'pointer',
              color: complaint._upvoted ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: 600, fontSize: '0.78rem',
              padding: '4px 8px', borderRadius: 6,
              transition: 'all 150ms ease', flexShrink: 0,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill={complaint._upvoted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/>
              <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/>
            </svg>
            <span>{complaint.upvote_count || 0}</span>
          </button>

          {/* Comments — navigates to complaint detail */}
          <button
            onClick={e => { e.stopPropagation(); navigate(`/complaint/${complaint.id}`); }}
            aria-label={`${complaint.comment_count || 0} comments — view complaint`}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.78rem',
              padding: '4px 8px', borderRadius: 6,
              transition: 'color 150ms ease', flexShrink: 0,
            }}
            onMouseOver={e => e.currentTarget.style.color = 'var(--secondary)'}
            onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            <span>{complaint.comment_count || 0}</span>
          </button>

          {slaDate && (
            <span style={{
              marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3,
              color: slaBreach ? 'var(--danger)' : 'var(--text-muted)',
              fontWeight: slaBreach ? 700 : 400, fontSize: '0.68rem', whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              {slaBreach && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2L1 21h22L12 2zm0 3.5L20.5 19h-17L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/>
                </svg>
              )}
              SLA: {slaDate}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

// ── Mobile card — compact list style ───────────────────────────────────────
export function FeedCard({ complaint, onUpvote }) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [imgError, setImgError] = useState(false);

  const hasImage = complaint.images?.length > 0 && !imgError;
  const pri = PRIORITY_COLORS[complaint.priority] || PRIORITY_COLORS.low;
  const sta = STATUS_COLORS[complaint.status] || STATUS_COLORS.pending;
  const slaBreach = complaint.sla_deadline && complaint.status !== 'resolved' && new Date(complaint.sla_deadline) < new Date();

  const locationLabel = [complaint.address?.split(',')[0], complaint.districts?.name].filter(Boolean).join(', ');

  return (
    <article
      onClick={() => navigate(`/complaint/${complaint.id}`)}
      style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', overflow: 'hidden', cursor: 'pointer',
        boxShadow: 'var(--shadow)', transition: 'box-shadow 200ms ease',
      }}
      onMouseOver={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
      onMouseOut={e => e.currentTarget.style.boxShadow = 'var(--shadow)'}
      role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && navigate(`/complaint/${complaint.id}`)}
      aria-label={`View complaint: ${complaint.title}`}
    >
      {/* Priority bar */}
      <div style={{ height: 3, background: pri.color }} aria-hidden="true" />

      {hasImage && (
        <div style={{ width: '100%', aspectRatio: '16/9', overflow: 'hidden', background: 'var(--border)' }}>
          <img src={complaint.images[0]} alt="" loading="lazy" onError={() => setImgError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
      )}

      <div style={{ padding: '12px 14px' }}>
        {/* Reporter + time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            background: 'var(--secondary-light)', color: 'var(--secondary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '0.75rem',
          }}>
            {complaint.reporter_name?.[0]?.toUpperCase() || 'A'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {complaint.reporter_name || 'Anonymous'}
            </span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: 6 }}>
              {timeAgo(complaint.created_at)}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: 10, background: sta.bg, color: sta.color }}>{sta.label}</span>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: 10, background: pri.bg, color: pri.color }}>{pri.label}</span>
          </div>
        </div>

        {/* Title */}
        <h2 style={{
          fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)',
          lineHeight: 1.4, marginBottom: 6,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {complaint.title}
        </h2>

        {/* Location + ticket */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 10, flexWrap: 'wrap' }}>
          {locationLabel && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              {locationLabel}
            </span>
          )}
          <span style={{ fontFamily: 'monospace', fontSize: '0.68rem', fontWeight: 700, color: 'var(--secondary)', background: 'var(--secondary-light)', padding: '1px 5px', borderRadius: 3 }}>
            #{complaint.ticket_number}
          </span>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}
          onClick={e => e.stopPropagation()}>
          <button
            onClick={e => {
              e.stopPropagation();
              if (!user) { navigate('/login'); return; }
              onUpvote && onUpvote(complaint.id);
            }}
            aria-label={`${complaint._upvoted ? 'Remove upvote' : 'Upvote'}. ${complaint.upvote_count || 0}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: complaint._upvoted ? 'var(--primary-light)' : 'none',
              border: 'none', cursor: 'pointer',
              color: complaint._upvoted ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: 600, fontSize: '0.75rem',
              padding: '4px 8px', borderRadius: 6,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill={complaint._upvoted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/>
              <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/>
            </svg>
            {complaint.upvote_count || 0}
          </button>
          <button
            onClick={e => { e.stopPropagation(); navigate(`/complaint/${complaint.id}`); }}
            aria-label={`${complaint.comment_count || 0} comments`}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem',
              padding: '4px 8px', borderRadius: 6,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            {complaint.comment_count || 0}
          </button>
          {slaBreach && (
            <span style={{ marginLeft: 'auto', color: 'var(--danger)', fontWeight: 700, fontSize: '0.7rem' }}>SLA Breached</span>
          )}
        </div>
      </div>
    </article>
  );
}

export default FeedCard;
