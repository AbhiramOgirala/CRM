import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Breadcrumb component — UX4G §4.2 requirement.
 * Usage:
 *   <Breadcrumb items={[
 *     { label: 'Home', to: '/' },
 *     { label: 'My Complaints', to: '/my-complaints' },
 *     { label: 'Complaint #123' }   ← last item has no `to`, marks current
 *   ]} />
 */
export function Breadcrumb({ items }) {
  if (!items || items.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" style={{ marginBottom: 16 }}>
      <ol className="breadcrumb">
        {items.map((item, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {i > 0 && <span className="breadcrumb-sep" aria-hidden="true">/</span>}
            {item.to ? (
              <Link to={item.to} className="breadcrumb-link">{item.label}</Link>
            ) : (
              <span className="breadcrumb-current" aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default Breadcrumb;
