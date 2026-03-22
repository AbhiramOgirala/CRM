import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';

const FEATURES = [
  { icon: '📝', title: 'File Complaints Easily', desc: 'Report civic issues with photos, location, and description in minutes' },
  { icon: '🤖', title: 'Smart NLP Classification', desc: 'AI automatically categorizes & routes your complaint to the right department' },
  { icon: '📍', title: 'Precise Location Tracking', desc: 'From State to Gram Panchayat — exact location hierarchy for faster resolution' },
  { icon: '🔔', title: 'Real-time Updates', desc: 'Get notified at every step from filing to resolution' },
  { icon: '🗺️', title: 'Hotspot Mapping', desc: 'See where issues cluster in your area with interactive maps' },
  { icon: '🏆', title: 'Gamified Civic Participation', desc: 'Earn points and badges for being an active citizen' },
  { icon: '📊', title: 'Transparent Dashboards', desc: 'Track resolution rates, SLA compliance, and department performance' },
  { icon: '🔗', title: 'Duplicate Detection', desc: 'Similar complaints auto-merged to amplify your voice' },
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
      <div style={{ marginTop: 64 }}>
        {/* Hero */}
        <div className="hero">
          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* India flag colors top bar */}
            <img
              src="/Flag_of_India.webp"
              alt="India Flag"
              style={{
                width: 60,
                height: 40,
                margin: '0 auto 24px',
                borderRadius: 6,
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                objectFit: 'cover',
                display: 'block'
              }}
            />

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
