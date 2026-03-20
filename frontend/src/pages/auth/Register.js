import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import { locationAPI } from '../../services/api';

export default function Register() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [talukas, setTalukas] = useState([]);
  const [mandals, setMandals] = useState([]);
  const [gettingGPS, setGettingGPS] = useState(false);

  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', password: '', confirm_password: '',
    state_id: '', district_id: '', taluka_id: '', mandal_id: '',
    address: '', pincode: '', preferred_language: 'en'
  });

  const { login } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    locationAPI.getStates().then(res => {
      const all = res.states || [];
      setStates(all);
      const delhi = all.find(s => s.name === 'Delhi');
      if (delhi) {
        handleStateChange(delhi.id);
      }
    });
  }, []);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleStateChange = async (id) => {
    set('state_id', id);
    set('district_id', ''); set('taluka_id', ''); set('mandal_id', '');
    if (id) {
      const res = await locationAPI.getDistricts(id);
      setDistricts(res.districts || []);
    }
  };

  const handleDistrictChange = async (id) => {
    set('district_id', id);
    set('taluka_id', ''); set('mandal_id', '');
    if (id) {
      const res = await locationAPI.getTalukas(id);
      setTalukas(res.talukas || []);
    }
  };

  const handleTalukaChange = async (id) => {
    set('taluka_id', id);
    set('mandal_id', '');
    if (id) {
      const res = await locationAPI.getMandals(id);
      setMandals(res.mandals || []);
    }
  };

  const getGPSLocation = () => {
    if (!navigator.geolocation) { toast.error('GPS not available on this device'); return; }
    setGettingGPS(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`);
          const d = await r.json();
          const addr = d.address;
          // Build address string
          const addressStr = [addr?.road, addr?.suburb, addr?.city || addr?.town || addr?.village].filter(Boolean).join(', ');
          setForm(prev => ({
            ...prev,
            address: addressStr || d.display_name || '',
            pincode: addr?.postcode || prev.pincode
          }));
          toast.success('📍 Location detected! Your address has been filled in automatically.');
        } catch {
          toast('📍 GPS captured. Please fill in the location dropdowns manually.');
        }
        setGettingGPS(false);
      },
      () => { setGettingGPS(false); toast.error('Could not get location. Please fill in manually.'); },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const validateStep1 = () => {
    if (!form.full_name.trim()) { toast.error('Full name is required'); return false; }
    if (!form.email.trim()) { toast.error('Email is required'); return false; }
    if (!form.phone.trim()) { toast.error('Phone number is required'); return false; }
    if (form.phone.length !== 10) { toast.error('Phone number must be exactly 10 digits'); return false; }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return false; }
    if (form.password !== form.confirm_password) { toast.error('Passwords do not match'); return false; }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.state_id && !form.address && !form.pincode) {
      toast.error('Please select your state or use GPS to detect your location'); return;
    }
    setLoading(true);
    try {
      const { authAPI } = await import('../../services/api');
      await authAPI.register({
        full_name: form.full_name, email: form.email,
        phone: form.phone, password: form.password,
        state_id: form.state_id || null, district_id: form.district_id || null,
        taluka_id: form.taluka_id || null, mandal_id: form.mandal_id || null,
        address: form.address, pincode: form.pincode,
        preferred_language: form.preferred_language
      });
      toast.success('Registration successful! Welcome to JanSamadhan 🎉');
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
    }}>
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 520, boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ background: 'var(--secondary)', padding: '20px 28px', color: 'white' }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, color: '#FFD54F' }}>
            🇮🇳 JanSamadhan — Citizen Registration
          </div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem', marginTop: 4 }}>
            Register to file and track civic complaints
          </div>
        </div>

        {/* Step indicator */}
        <div style={{ padding: '20px 28px 0' }}>
          <div className="steps">
            {['Personal Info', 'Location', 'Language'].map((label, i) => (
              <React.Fragment key={i}>
                <div className={`step ${step === i+1 ? 'active' : step > i+1 ? 'completed' : ''}`}>
                  <div className="step-number">{step > i+1 ? '✓' : i+1}</div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: step === i+1 ? 'var(--primary)' : 'var(--text-muted)' }}>{label}</span>
                </div>
                {i < 2 && <div className={`step-line ${step > i+1 ? 'completed' : ''}`} />}
              </React.Fragment>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '16px 28px 28px' }}>
          {/* Step 1: Personal Info */}
          {step === 1 && (
            <div>
              <div className="form-group">
                <label className="form-label">Full Name <span className="required">*</span></label>
                <input className="form-control" placeholder="As per Aadhaar / ID" value={form.full_name} onChange={e => set('full_name', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address <span className="required">*</span></label>
                <input type="email" className="form-control" placeholder="your@email.com" value={form.email} onChange={e => set('email', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Mobile Number <span className="required">*</span></label>
                <input type="tel" className="form-control" placeholder="10-digit mobile number" value={form.phone}
                  onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 10); set('phone', v); }}
                  maxLength="10" pattern="[0-9]{10}" required />
                {form.phone && form.phone.length !== 10 && (
                  <p className="form-hint" style={{ color: 'var(--danger)' }}>Must be exactly 10 digits ({form.phone.length}/10)</p>
                )}
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Password <span className="required">*</span></label>
                  <input type="password" className="form-control" placeholder="Min 6 characters" value={form.password} onChange={e => set('password', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm Password <span className="required">*</span></label>
                  <input type="password" className="form-control" placeholder="Repeat password" value={form.confirm_password} onChange={e => set('confirm_password', e.target.value)} required />
                </div>
              </div>
              <button type="button" className="btn btn-primary w-full" onClick={() => validateStep1() && setStep(2)}>
                Next: Location →
              </button>
            </div>
          )}

          {/* Step 2: Location */}
          {step === 2 && (
            <div>
              {/* GPS Button */}
              <button type="button" onClick={getGPSLocation} disabled={gettingGPS}
                style={{
                  width: '100%', marginBottom: 16, padding: '12px',
                  background: 'var(--secondary)', color: 'white', border: 'none',
                  borderRadius: 'var(--radius)', fontWeight: 700, fontSize: '0.9rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
                }}>
                {gettingGPS
                  ? <><div className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2, borderTopColor: 'white' }} /> Detecting location...</>
                  : '📍 Use My Current Location (Auto-fill Address)'
                }
              </button>
              <div style={{ textAlign: 'center', margin: '0 0 14px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                — or select manually below —
              </div>
              <div className="form-group" style={{ display: 'none' }}>
                <label className="form-label">State <span className="required">*</span></label>
                <select className="form-control" value={form.state_id} onChange={e => handleStateChange(e.target.value)}>
                  <option value="">Select your state</option>
                  {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">District</label>
                <select className="form-control" value={form.district_id} onChange={e => handleDistrictChange(e.target.value)} disabled={!form.state_id}>
                  <option value="">Select district</option>
                  {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Taluka / Block</label>
                  <select className="form-control" value={form.taluka_id} onChange={e => handleTalukaChange(e.target.value)} disabled={!form.district_id}>
                    <option value="">Select taluka</option>
                    {talukas.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Mandal</label>
                  <select className="form-control" value={form.mandal_id} onChange={e => set('mandal_id', e.target.value)} disabled={!form.taluka_id}>
                    <option value="">Select mandal</option>
                    {mandals.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Address / Locality</label>
                <input className="form-control" placeholder="House no, Street, Area" value={form.address} onChange={e => set('address', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Pincode</label>
                <input className="form-control" placeholder="6-digit pincode" maxLength="6" value={form.pincode} onChange={e => set('pincode', e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="btn btn-ghost w-full" onClick={() => setStep(1)}>← Back</button>
                <button type="button" className="btn btn-primary w-full" onClick={() => setStep(3)}>Next →</button>
              </div>
            </div>
          )}

          {/* Step 3: Language & Submit */}
          {step === 3 && (
            <div>
              <div className="form-group">
                <label className="form-label">Preferred Language</label>
                <select className="form-control" value={form.preferred_language} onChange={e => set('preferred_language', e.target.value)}>
                  <option value="en">English</option>
                  <option value="hi">हिंदी (Hindi)</option>
                  <option value="te">తెలుగు (Telugu)</option>
                  <option value="ta">தமிழ் (Tamil)</option>
                  <option value="mr">मराठी (Marathi)</option>
                  <option value="kn">ಕನ್ನಡ (Kannada)</option>
                  <option value="gu">ગુજરાતી (Gujarati)</option>
                  <option value="bn">বাংলা (Bengali)</option>
                  <option value="pa">ਪੰਜਾਬੀ (Punjabi)</option>
                </select>
                <p className="form-hint">Interface will be provided in your selected language (coming soon)</p>
              </div>

              {/* Summary */}
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px', marginBottom: 16, fontSize: '0.85rem' }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Registration Summary</div>
                <div>👤 {form.full_name}</div>
                <div>📧 {form.email}</div>
                <div>📱 {form.phone}</div>
                {form.state_id && <div>📍 {states.find(s => s.id === form.state_id)?.name}</div>}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="btn btn-ghost w-full" onClick={() => setStep(2)}>← Back</button>
                <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                  {loading ? (
                    <><div className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Registering...</>
                  ) : '✅ Register'}
                </button>
              </div>
            </div>
          )}

          <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Already registered?{' '}
            <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>Login here</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
