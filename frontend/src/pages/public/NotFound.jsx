// NotFound page
import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 16, padding: 20, background: 'var(--bg)'
    }}>
      <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--text-muted)' }}>404</div>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800 }}>Page Not Found</h1>
      <p style={{ color: 'var(--text-muted)', textAlign: 'center', maxWidth: 300 }}>
        The page you are looking for does not exist or has been moved.
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <Link to="/" className="btn btn-primary">Go to Home</Link>
        <Link to="/feed" className="btn btn-outline">Public Feed</Link>
      </div>
    </div>
  );
}
