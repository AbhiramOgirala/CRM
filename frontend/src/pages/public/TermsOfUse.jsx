import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';

export default function TermsOfUse() {
  return (
    <div>
      <Navbar />
      <div id="main-content" tabIndex="-1" style={{ marginTop: 100, outline: 'none' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>

          <nav aria-label="Breadcrumb" style={{ marginBottom: 24 }}>
            <ol style={{ display: 'flex', gap: 6, listStyle: 'none', fontSize: '0.82rem', color: 'var(--text-muted)', flexWrap: 'wrap', padding: 0, margin: 0 }}>
              <li><Link to="/" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Home</Link></li>
              <li><span style={{ opacity: 0.5 }}>/</span></li>
              <li><span aria-current="page">Terms of Use</span></li>
            </ol>
          </nav>

          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800, color: 'var(--secondary)', marginBottom: 4 }}>
            Terms of Use
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 32 }}>
            Last updated: March 2026 | Government of India — JanSamadhan Portal
          </p>

          {[
            { title: '1. Acceptance of Terms', content: 'By accessing or using JanSamadhan, you agree to be bound by these Terms of Use. If you do not agree, please do not use the portal.' },
            { title: '2. Eligibility', content: 'JanSamadhan is open to all Indian citizens. Minors below 18 years of age should use the portal only with parental supervision.' },
            { title: '3. Accurate Information', content: 'You agree to provide accurate, truthful information when filing complaints. Filing false, frivolous, or malicious complaints is a violation of these terms and may result in account suspension or legal action.' },
            { title: '4. Prohibited Conduct', content: 'You may not use JanSamadhan to harass government officials, post defamatory content, upload inappropriate images, attempt to hack or disrupt the service, or impersonate other citizens.' },
            { title: '5. Content Ownership', content: 'You retain ownership of the complaint content you post. By submitting, you grant the Government of India a non-exclusive licence to use, publish and share your complaint data for public interest purposes.' },
            { title: '6. Disclaimer', content: 'The Government of India provides JanSamadhan on an "as is" basis. We do not guarantee the resolution of any specific complaint within any particular timeframe, though we are bound by SLA guidelines.' },
            { title: '7. Governing Law', content: 'These Terms are governed by the laws of India. Disputes shall be subject to the jurisdiction of courts in New Delhi.' },
          ].map(section => (
            <div key={section.title} className="card" style={{ marginBottom: 16 }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 700, marginBottom: 10, color: 'var(--secondary)' }}>
                {section.title}
              </h2>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '0.9rem' }}>{section.content}</p>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 24 }}>
            <Link to="/privacy" className="btn btn-outline">Privacy Policy</Link>
            <Link to="/" className="btn btn-ghost back-button">Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
