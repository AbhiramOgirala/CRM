import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { complaintsAPI, nlpAPI, locationAPI } from '../../services/api';
import { LocationSelector } from '../../components/common';
import SpeakButton from '../../components/ui/SpeakButton';
import { buildFieldPrompt, buildDescriptionReadout, buildClassificationReadout } from '../../hooks/useTextToSpeech';
import { useLanguage } from '../../context/LanguageContext';
import { useTranslation } from 'react-i18next';

import { openDB } from 'idb';

const LANG_CODES = {
  en: 'en-IN', hi: 'hi-IN', te: 'te-IN', ta: 'ta-IN',
  mr: 'mr-IN', kn: 'kn-IN', gu: 'gu-IN', bn: 'bn-IN', pa: 'pa-IN'
};
const LANG_LABELS = {
  en: 'English', hi: 'हिंदी', te: 'తెలుగు', ta: 'தமிழ்',
  mr: 'मराठी', kn: 'ಕನ್ನಡ', gu: 'ગુજરાતી', bn: 'বাংলা', pa: 'ਪੰਜਾਬੀ'
};

const DEPT_COLORS = {
  PWD: '#E65100', HMWSSB: '#0277BD', TGSPDCL: '#F9A825',
  SSWM: '#558B2F', PRD: '#2E7D32', HFW: '#C62828',
  EDU: '#283593', POL: '#37474F', GHMC: '#6A1B9A',
  REV: '#BF360C', RTA: '#00695C'
};

export default function FileComplaint() {
  const navigate = useNavigate();
  const fileInputRef = useRef();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [gettingGPS, setGettingGPS] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [nlpResult, setNlpResult] = useState(null);
  const [nlpLoading, setNlpLoading] = useState(false);
  const [imageAnalysisResult, setImageAnalysisResult] = useState(null);
  const [imageAnalysisLoading, setImageAnalysisLoading] = useState(false);
  const nlpTimer = useRef(null);
  const [selectedLang, setSelectedLangLocal] = useState('en');
  const { setActiveLang } = useLanguage();
  const { t } = useTranslation();

  const setSelectedLang = (code) => {
    setSelectedLangLocal(code);
    setActiveLang(LANG_CODES[code] || 'en-IN');
  };

  const DEFAULT_FORM = {
    title: '', description: '', audio_transcript: '',
    latitude: '', longitude: '', address: '', landmark: '', pincode: '',
    state_id: '', district_id: '', corporation_id: '', municipality_id: '',
    taluka_id: '', mandal_id: '', gram_panchayat_id: '',
    is_public: true, is_anonymous: false, images: []
  };

  // Restore draft or start fresh
  const [form, setForm] = useState(() => {
    try {
      const saved = localStorage.getItem('complaint_draft');
      if (saved) {
        // Defer toast to after first render
        return JSON.parse(saved);
      }
    } catch {}
    return DEFAULT_FORM;
  });

  // Voice recognition support check
  const voiceSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  // Auto-save draft to localStorage on every form change
  useEffect(() => {
    // Don't save if form is empty
    const hasContent = form.title || form.description || form.audio_transcript;
    if (hasContent) {
      localStorage.setItem('complaint_draft', JSON.stringify(form));
    }
  }, [form]);

  // Notify user if draft was restored
  useEffect(() => {
    try {
      const saved = localStorage.getItem('complaint_draft');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.title || parsed.description) {
          toast('Draft restored. Your previous progress has been saved.', { icon: 'restore' });
        }
      }
    } catch {}
  }, []); // Only on mount

  // ── Voice Recognition Setup ──────────────────────────────────────
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = LANG_CODES[selectedLang] || 'en-IN';

      rec.onresult = (e) => {
        let transcript = '';
        for (let i = 0; i < e.results.length; i++) {
          transcript += e.results[i][0].transcript;
        }
        setForm(prev => ({ ...prev, description: transcript }));
        triggerNLPPreview(transcript);
      };

      rec.onerror = (e) => {
        if (e.error === 'not-allowed') toast.error('Microphone permission denied. Please allow microphone access.');
        else if (e.error === 'no-speech') toast('No speech detected. Please speak clearly.');
        setIsRecording(false);
      };

      rec.onend = () => setIsRecording(false);
      setRecognition(rec);
    }
  }, [selectedLang]);

  const toggleVoice = () => {
    if (!recognition) {
      toast.error('Voice input is not supported in your browser. Please use Chrome or Edge.');
      return;
    }
    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
      toast('Voice recording stopped ✓');
    } else {
      recognition.lang = LANG_CODES[selectedLang] || 'en-IN';
      recognition.start();
      setIsRecording(true);
      toast('🎤 Listening... Speak your complaint now', { duration: 3000 });
    }
  };

  // ── Live NLP Preview ─────────────────────────────────────────────
  const triggerNLPPreview = useCallback((text) => {
    if (nlpTimer.current) clearTimeout(nlpTimer.current);
    if (!text || text.trim().length < 15) { setNlpResult(null); return; }
    nlpTimer.current = setTimeout(async () => {
      setNlpLoading(true);
      try {
        const result = await nlpAPI.preview(`${form.title} ${text}`);
        setNlpResult(result);
      } catch { /* silent fail */ }
      finally { setNlpLoading(false); }
    }, 600);
  }, [form.title]);

  useEffect(() => {
    triggerNLPPreview(form.description);
  }, [form.description, form.title]);

  // ── GPS Location ─────────────────────────────────────────────────
  const getGPS = () => {
    if (!navigator.geolocation) { toast.error('GPS not available on this device'); return; }
    setGettingGPS(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        setForm(p => ({ ...p, latitude, longitude }));
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const d = await r.json();
          const addr = [d.address?.road, d.address?.suburb, d.address?.city || d.address?.town].filter(Boolean).join(', ');
          setForm(p => ({ ...p, address: addr || d.display_name, pincode: d.address?.postcode || '' }));
        } catch {}
        setGettingGPS(false);
        toast.success('GPS location captured!');
      },
      () => { setGettingGPS(false); toast.error('Could not get location. Please enter manually.'); },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // ── Analyze Image (Core Logic) ──────────────────────────────────
  const analyzeImageContent = async (imagesToAnalyze) => {
    if (!imagesToAnalyze || imagesToAnalyze.length === 0) return;
    if (!nlpResult || !nlpResult.category) return;

    setImageAnalysisLoading(true);
    try {
      // Convert first image to file
      const base64Img = imagesToAnalyze[0];
      const byteCharacters = atob(base64Img.split(',')[1]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      console.log('[AutoAnalyzeImage] Sending:', { category: nlpResult.category, blobSize: blob.size, blobType: blob.type });

      const formData = new FormData();
      formData.append('image', blob, 'complaint-image.jpg');
      formData.append('category', nlpResult.category);
      formData.append('description', form.description);

      const res = await fetch('http://localhost:5001/api/image/analyze', {
        method: 'POST',
        body: formData
      });

      console.log('[AutoAnalyzeImage] Response status:', res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('[AutoAnalyzeImage] Error response:', errorText);
        throw new Error(`Server error: ${res.status} - ${errorText}`);
      }
      
      const data = await res.json();
      console.log('[AutoAnalyzeImage] Success:', data);
      
      setImageAnalysisResult(data);
      toast.success('Image analysis complete!');
    } catch (err) {
      console.error('[AutoAnalyzeImage] Error:', err);
      console.log('[AutoAnalyzeImage] Analysis skipped or failed - proceeding with complaint filing');
    } finally {
      setImageAnalysisLoading(false);
    }
  };

  const fileToDataURL = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = ev => resolve(ev.target.result);
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });

  // ── Image Upload with Compression + Auto-Analysis ───────────────
  const handleImages = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length + form.images.length > 5) { toast.error('Max 5 photos allowed'); return; }

    setLoading(true);
    try {
      let imageCompression;
      try {
        imageCompression = (await import('browser-image-compression')).default;
      } catch (err) {
        console.error('Failed to load image compression library', err);
      }

      const compressedFiles = [];
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1280,
        useWebWorker: true
      };

      for (const file of files) {
        if (imageCompression) {
          try {
            const compressed = await imageCompression(file, options);
            compressedFiles.push(compressed);
          } catch (err) {
            console.warn('Compression failed, using original', err);
            compressedFiles.push(file);
          }
        } else {
          compressedFiles.push(file);
        }
      }

      const imageDataUrls = await Promise.all(compressedFiles.map(fileToDataURL));
      setForm(prev => {
        const updatedImages = [...prev.images, ...imageDataUrls];
        if (imageDataUrls.length > 0 && nlpResult && nlpResult.category) {
          analyzeImageContent(updatedImages);
        }
        return { ...prev, images: updatedImages };
      });
    } catch (err) {
      console.error('Failed to process selected images', err);
      toast.error('Could not process selected images. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Validation ───────────────────────────────────────────────────
  const validateStep = () => {
    if (step === 1) {
      if (!form.description.trim() && !form.audio_transcript.trim()) {
        toast.error('Please describe the complaint or use voice input'); return false;
      }
      if ((form.description + form.audio_transcript).trim().length < 10) {
        toast.error('Please provide more detail (at least 10 characters)'); return false;
      }
    }
    if (step === 2) {
      if (!form.latitude && !form.state_id) { toast.error('Please use GPS or select your State'); return false; }
      if (!form.latitude && !form.district_id) { toast.error('Please select your District'); return false; }
    }
    return true;
  };

  // ── Submit ───────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isRecording && recognition) recognition.stop();
    setLoading(true);
    try {
      const res = await complaintsAPI.file(form);
      const { complaint, auto_detection } = res;
      // Clear draft on success
      localStorage.removeItem('complaint_draft');
      toast.success(
        `Complaint filed!\nTicket: ${complaint.ticket_number}\nRouted to: ${auto_detection?.department}`,
        { duration: 5000 }
      );
      navigate(`/complaint/${complaint.id}`);
    } catch (err) {
      // Check if it's a network error (offline)
      if (!window.navigator.onLine || err.message.includes('Cannot connect to server')) {
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
          try {
            const db = await openDB('jansamadhan-db', 1, {
              upgrade(db) {
                if (!db.objectStoreNames.contains('complaints-sync')) {
                  db.createObjectStore('complaints-sync', { keyPath: 'id', autoIncrement: true });
                }
              },
            });
            const token = localStorage.getItem('token');
            await db.add('complaints-sync', { data: form, token, timestamp: Date.now() });
            
            const reg = await navigator.serviceWorker.ready;
            await reg.sync.register('sync-complaints');
            
            localStorage.removeItem('complaint_draft');
            toast.success('No connection. Your complaint has been queued and will be submitted automatically when you are back online.');
            navigate('/my-complaints');
            return;
          } catch (syncErr) {
            console.error('Failed to queue for sync:', syncErr);
          }
        }
      }
      toast.error(err.message || 'Failed to file complaint. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const priorityColor = { critical: '#B71C1C', high: '#E65100', medium: '#F57F17', low: '#33691E' };
  const deptColor = nlpResult?.departmentCode ? (DEPT_COLORS[nlpResult.departmentCode] || '#1A237E') : '#1A237E';

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('file_complaint.title', 'File a Complaint')}</h1>
          <p className="page-subtitle">{t('file_complaint.subtitle', 'Describe your issue — we\'ll automatically detect the right department')}</p>
        </div>
      </div>

      {/* Step indicator */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '16px 24px', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 0
      }}>
        {[{ n: 1, label: t('file_complaint.step1_short', 'Describe Issue') }, { n: 2, label: t('file_complaint.step2_short', 'Location') }, { n: 3, label: t('file_complaint.step3_short', 'Submit') }]
          .map((s, i, arr) => (
            <React.Fragment key={s.n}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem',
                  background: step > s.n ? '#2E7D32' : step === s.n ? '#E65100' : '#E0E3EF',
                  color: step >= s.n ? 'white' : '#9EA3B8', transition: 'all 0.3s'
                }}>
                  {step > s.n ? '✓' : s.n}
                </div>
                <span style={{
                  fontSize: '0.85rem', fontWeight: 600,
                  color: step === s.n ? '#E65100' : step > s.n ? '#2E7D32' : '#9EA3B8'
                }}>{s.label}</span>
              </div>
              {i < arr.length - 1 && (
                <div style={{ flex: 1, height: 2, margin: '0 12px', background: step > s.n ? '#2E7D32' : '#E0E3EF', transition: 'background 0.3s' }} />
              )}
            </React.Fragment>
          ))}
      </div>

      <div className="card">

        {/* ══ STEP 1: Describe Issue ══════════════════════════════════ */}
        {step === 1 && (
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }}>
              {t('file_complaint.step1', 'Step 1: Describe Your Issue')}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 20 }}>
              {t('file_complaint.step1_desc', 'Type or speak your complaint in any language. Our system will automatically identify the department.')}
            </p>

            {/* Language selector */}
            <div className="form-group">
              <label className="form-label">{t('file_complaint.lang_select', 'Select Your Language')}</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Object.entries(LANG_LABELS).map(([code, label]) => (
                  <button key={code} type="button"
                    onClick={() => setSelectedLang(code)}
                    style={{
                      padding: '6px 14px', borderRadius: 20, border: '2px solid',
                      borderColor: selectedLang === code ? 'var(--primary)' : 'var(--border)',
                      background: selectedLang === code ? 'var(--primary-light)' : 'white',
                      color: selectedLang === code ? 'var(--primary)' : 'var(--text-secondary)',
                      fontWeight: selectedLang === code ? 700 : 400,
                      fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.15s'
                    }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t('file_complaint.voice_input', 'Voice Input (Speak your complaint)')}</label>
              {voiceSupported ? (
                <button
                  type="button"
                  onClick={toggleVoice}
                  style={{
                    width: '100%', padding: '16px', borderRadius: 'var(--radius)',
                    border: `3px solid ${isRecording ? '#C62828' : 'var(--border)'}`,
                    background: isRecording ? '#FFEBEE' : 'var(--surface-2)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 12, fontSize: '0.95rem', fontWeight: 600,
                    color: isRecording ? '#C62828' : 'var(--text-secondary)',
                    transition: 'all 0.2s',
                    animation: isRecording ? 'pulse 1.5s infinite' : 'none'
                  }}
                >
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, padding: '4px 8px', borderRadius: 4, background: isRecording ? '#C62828' : 'var(--text-secondary)', color: 'white' }}>
                    {isRecording ? 'REC' : 'MIC'}
                  </div>
                  <div>
                    <div>{isRecording ? 'Recording... Tap to stop' : `Speak in ${LANG_LABELS[selectedLang]}`}</div>
                    {isRecording && <div style={{ fontSize: '0.75rem', opacity: 0.7, fontWeight: 400 }}>Listening for your complaint...</div>}
                  </div>
                  {isRecording && (
                    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                      {[1,2,3,4].map(i => (
                        <div key={i} style={{
                          width: 4, background: '#C62828', borderRadius: 2,
                          animation: `wave ${0.4 + i*0.1}s ease-in-out infinite alternate`,
                          height: `${8 + i * 4}px`
                        }} />
                      ))}
                    </div>
                  )}
                </button>
              ) : (
                <div style={{
                  padding: '14px 16px', borderRadius: 'var(--radius)',
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  fontSize: '0.85rem', color: 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', gap: 10
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="1" y1="1" x2="23" y2="23"/>
                    <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/>
                    <path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                  Voice input is not supported in your browser. Please use Chrome or Edge, or type your complaint below.
                </div>
              )}
              <p className="form-hint">Works best in Chrome or Edge browser. Supports all Indian languages.</p>
            </div>

            {/* Title */}
            <div className="form-group">
              <div className="form-label-row">
                <label className="form-label">{t('file_complaint.comp_title', 'Complaint Title')} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional — auto-generated if blank)</span></label>
                <SpeakButton
                  text={buildFieldPrompt('complaintTitle', '', LANG_CODES[selectedLang] || 'en-IN')}
                  lang={LANG_CODES[selectedLang] || 'en-IN'}
                  size="sm"
                  translate={false}
                />
              </div>
              <input
                className="form-control"
                placeholder={t('file_complaint.comp_title_ph', 'e.g., Road pothole near market, No water supply in colony...')}
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                maxLength={200}
              />
            </div>

            {/* Description */}
            <div className="form-group">
              <div className="form-label-row">
                <label className="form-label">
                  {t('file_complaint.desc_prob', 'Describe the Problem')} <span className="required">*</span>
                </label>
                <SpeakButton
                  text={buildFieldPrompt('describeIssue', '', LANG_CODES[selectedLang] || 'en-IN')}
                  lang={LANG_CODES[selectedLang] || 'en-IN'}
                  size="sm"
                  translate={false}
                />
              </div>
              <textarea
                className="form-control"
                placeholder={t('file_complaint.desc_prob_ph', 'Please provide as much detail as possible')}
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                rows={6}
                style={{ resize: 'vertical' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span className="form-hint">More detail = faster resolution. Include location, duration, impact.</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{form.description.length} chars</span>
              </div>
              {form.description.trim().length > 0 && (
                <div className="description-readout-row" style={{ marginTop: 8 }}>
                  <SpeakButton
                    {...buildDescriptionReadout(form.description, LANG_CODES[selectedLang] || 'en-IN')}
                    variant="pill"
                    label="Hear description"
                  />
                </div>
              )}
            </div>

            {/* Live NLP Preview Card */}
            {(nlpLoading || nlpResult) && (
              <div style={{
                borderRadius: 'var(--radius)', padding: 16, marginBottom: 16,
                border: `2px solid ${deptColor}30`,
                background: `${deptColor}08`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1A1A2E' }}>
                    {t('file_complaint.ai_det', 'AI Auto-Detection')}
                  </span>
                  {nlpLoading && <div className="loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />}
                </div>

                {nlpResult && !nlpLoading && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ background: 'white', borderRadius: 8, padding: '10px 14px', border: '1px solid #E0E3EF' }}>
                      <div style={{ fontSize: '0.7rem', color: '#9EA3B8', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 1 }}>Department Routed To</div>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: deptColor }}>
                        {nlpResult.department}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#5C6080', marginTop: 4 }}>
                        {nlpResult.routing_reason}
                      </div>
                    </div>

                    <div style={{ background: 'white', borderRadius: 8, padding: '10px 14px', border: '1px solid #E0E3EF' }}>
                      <div style={{ fontSize: '0.7rem', color: '#9EA3B8', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 1 }}>Priority & SLA</div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{
                          background: priorityColor[nlpResult.priority] + '20',
                          color: priorityColor[nlpResult.priority],
                          borderRadius: 20, padding: '2px 10px', fontSize: '0.75rem', fontWeight: 700
                        }}>
                          {nlpResult.priority?.toUpperCase()}
                        </span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1A1A2E' }}>
                          {nlpResult.slaHours}h to resolve
                        </span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#5C6080', marginTop: 4 }}>
                        SLA calculated based on issue type & urgency
                      </div>
                    </div>

                    <div style={{ background: 'white', borderRadius: 8, padding: '10px 14px', border: '1px solid #E0E3EF' }}>
                      <div style={{ fontSize: '0.7rem', color: '#9EA3B8', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 1 }}>Category Detected</div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                        {nlpResult.category?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#9EA3B8' }}>
                        Confidence: {Math.round((nlpResult.confidence || 0) * 100)}%
                      </div>
                    </div>

                    {nlpResult.keywords?.length > 0 && (
                      <div style={{ background: 'white', borderRadius: 8, padding: '10px 14px', border: '1px solid #E0E3EF' }}>
                        <div style={{ fontSize: '0.7rem', color: '#9EA3B8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Keywords</div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {nlpResult.keywords.slice(0, 5).map(k => (
                            <span key={k} style={{ background: '#E8EAF6', color: '#3949AB', borderRadius: 10, padding: '2px 8px', fontSize: '0.7rem', fontWeight: 600 }}>
                              {k}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {nlpResult && !nlpLoading && (
                  <div className="description-readout-row" style={{ marginTop: 12 }}>
                    <SpeakButton
                      text={buildClassificationReadout(nlpResult, LANG_CODES[selectedLang] || 'en-IN')}
                      lang={LANG_CODES[selectedLang] || 'en-IN'}
                      variant="pill"
                      label="Hear classification"
                      translate={false}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Photo upload */}
            <div className="form-group">
              <label className="form-label">Add Photos <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional, max 5)</span></label>
              <div
                className="image-upload-area"
                onClick={() => fileInputRef.current?.click()}
                style={{ padding: 20 }}
              >
                <div style={{ fontSize: '1.2rem', marginBottom: 6, fontWeight: 700, color: 'var(--text-secondary)' }}>UPLOAD</div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                  Click to upload photos of the issue
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                  Photos help resolve issues 2x faster
                </p>
              </div>
              <input ref={fileInputRef} type="file" style={{ display: 'none' }} accept="image/*" multiple onChange={handleImages} />
              {form.images.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                  {form.images.map((img, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                      <img src={img} alt="" style={{ width: 76, height: 76, objectFit: 'cover', borderRadius: 8, border: '2px solid var(--border)' }} />
                      <button type="button"
                        onClick={() => setForm(p => ({ ...p, images: p.images.filter((_, j) => j !== i) }))}
                        style={{
                          position: 'absolute', top: -6, right: -6, width: 20, height: 20,
                          borderRadius: '50%', background: 'var(--danger)', color: 'white',
                          border: '2px solid white', cursor: 'pointer', fontSize: '0.6rem', fontWeight: 800
                        }}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Auto-analyzing status */}
              {form.images.length > 0 && imageAnalysisLoading && (
                <div style={{
                  marginTop: 12, padding: 10, borderRadius: 8,
                  background: '#E3F2FD',
                  border: '1px solid #90CAF9',
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontSize: '0.85rem', color: '#1976D2'
                }}>
                  <div className="loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                  <span>Analyzing image automatically...</span>
                </div>
              )}

              {/* Image Analysis Results - Show only MISMATCH warning */}
              {imageAnalysisResult && imageAnalysisResult.status === 'MISMATCH' && (
                <div style={{
                  marginTop: 16, padding: 14, borderRadius: 8,
                  background: '#FFEBEE',
                  border: '2px solid #F44336'
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 8, fontSize: '0.95rem', color: '#C62828' }}>
                    ❌ Image Does Not Match Your Issue
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#B71C1C', lineHeight: 1.6 }}>
                    ⚠️ Make sure image matches the issue you're reporting
                  </div>
                </div>
              )}

              {/* Verified status - subtle confirmation */}
              {imageAnalysisResult && imageAnalysisResult.status === 'VERIFIED' && (
                <div style={{
                  marginTop: 16, padding: 14, borderRadius: 8,
                  background: '#E8F5E9',
                  border: '2px solid #4CAF50'
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 8, fontSize: '0.95rem', color: '#2E7D32' }}>
                    ✅ Image Verified
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#1B5E20', lineHeight: 1.6 }}>
                    Image matches your complaint description
                  </div>
                </div>
              )}
            </div>

            <button type="button" className="btn btn-primary w-full btn-lg" onClick={() => validateStep() && setStep(2)}>
              {t('file_complaint.next_loc', 'Next: Add Location')}
            </button>
          </div>
        )}

        {/* ══ STEP 2: Location ════════════════════════════════════════ */}
        {step === 2 && (
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }}>
              {t('file_complaint.step2', 'Step 2: Where is the Problem?')}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 20 }}>
              {t('file_complaint.step2_desc', 'Precise location ensures your complaint reaches the correct local authority')}
            </p>

            {/* GPS Button */}
            <button type="button" className="btn w-full" onClick={getGPS} disabled={gettingGPS}
              style={{
                marginBottom: 16, padding: '14px', fontSize: '0.95rem',
                background: form.latitude ? '#E8F5E9' : 'var(--secondary)',
                color: form.latitude ? '#2E7D32' : 'white',
                border: form.latitude ? '2px solid #A5D6A7' : 'none',
                borderRadius: 'var(--radius)', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
              }}>
              {gettingGPS
                ? <><div className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2, borderTopColor: 'white' }} /> {t('file_complaint.btn_gps_load', 'Getting your location...')}</>
                : form.latitude
                  ? `GPS Captured: ${parseFloat(form.latitude).toFixed(4)}, ${parseFloat(form.longitude).toFixed(4)}`
                  : t('file_complaint.btn_gps', 'Use My Current GPS Location (Recommended)')
              }
            </button>

            {form.latitude && (
              <div style={{ background: '#E8F5E9', border: '1px solid #A5D6A7', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 16, fontSize: '0.85rem', color: '#2E7D32' }}>
                <strong>GPS location captured.</strong> Your complaint will be pinned on the map automatically.
                {form.address && <div style={{ marginTop: 4, color: '#388E3C' }}>Address: {form.address}</div>}
                <button type="button" onClick={() => setForm(p => ({ ...p, latitude: '', longitude: '' }))}
                  style={{ marginTop: 6, background: 'none', border: 'none', color: '#C62828', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}>
                  ✕ Clear GPS and enter manually
                </button>
              </div>
            )}

            <div style={{ textAlign: 'center', margin: '8px 0 16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              — {form.latitude ? 'optionally refine with dropdowns below' : 'or select your location manually below'} —
            </div>

            {/* Location hierarchy */}
            <LocationSelector value={form} onChange={vals => setForm(p => ({ ...p, ...vals }))} required />

            <div className="form-group">
              <label className="form-label">{t('file_complaint.landmark', 'Full Address')}</label>
              <textarea className="form-control" rows={2}
                placeholder={t('file_complaint.landmark_ph', 'House No, Street Name, Area, Colony...')}
                value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">{t('file_complaint.landmark', 'Nearby Landmark')}</label>
                <input className="form-control" placeholder={t('file_complaint.landmark_ph', 'Near school, temple, market...')}
                  value={form.landmark} onChange={e => setForm(p => ({ ...p, landmark: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('file_complaint.pincode', 'Pincode')}</label>
                <input className="form-control" placeholder="6-digit pincode" maxLength="6"
                  value={form.pincode} onChange={e => setForm(p => ({ ...p, pincode: e.target.value }))} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn btn-ghost w-full" onClick={() => setStep(1)}>{t('file_complaint.btn_back', 'Back')}</button>
              <button type="button" className="btn btn-primary w-full btn-lg" onClick={() => validateStep() && setStep(3)}>
                {t('file_complaint.btn_next', 'Next: Review & Submit')}
              </button>
            </div>
          </div>
        )}

        {/* ══ STEP 3: Review & Submit ══════════════════════════════════ */}
        {step === 3 && (
          <form onSubmit={handleSubmit}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 700, marginBottom: 20 }}>
              {t('file_complaint.step3', 'Step 3: Review & Submit')}
            </h2>

            {/* Summary */}
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 20 }}>
              <h3 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 12, color: 'var(--text-secondary)' }}>{t('file_complaint.sum', 'Complaint Summary')}</h3>
              <div style={{ display: 'grid', gap: 8, fontSize: '0.875rem' }}>
                {form.title && <div><strong>{t('file_complaint.iss', 'Title')}:</strong> {form.title}</div>}
                <div><strong>{t('file_complaint.desc_prob', 'Description')}:</strong> {(form.description || form.audio_transcript || '').substring(0, 120)}...</div>
                {form.address && <div><strong>{t('file_complaint.loc', 'Address')}:</strong> {form.address}</div>}
                {nlpResult && (
                  <>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                      <span style={{ background: deptColor + '15', color: deptColor, borderRadius: 6, padding: '3px 10px', fontSize: '0.78rem', fontWeight: 700 }}>
                        {nlpResult.department}
                      </span>
                      <span style={{ background: priorityColor[nlpResult.priority] + '15', color: priorityColor[nlpResult.priority], borderRadius: 6, padding: '3px 10px', fontSize: '0.78rem', fontWeight: 700 }}>
                        {nlpResult.priority?.toUpperCase()} PRIORITY
                      </span>
                      <span style={{ background: '#E8EAF6', color: '#3949AB', borderRadius: 6, padding: '3px 10px', fontSize: '0.78rem', fontWeight: 700 }}>
                        SLA: {nlpResult.slaHours}h
                      </span>
                    </div>
                  </>
                )}
                {form.images.length > 0 && <div>{form.images.length} photo(s) attached</div>}
              </div>
            </div>

            {/* Visibility options */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: 10 }}>
                Identity Preference
              </label>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', border: '2px solid var(--border)',
                borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)'
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    {form.is_anonymous ? 'Filing Anonymously' : 'Filing as Yourself'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {form.is_anonymous
                      ? 'Your name will show as "Anonymous" on the public feed'
                      : 'Your name will be visible on the public feed'}
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Anonymous</span>
                  <div
                    onClick={() => setForm(p => ({ ...p, is_anonymous: !p.is_anonymous }))}
                    style={{
                      width: 44, height: 24, borderRadius: 12, cursor: 'pointer', transition: 'background 0.2s',
                      background: form.is_anonymous ? 'var(--primary)' : '#CBD5E0',
                      position: 'relative', flexShrink: 0
                    }}>
                    <div style={{
                      position: 'absolute', top: 3, left: form.is_anonymous ? 23 : 3,
                      width: 18, height: 18, borderRadius: '50%', background: 'white',
                      transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }} />
                  </div>
                </label>
              </div>
              <div style={{ marginTop: 10 }}>
                <label style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer',
                  padding: '12px 14px', border: `2px solid ${form.is_public ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-sm)', background: form.is_public ? 'var(--primary-light)' : 'white',
                  transition: 'all 0.15s'
                }}>
                  <input type="checkbox" checked={form.is_public}
                    onChange={e => setForm(p => ({ ...p, is_public: e.target.checked }))}
                    style={{ width: 18, height: 18, marginTop: 2, accentColor: 'var(--primary)' }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>Show on public feed</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      Other citizens can see, upvote and support your complaint — helps escalate faster
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div style={{ background: '#E3F2FD', border: '1px solid #90CAF9', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '0.82rem', color: '#0277BD' }}>
              Note: By submitting you confirm this information is accurate. Filing false complaints may result in account suspension.
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn btn-ghost w-full" onClick={() => setStep(2)}>{t('file_complaint.btn_back', 'Back')}</button>
              <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
                {loading
                  ? <><div className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> {t('file_complaint.btn_sub_load', 'Submitting...')}</>
                  : t('file_complaint.btn_sub', 'Submit Complaint')
                }
              </button>
            </div>
          </form>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        @keyframes wave {
          0% { transform: scaleY(0.5); }
          100% { transform: scaleY(1.2); }
        }
      `}</style>
    </div>
  );
}
