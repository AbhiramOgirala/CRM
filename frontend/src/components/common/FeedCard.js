import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBadge, CategoryChip } from './index';

// Twitter/X-style card for the Public Feed
// Mobile: full-width, image on top, content below
// Desktop: single centered column (max 680px), same layout
export function FeedCard({ complaint }) {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);

  const hasImage = complaint.images?.length > 0 && !imgError;
  const heroImage = hasImage ? complaint.images[0] : null;

  const locationLabel = [
    complaint.address?.split(',')[0],
    complaint.districts?.name,
  ].filter(Boolean).join(', ');

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <article
      className="feed-card"
      onClick={() => navigate(`/complaint/${complaint.id}`)}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'box-shadow var(--transition), border-color var(--transition)',
        boxShadow: 'var(--shadow)',
      }}
      onMouseOver={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        e.currentTarget.style.borderColor = 'var(--border-hover)';
      }}
      onMouseOut={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow)';
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && navigate(`/complaint/${complaint.id}`)}
      aria-label={`View complaint: ${complaint.title}`}
    >
      {/* Hero image */}
      {heroImage && (
        <div style={{ width: '100%', aspectRatio: '16/9', overflow: 'hidden', background: 'var(--border)' }}>
          <img
            src={heroImage}
            alt={`Photo submitted with complaint: ${complaint.title}`}
            loading="lazy"
            onError={() => setImgError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
      )}

      {/* Priority accent bar */}
      <div style={{
        height: 3,
        background: complaint.priority === 'critical' ? 'var(--critical)'
          : complaint.priority === 'high' ? 'var(--high)'
          : complaint.priority === 'medium' ? 'var(--medium)'
          : 'var(--low)',
      }} aria-hidden="true" />

      {/* Card body */}
      <div style={{ padding: '14px 16px' }}>
        {/* Top row: category + status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <CategoryChip category={complaint.category} />
          <StatusBadge status={complaint.status} />
          {complaint.is_duplicate && (
            <span className="badge" style={{ background: '#F3E5F5', color: '#7B1FA2' }}>Duplicate</span>
          )}
        </div>

        {/* Title */}
        <h2 style={{
          fontSize: '1rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          lineHeight: 1.4,
          marginBottom: 8,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {complaint.title}
        </h2>

        {/* Description excerpt */}
        {complaint.description && (
          <p style={{
            fontSize: '0.875rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            marginBottom: 12,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {complaint.description}
          </p>
        )}

        {/* Location + time row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 12, flexWrap: 'wrap' }}>
          {locationLabel && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              {locationLabel}
            </span>
          )}
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            {timeAgo(complaint.created_at)}
          </span>
          <span className="ticket-badge" style={{ fontSize: '0.72rem', padding: '2px 7px' }}>
            #{complaint.ticket_number}
          </span>
        </div>

        {/* Footer: upvotes + comments + duplicate count */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            paddingTop: 10,
            borderTop: '1px solid var(--border)',
            fontSize: '0.82rem',
            color: 'var(--text-muted)',
          }}
          onClick={e => e.stopPropagation()}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/>
              <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/>
            </svg>
            <span aria-label={`${complaint.upvote_count || 0} upvotes`}>{complaint.upvote_count || 0}</span>
          </span>

          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            <span aria-label={`${complaint.comment_count || 0} comments`}>{complaint.comment_count || 0}</span>
          </span>

          {complaint.duplicate_count > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--danger)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
              </svg>
              <span aria-label={`${complaint.duplicate_count} similar reports`}>{complaint.duplicate_count} similar</span>
            </span>
          )}

          {complaint.sla_deadline && complaint.status !== 'resolved' && new Date(complaint.sla_deadline) < new Date() && (
            <span style={{ marginLeft: 'auto', color: 'var(--danger)', fontWeight: 700, fontSize: '0.75rem' }}>
              SLA Breached
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

export default FeedCard;
