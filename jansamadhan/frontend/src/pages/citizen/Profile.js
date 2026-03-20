import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { authAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

const CITIZEN_BADGES = [
  { level: 'newcomer', icon: '🌱', label: 'Newcomer', minPts: 0 },
  { level: 'contributor', icon: '⭐', label: 'Contributor', minPts: 50 },
  { level: 'active_citizen', icon: '🏆', label: 'Active Citizen', minPts: 150 },
  { level: 'champion', icon: '🎖️', label: 'Champion', minPts: 400 },
  { level: 'civic_hero', icon: '🦸', label: 'Civic Hero', minPts: 1000 },
];

const GOVT_BADGES = [
  { level: 'new_officer', icon: '🔰', label: 'New Officer', minPts: 0 },
  { level: 'active_officer', icon: '⚙️', label: 'Active Officer', minPts: 100 },
  { level: 'efficient_officer', icon: '🌟', label: 'Efficient Officer', minPts: 300 },
  { level: 'star_officer', icon: '💫', label: 'Star Officer', minPts: 700 },
  { level: 'excellence_award', icon: '🏅', label: 'Excellence Award', minPts: 1500 },
];

export default function Profile() {
  const { user, updateUser, refreshProfile } = useAuthStore();
  const [tab, setTab] = useState('profile');
  const [profileForm, setProfileForm] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    address: user?.address || '',
    pincode: user?.pincode || '',
    preferred_language: user?.preferred_language || 'en'
  });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await authAPI.updateProfile(profileForm);
      updateUser(res.user);
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setSaving(true);
    try {
      await authAPI.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      toast.success('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const isCitizen = user?.role === 'citizen';
  const badges = isCitizen ? CITIZEN_BADGES : GOVT_BADGES;
  const currentPoints = isCitizen ? (user?.points || 0) : (user?.govt_points || 0);
  const currentBadge = isCitizen ? user?.badge_level : user?.govt_badge;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">👤 My Profile</h1>
          <p className="page-subtitle">Manage your account and view your achievements</p>
        </div>
      </div>

      {/* Profile header card */}
      <div style={{
        background: 'linear-gradient(135deg, var(--secondary), #283593)',
        borderRadius: 'var(--radius-lg)', padding: '24px 28px',
        color: 'white', marginBottom: 24, display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap'
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: '#FFD54F', color: '#1A237E',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800, flexShrink: 0
        }}>
          {user?.full_name?.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800 }}>{user?.full_name}</h2>
          <div style={{ opacity: 0.8, fontSize: '0.85rem', marginTop: 2 }}>{user?.email}</div>
          <div style={{ marginTop: 4 }}>
            <span style={{
              background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '3px 12px',
              fontSize: '0.78rem', fontWeight: 700, textTransform: 'capitalize'
            }}>
              {user?.role?.replace('_', ' ')}
            </span>
            {user?.departments?.name && (
              <span style={{ marginLeft: 8, opacity: 0.8, fontSize: '0.8rem' }}>
                🏢 {user.departments.name}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.15)', borderRadius: 'var(--radius)', padding: '10px 16px' }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', fontWeight: 800, color: '#FFD54F' }}>{currentPoints}</div>
            <div style={{ fontSize: '0.72rem', opacity: 0.8 }}>{isCitizen ? 'Civic' : 'Govt'} Points</div>
          </div>
          {!isCitizen && (
            <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.15)', borderRadius: 'var(--radius)', padding: '10px 16px' }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', fontWeight: 800, color: '#A5D6A7' }}>{user?.complaints_resolved || 0}</div>
              <div style={{ fontSize: '0.72rem', opacity: 0.8 }}>Resolved</div>
            </div>
          )}
        </div>
      </div>

      {/* Badge progression */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 className="card-title" style={{ marginBottom: 16 }}>
          {isCitizen ? '🏆 Citizen Badges' : '🏅 Officer Badges'}
        </h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {badges.map((badge) => {
            const earned = currentPoints >= badge.minPts;
            const isCurrent = badge.level === currentBadge;
            return (
              <div key={badge.level} style={{
                flex: 1, minWidth: 90, textAlign: 'center', padding: '12px 8px',
                borderRadius: 'var(--radius)',
                border: isCurrent ? '2px solid var(--primary)' : '1px solid var(--border)',
                background: isCurrent ? 'var(--primary-light)' : earned ? 'var(--surface-2)' : 'var(--bg)',
                opacity: earned ? 1 : 0.45,
                position: 'relative'
              }}>
                {isCurrent && (
                  <div style={{
                    position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)',
                    background: 'var(--primary)', color: 'white', fontSize: '0.6rem',
                    padding: '2px 8px', borderRadius: 10, fontWeight: 700, whiteSpace: 'nowrap'
                  }}>CURRENT</div>
                )}
                <div style={{ fontSize: '1.8rem', marginBottom: 4 }}>{badge.icon}</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: isCurrent ? 'var(--primary)' : 'var(--text-secondary)' }}>
                  {badge.label}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {badge.minPts} pts
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${tab === 'profile' ? 'active' : ''}`} onClick={() => setTab('profile')}>Edit Profile</button>
        <button className={`tab ${tab === 'security' ? 'active' : ''}`} onClick={() => setTab('security')}>Change Password</button>
      </div>

      {/* Profile form */}
      {tab === 'profile' && (
        <div className="card">
          <form onSubmit={handleProfileSave}>
            <div className="grid-2" style={{ gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Full Name <span className="required">*</span></label>
                <input className="form-control" value={profileForm.full_name}
                  onChange={e => setProfileForm(p => ({ ...p, full_name: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input type="tel" className="form-control" value={profileForm.phone}
                  onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Address</label>
              <textarea className="form-control" rows={2} value={profileForm.address}
                onChange={e => setProfileForm(p => ({ ...p, address: e.target.value }))}
                placeholder="Your full address" />
            </div>

            <div className="grid-2" style={{ gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Pincode</label>
                <input className="form-control" maxLength="6" value={profileForm.pincode}
                  onChange={e => setProfileForm(p => ({ ...p, pincode: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Preferred Language</label>
                <select className="form-control" value={profileForm.preferred_language}
                  onChange={e => setProfileForm(p => ({ ...p, preferred_language: e.target.value }))}>
                  <option value="en">English</option>
                  <option value="hi">हिंदी (Hindi)</option>
                  <option value="te">తెలుగు (Telugu)</option>
                  <option value="ta">தமிழ் (Tamil)</option>
                  <option value="mr">मराठी (Marathi)</option>
                  <option value="kn">ಕನ್ನಡ (Kannada)</option>
                  <option value="gu">ગુજરાતી (Gujarati)</option>
                  <option value="bn">বাংলা (Bengali)</option>
                </select>
              </div>
            </div>

            <div style={{ paddingTop: 8 }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : '💾 Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Password form */}
      {tab === 'security' && (
        <div className="card">
          <form onSubmit={handlePasswordChange}>
            <div className="form-group">
              <label className="form-label">Current Password <span className="required">*</span></label>
              <input type="password" className="form-control" value={passwordForm.currentPassword}
                onChange={e => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))}
                placeholder="Enter current password" required />
            </div>
            <div className="form-group">
              <label className="form-label">New Password <span className="required">*</span></label>
              <input type="password" className="form-control" value={passwordForm.newPassword}
                onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                placeholder="Min 6 characters" required />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password <span className="required">*</span></label>
              <input type="password" className="form-control" value={passwordForm.confirmPassword}
                onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                placeholder="Repeat new password" required />
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Changing...' : '🔐 Change Password'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
