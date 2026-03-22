import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';

const FEATURES = [
  { 
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>, 
    title: 'File Complaints Easily', desc: 'Report civic issues with photos, location, and description in minutes' 
  },
  { 
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>, 
    title: 'Smart NLP Classification', desc: 'AI automatically categorizes & routes your complaint to the right department' 
  },
  { 
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>, 
    title: 'Precise Location Tracking', desc: 'From State to Gram Panchayat — exact location hierarchy for faster resolution' 
  },
  { 
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>, 
    title: 'Real-time Updates', desc: 'Get notified at every step from filing to resolution' 
  },
  { 
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>, 
    title: 'Hotspot Mapping', desc: 'See where issues cluster in your area with interactive maps' 
  },
  { 
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>, 
    title: 'Gamified Civic Participation', desc: 'Earn points and badges for being an active citizen' 
  },
  { 
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>, 
    title: 'Transparent Dashboards', desc: 'Track resolution rates, SLA compliance, and department performance' 
  },
  { 
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>, 
    title: 'Duplicate Detection', desc: 'Similar complaints auto-merged to amplify your voice' 
  },
];

const STATS = [
  { value: '50+', label: 'Districts Covered' },
  { value: '12', label: 'Govt Departments' },
  { value: '7 Levels', label: 'Location Hierarchy' },
  { value: '14', label: 'Complaint Categories' },
];

export default function Landing() {
  return (
    <div>
      <Navbar />
      <div id="main-content" tabIndex="-1" style={{ marginTop: 100, outline: 'none' }}>
        {/* Hero */}
        <div className="hero">
          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* India flag colors top bar */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, marginBottom: 20 }}>
              <div style={{ width: 48, height: 6, borderRadius: 3, background: '#FF9933' }} />
              <div style={{ width: 48, height: 6, borderRadius: 3, background: '#FFFFFF' }} />
              <div style={{ width: 48, height: 6, borderRadius: 3, background: '#138808' }} />
            </div>

            <h1 className="hero-title">
              <span className="highlight">जन समाधान</span>
              <br />Smart Citizen Grievance Portal
            </h1>
            <p className="hero-subtitle">
              Report civic issues, track resolutions, and hold local government accountable.
              From Gram Panchayat to State — every complaint reaches the right authority.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/register" className="btn btn-primary btn-lg">
                Register as Citizen
              </Link>
              <Link to="/feed" className="btn" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '2px solid rgba(255,255,255,0.5)' }}>
                View Public Feed
              </Link>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{ background: 'var(--primary)', padding: '16px 24px' }}>
          <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 16 }}>
            {STATS.map(s => (
              <div key={s.label} style={{ textAlign: 'center', color: 'white' }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', fontWeight: 800 }}>{s.value}</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div style={{ padding: '60px 24px', maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontFamily: 'var(--font-heading)', fontSize: '1.8rem', fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>
            Powerful Features for Citizens & Government
          </h2>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: 40 }}>
            Bridging the gap between citizens and government departments
          </p>
          <div className="grid-4" style={{ gap: 20 }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{
                background: 'var(--surface)', borderRadius: 'var(--radius)',
                padding: 20, border: '1px solid var(--border)', boxShadow: 'var(--shadow)',
                textAlign: 'center', transition: 'all 0.2s'
              }}
                onMouseOver={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ fontSize: '2rem', marginBottom: 10 }}>{f.icon}</div>
                <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 6, color: 'var(--text-primary)' }}>{f.title}</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Location hierarchy visual */}
        <div style={{ background: 'var(--secondary)', padding: '50px 24px', color: 'white', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', marginBottom: 8 }}>
            Complaint Hierarchy Coverage
          </h2>
          <p style={{ opacity: 0.8, marginBottom: 32, fontSize: '0.9rem' }}>
            Your complaint reaches the exact authority responsible for your area
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
            {['🇮🇳 Country', '🏛️ State', '🏙️ District', '🏢 Corporation', '🏘️ Municipality', '📍 Taluka', '🗺️ Mandal', '🌾 Gram Panchayat'].map((level, i, arr) => (
              <React.Fragment key={level}>
                <div style={{
                  background: 'rgba(255,255,255,0.15)', padding: '8px 14px',
                  borderRadius: 20, fontSize: '0.85rem', fontWeight: 600,
                  border: '1px solid rgba(255,255,255,0.2)'
                }}>{level}</div>
                {i < arr.length - 1 && <span style={{ opacity: 0.5, fontSize: '1rem' }}>→</span>}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ padding: '60px 24px', textAlign: 'center', background: 'var(--primary-light)' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', fontWeight: 800, marginBottom: 8 }}>
            Ready to Make Your Voice Heard?
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
            Join thousands of active citizens making their communities better
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" className="btn btn-primary btn-lg">
              🌱 Register as Citizen
            </Link>
            <Link to="/login" className="btn btn-outline btn-lg">
              Login to Your Account
            </Link>
          </div>
        </div>

        {/* Footer */}
        <footer style={{ background: 'var(--secondary)', color: 'white', padding: '20px 24px', textAlign: 'center' }}>
          <div style={{ opacity: 0.7, fontSize: '0.85rem' }}>
            🇮🇳 JanSamadhan — जन की आवाज़, सरकार के द्वार | National Civic Grievance Portal
          </div>
        </footer>
      </div>
    </div>
  );
}
