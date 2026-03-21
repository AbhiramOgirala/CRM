import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import { useTranslation } from 'react-i18next';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email.trim()) { toast.error('Please enter your email'); return; }
    if (!form.password) { toast.error('Please enter your password'); return; }

    setLoading(true);
    try {
      const result = await login(form.email.trim().toLowerCase(), form.password);
      toast.success('Welcome back! Login successful');
      const redirectMap = {
        citizen: '/dashboard',
        officer: '/officer/dashboard',
        admin: '/admin/dashboard',
        super_admin: '/admin/dashboard'
      };
      navigate(redirectMap[result.role] || '/dashboard', { replace: true });
    } catch (err) {
      const msg = err?.message || 'Login failed. Check your email and password.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1A237E 0%, #283593 60%, #1B5E20 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
    }}>
      <div style={{
        background: 'white', borderRadius: 16, width: '100%', maxWidth: 420,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ background: '#1A237E', padding: '28px 32px', textAlign: 'center' }}>
          {/* India flag strip */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, marginBottom: 14 }}>
            <div style={{ width: 40, height: 6, borderRadius: 3, background: '#FF9933' }} />
            <div style={{ width: 40, height: 6, borderRadius: 3, background: '#FFFFFF' }} />
            <div style={{ width: 40, height: 6, borderRadius: 3, background: '#138808' }} />
          </div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '1.8rem', fontWeight: 900, color: '#FFD54F', letterSpacing: '-1px' }}>
            {t('app_title', 'JanSamadhan')}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem', marginTop: 4 }}>
            {t('login.header_desc', 'जन समाधान — Citizen Grievance Portal')}
          </div>
        </div>

        {/* Form */}
        <div style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 4, color: '#1A1A2E' }}>
            {t('login.title', 'Login to Your Account')}
          </h2>
          <p style={{ color: '#9EA3B8', fontSize: '0.85rem', marginBottom: 24 }}>
            {t('login.subtitle', 'Citizens, Officers and Admins can login here')}
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label">{t('login.email', 'Email Address')} <span className="required">*</span></label>
              <input
                type="email"
                className="form-control"
                placeholder={t('login.email_ph', 'Enter your registered email')}
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                autoComplete="email"
                autoFocus
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('login.password', 'Password')} <span className="required">*</span></label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  className="form-control"
                  placeholder={t('login.pass_ph', 'Enter your password')}
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  autoComplete="current-password"
                  required
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem',
                    color: '#9EA3B8'
                  }}
                  tabIndex={-1}
                >
                  {showPass ? t('login.hide', 'Hide') : t('login.show', 'Show')}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full btn-lg"
              disabled={loading}
              style={{ marginTop: 8, fontSize: '1rem' }}
            >
              {loading
                ? <><div className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> {t('login.logging_in', 'Logging in...')}</>
                : t('login.btn', 'Login')
              }
            </button>
          </form>

          {/* Demo credentials hint */}
          <div style={{
            marginTop: 20, background: '#F5F6FA', borderRadius: 8, padding: '10px 14px',
            fontSize: '0.78rem', color: '#5C6080', border: '1px solid #E0E3EF'
          }}>
            <strong>{t('login.first_time', 'First time?')}</strong> {t('login.reg_desc', 'Register as a citizen to start filing complaints.')}
            <br />{t('login.admin_desc', 'Officers and Admins receive credentials from their administrator.')}
          </div>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <p style={{ fontSize: '0.875rem', color: '#9EA3B8' }}>
              {t('login.new_citizen', 'New citizen?')} {' '}
              <Link to="/register" style={{ color: '#E65100', fontWeight: 700, textDecoration: 'none' }}>
                {t('login.reg_link', 'Register here')}
              </Link>
            </p>
            <Link to="/" style={{ fontSize: '0.8rem', color: '#9EA3B8', textDecoration: 'none', marginTop: 8, display: 'inline-block' }}>
              ← {t('login.back', 'Back to Home')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
