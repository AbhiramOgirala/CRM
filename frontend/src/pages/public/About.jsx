import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';

export default function About() {
  return (
    <div>
      <Navbar />
      <div id="main-content" tabIndex="-1" style={{ marginTop: 100, outline: 'none' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" style={{ marginBottom: 24 }}>
            <ol style={{ display: 'flex', gap: 6, listStyle: 'none', fontSize: '0.82rem', color: 'var(--text-muted)', flexWrap: 'wrap', padding: 0, margin: 0 }}>
              <li><Link to="/" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Home</Link></li>
              <li><span style={{ opacity: 0.5 }}>/</span></li>
              <li><span aria-current="page">About Us</span></li>
            </ol>
          </nav>

          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800, color: 'var(--secondary)', marginBottom: 8 }}>
            About JanSamadhan
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: 32 }}>
            <span lang="hi">जन समाधान</span> — A Smart Citizen Grievance Portal by the Government of India
          </p>

          {/* About section */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 700, marginBottom: 12, color: 'var(--secondary)' }}>
              Our Mandate
            </h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '0.95rem' }}>
              JanSamadhan is the official digital grievance redressal platform of the Government of India. Our mission is to bridge the gap between citizens and government, ensuring every civic complaint is heard, tracked, and resolved transparently.
            </p>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '0.95rem', marginTop: 12 }}>
              Built on principles of transparency, accountability, and citizen empowerment, JanSamadhan uses AI-powered routing to direct complaints to the correct department, reducing resolution time and improving government accountability.
            </p>
          </div>

          {/* Owning department */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 700, marginBottom: 12, color: 'var(--secondary)' }}>
              Owning Department
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>Department of Urban Development</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                  Government of India<br />
                  Secretariat, New Delhi — 110002
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>Implemented By</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                  National Informatics Centre (NIC)<br />
                  Ministry of Electronics &amp; IT<br />
                  Government of India
                </div>
              </div>
            </div>
          </div>

          {/* Grievance officer */}
          <div className="card" style={{ marginBottom: 20, border: '2px solid var(--primary-border)', background: 'var(--primary-light)' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 700, marginBottom: 12, color: 'var(--primary)' }}>
              Designated Grievance Officer (GIGW Required)
            </h2>
            <div style={{ fontSize: '0.9rem', lineHeight: 1.8, color: 'var(--text-secondary)' }}>
              <strong>Name:</strong> Sh. Rajesh Kumar, IAS<br />
              <strong>Designation:</strong> Principal Secretary, Urban Development<br />
              <strong>Email:</strong> <a href="mailto:grievance@jansamadhan.gov.in" style={{ color: 'var(--primary)' }}>grievance@jansamadhan.gov.in</a><br />
              <strong>Phone:</strong> 011-XXXX-XXXX (Mon–Fri, 9 AM – 5 PM)
            </div>
          </div>

          {/* Contact */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 700, marginBottom: 12, color: 'var(--secondary)' }}>
              Contact Us
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
              <div>
                <strong>Helpline:</strong> 1800-XXX-XXXX (Toll Free)<br />
                <strong>Email:</strong> <a href="mailto:support@jansamadhan.gov.in" style={{ color: 'var(--primary)' }}>support@jansamadhan.gov.in</a><br />
                <strong>Hours:</strong> Mon–Sat, 9 AM – 6 PM
              </div>
              <div>
                <strong>Postal Address:</strong><br />
                JanSamadhan Help Desk<br />
                Secretariat, New Delhi<br />
                New Delhi — 110002
              </div>
            </div>
          </div>

          {/* Links */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 24 }}>
            <Link to="/privacy" className="btn btn-outline">Privacy Policy</Link>
            <Link to="/terms" className="btn btn-ghost">Terms of Use</Link>
            <Link to="/" className="btn btn-ghost">Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
