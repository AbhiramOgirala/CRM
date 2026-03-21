import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';

export default function PrivacyPolicy() {
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
              <li><span aria-current="page">Privacy Policy</span></li>
            </ol>
          </nav>

          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800, color: 'var(--secondary)', marginBottom: 4 }}>
            Privacy Policy
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 32 }}>
            Last updated: March 2026 | Government of India — JanSamadhan Portal
          </p>

          {[
            {
              title: '1. Information We Collect',
              content: `JanSamadhan collects information you voluntarily provide when registering, filing complaints, or using the portal. This includes your name, email address, mobile number, and complaint details including location data. We may also collect device and browser information for security and analytics purposes.`
            },
            {
              title: '2. How We Use Your Information',
              content: `Your information is used to process and route civic complaints to the appropriate government department, provide you with updates on your complaint status, improve the quality of government services, generate anonymised statistical reports, and comply with legal obligations under Indian law.`
            },
            {
              title: '3. Anonymous Complaints',
              content: `You may choose to file complaints anonymously. In this case, your name will not be displayed publicly. However, your account information is retained internally to prevent misuse and comply with audit requirements under GIGW 3.0 guidelines.`
            },
            {
              title: '4. Data Sharing',
              content: `Your complaint data is shared with the relevant government department or officer assigned to resolve your issue. We do not sell your personal data to any third party. Aggregated, anonymised data may be used for policy research and published in public reports.`
            },
            {
              title: '5. Data Retention',
              content: `Complaint data is retained for 7 years in accordance with government record-keeping requirements. Account data is retained for the duration of your registration. You may request deletion of your account by contacting our helpdesk, subject to legal retention obligations.`
            },
            {
              title: '6. Security',
              content: `JanSamadhan uses industry-standard security measures including HTTPS encryption, access control, and regular security audits. All data is stored on NIC (National Informatics Centre) infrastructure within India.`
            },
            {
              title: '7. Cookies',
              content: `We use strictly essential cookies for session management and authentication. We do not use advertising or tracking cookies. You can disable cookies in your browser settings, but this may affect the functionality of the portal.`
            },
            {
              title: '8. Your Rights',
              content: `You have the right to access, correct, or delete your personal data. To exercise these rights, contact our Grievance Officer at grievance@jansamadhan.gov.in. We will respond within 30 working days in accordance with applicable data protection law.`
            },
            {
              title: '9. Changes to This Policy',
              content: `This Privacy Policy may be updated periodically. Changes will be published on this page with the date of revision. Continued use of the portal after changes constitutes acceptance of the updated policy.`
            },
            {
              title: '10. Contact',
              content: `For privacy-related queries, contact: Designated Privacy Officer, JanSamadhan, Secretariat, New Delhi — 110002. Email: privacy@jansamadhan.gov.in`
            }
          ].map(section => (
            <div key={section.title} className="card" style={{ marginBottom: 16 }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 700, marginBottom: 10, color: 'var(--secondary)' }}>
                {section.title}
              </h2>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '0.9rem' }}>
                {section.content}
              </p>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 24 }}>
            <Link to="/about" className="btn btn-outline">About Us</Link>
            <Link to="/terms" className="btn btn-ghost">Terms of Use</Link>
            <Link to="/" className="btn btn-ghost">Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
