import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { complaintsAPI, nlpAPI, locationAPI } from '../../services/api';
import { LocationSelector } from '../../components/common';
import SpeakButton from '../../components/ui/SpeakButton';
import { buildFieldPrompt, buildDescriptionReadout, buildClassificationReadout } from '../../hooks/useTextToSpeech';
import { useLanguage } from '../../context/LanguageContext';
import useAuthStore from '../../store/authStore';

// Fix Leaflet default marker icon path issue in bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function InteractiveLocationPicker({ form, setForm }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef(null);

  const coords = (form.latitude && form.longitude && !isNaN(parseFloat(form.latitude)) && !isNaN(parseFloat(form.longitude)))
    ? [parseFloat(form.latitude), parseFloat(form.longitude)]
    : [17.53, 78.37]; // Default to Hyderabad / Bachupally area

  const handleSearchResultSelect = async (result) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    setSearchResults([]);
    setSearchQuery(result.display_name.split(',').slice(0, 2).join(', '));

    setForm(prev => ({ ...prev, latitude: lat, longitude: lon }));
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lon], 16);
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lon]);
      }
    }

    try {
      const resolved = await locationAPI.resolveGPSLocation(lat, lon);
      setForm(prev => ({
        ...prev,
        latitude: lat,
        longitude: lon,
        address: resolved.address || prev.address || result.display_name,
        pincode: resolved.pincode || prev.pincode,
        state_id: resolved.state_id || prev.state_id,
        state_name: resolved.state_name || prev.state_name,
        district_id: resolved.district_id || '',
        taluka_id: resolved.taluka_id || '',
        mandal_id: resolved.mandal_id || ''
      }));
      toast.success('📍 Location pinned & fields updated!');
    } catch {
      toast.success('📍 Location pinned!');
    }
  };

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!val || val.trim().length < 3) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&q=${encodeURIComponent(val)}&addressdetails=1&limit=5`);
        const data = await res.json();
        setSearchResults(data || []);
      } catch (err) {
        console.error('[Nominatim search error]', err);
      } finally {
        setSearching(false);
      }
    }, 350);
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      try { mapInstanceRef.current.remove(); } catch (e) {}
      mapInstanceRef.current = null;
    }

    try {
      const initialZoom = (form.latitude && form.longitude) ? 15 : 12;
      const map = L.map(mapContainerRef.current, { scrollWheelZoom: false }).setView(coords, initialZoom);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      const marker = L.marker(coords, { draggable: true }).addTo(map);
      marker.bindPopup('📍 <strong>Drag pin or click map</strong> to set exact spot');

      const onMarkerMoved = async (newLat, newLon) => {
        setForm(p => ({ ...p, latitude: newLat, longitude: newLon }));
        try {
          const resolved = await locationAPI.resolveGPSLocation(newLat, newLon);
          setForm(prev => ({
            ...prev,
            latitude: newLat,
            longitude: newLon,
            address: resolved.address || prev.address,
            pincode: resolved.pincode || prev.pincode,
            state_id: resolved.state_id || prev.state_id,
            state_name: resolved.state_name || prev.state_name,
            district_id: resolved.district_id || '',
            taluka_id: resolved.taluka_id || '',
            mandal_id: resolved.mandal_id || ''
          }));
          toast.success('📍 Pin updated: ' + (resolved.address || 'Location captured'));
        } catch {
          toast.success('📍 Pin moved!');
        }
      };

      marker.on('dragend', (e) => {
        const { lat, lng } = e.target.getLatLng();
        onMarkerMoved(lat, lng);
      });

      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        onMarkerMoved(lat, lng);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
    } catch (err) {
      console.warn('[Map init error]', err);
    }

    return () => {
      if (mapInstanceRef.current) {
        try { mapInstanceRef.current.remove(); } catch (e) {}
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (form.latitude && form.longitude && mapInstanceRef.current && markerRef.current) {
      const lat = parseFloat(form.latitude);
      const lon = parseFloat(form.longitude);
      if (!isNaN(lat) && !isNaN(lon)) {
        markerRef.current.setLatLng([lat, lon]);
        mapInstanceRef.current.setView([lat, lon], 16);
      }
    }
  }, [form.latitude, form.longitude]);

  return (
    <div style={{ marginBottom: 18 }}>
      {/* Search Bar with autocomplete */}
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, color: 'var(--text-muted)', fontSize: '1rem', pointerEvents: 'none' }}>🔍</span>
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: 38, paddingRight: searching ? 40 : 12, height: 44, borderRadius: 8, fontSize: '0.9rem' }}
            placeholder="Search your area, colony, or landmark (e.g. Bachupally, Miyapur, Kompally...)"
            value={searchQuery}
            onChange={e => handleSearchChange(e.target.value)}
          />
          {searching && (
            <div style={{ position: 'absolute', right: 12 }}>
              <div className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
            </div>
          )}
        </div>

        {/* Autocomplete Dropdown */}
        {searchResults.length > 0 && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
            background: 'white', border: '1px solid var(--border)', borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)', marginTop: 4, maxHeight: 220, overflowY: 'auto'
          }}>
            {searchResults.map((item, idx) => (
              <div
                key={item.place_id || idx}
                onClick={() => handleSearchResultSelect(item)}
                style={{
                  padding: '10px 14px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer',
                  fontSize: '0.85rem', display: 'flex', alignItems: 'flex-start', gap: 8,
                  transition: 'background 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#F0F4F8'}
                onMouseLeave={e => e.currentTarget.style.background = 'white'}
              >
                <span style={{ fontSize: '1rem', marginTop: 2 }}>📍</span>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>
                    {item.display_name.split(',')[0]}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', lineHeight: 1.3 }}>
                    {item.display_name.split(',').slice(1).join(',')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Interactive Map */}
      <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <div ref={mapContainerRef} style={{ height: 230, width: '100%', zIndex: 1 }} />
        <div style={{
          position: 'absolute', bottom: 8, left: 8, right: 8, zIndex: 500,
          background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(4px)',
          padding: '6px 12px', borderRadius: 6, fontSize: '0.75rem', color: '#333',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          border: '1px solid rgba(0,0,0,0.08)'
        }}>
          <span>📍 <strong>Tip:</strong> Drag the pin or click anywhere on the map to place it.</span>
          {form.latitude && (
            <span style={{ color: '#2E7D32', fontWeight: 600 }}>
              {parseFloat(form.latitude).toFixed(4)}, {parseFloat(form.longitude).toFixed(4)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

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
  const { user } = useAuthStore();

  const setSelectedLang = (code) => {
    setSelectedLangLocal(code);
    setActiveLang(LANG_CODES[code] || 'en-IN');
  };

  const DEFAULT_FORM = {
    title: '', description: '', audio_transcript: '',
    latitude: '', longitude: '', address: user?.address || '', landmark: '', pincode: user?.pincode || '',
    state_id: user?.state_id || '', district_id: user?.district_id || '', corporation_id: '', municipality_id: '',
    taluka_id: user?.taluka_id || '', mandal_id: user?.mandal_id || '', gram_panchayat_id: '',
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

  // Sync profile location if loaded after mount
  useEffect(() => {
    if (user && !form.state_id && user.state_id) {
      setForm(prev => ({
        ...prev,
        state_id: user.state_id || prev.state_id,
        district_id: user.district_id || prev.district_id,
        taluka_id: user.taluka_id || prev.taluka_id,
        mandal_id: user.mandal_id || prev.mandal_id,
        address: prev.address || user.address || '',
        pincode: prev.pincode || user.pincode || ''
      }));
    }
  }, [user]);

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
    if (!text || text.trim().length < 3) { setNlpResult(null); return; }
    nlpTimer.current = setTimeout(async () => {
      setNlpLoading(true);
      try {
        const result = await nlpAPI.preview(`${form.title} ${text}`, form.state_id || user?.state_id);
        setNlpResult(result);
      } catch { /* silent fail */ }
      finally { setNlpLoading(false); }
    }, 250);
  }, [form.title, form.state_id, user?.state_id]);

  useEffect(() => {
    triggerNLPPreview(form.description);
  }, [form.description, form.title, form.state_id, triggerNLPPreview]);

  // Automatically trigger image analysis when NLP category arrives
  useEffect(() => {
    if (form.images.length > 0 && nlpResult?.category && !imageAnalysisLoading && !imageAnalysisResult) {
      analyzeImageContent(form.images);
    }
  }, [nlpResult?.category, form.images]);

  // ── GPS Location ─────────────────────────────────────────────────
  const getGPS = () => {
    if (!navigator.geolocation) { toast.error('GPS not available on this device'); return; }
    setGettingGPS(true);
    toast('📡 Getting your location...', { duration: 2000 });

    const resolveAndFill = async (latitude, longitude) => {
      // Immediately set coordinates so the map updates
      setForm(p => ({ ...p, latitude, longitude }));

      try {
        const resolved = await locationAPI.resolveGPSLocation(latitude, longitude);
        console.log('[GPS] Resolved location:', resolved);

        setForm(prev => ({
          ...prev,
          latitude,
          longitude,
          address: resolved.address || prev.address,
          pincode: resolved.pincode || prev.pincode,
          state_id: resolved.state_id || prev.state_id,
          state_name: resolved.state_name || prev.state_name,
          district_id: resolved.district_id || prev.district_id,
          taluka_id: resolved.taluka_id || prev.taluka_id,
          mandal_id: resolved.mandal_id || prev.mandal_id
        }));

        const parts = [];
        if (resolved.address) parts.push(resolved.address);
        if (resolved.state_name) parts.push(resolved.state_name);
        toast.success(parts.length > 0 ? `📍 Location: ${parts.join(', ')}` : 'GPS location captured!');
      } catch (err) {
        console.warn('[GPS] Address resolution failed:', err);
        toast.success('GPS coordinates captured!');
      }
      setGettingGPS(false);
    };

    // Try fast cached position first (instant), then high-accuracy
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolveAndFill(coords.latitude, coords.longitude),
      (err) => {
        console.warn('[GPS] First attempt failed:', err.message);
        if (err.code === 1) {
          // Permission denied — can't retry
          setGettingGPS(false);
          toast.error('Location access denied. Please enter your location manually.');
          return;
        }
        // Retry with low accuracy and longer cache
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => resolveAndFill(coords.latitude, coords.longitude),
          () => {
            setGettingGPS(false);
            toast.error('Could not get location. Please enter manually.');
          },
          { timeout: 12000, enableHighAccuracy: false, maximumAge: 300000 }
        );
      },
      { timeout: 5000, enableHighAccuracy: false, maximumAge: 60000 }
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

      const token = localStorage.getItem('token');
      const res = await fetch('/api/image/analyze', {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
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

  // ── Image Upload with Auto-Analysis ─────────────────────────────
  const handleImages = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + form.images.length > 5) { toast.error('Max 5 photos allowed'); return; }
    
    let filesProcessed = 0;
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        filesProcessed++;
        setForm(p => {
          const updatedForm = { ...p, images: [...p.images, ev.target.result] };
          // Trigger auto-analysis when first image is loaded
          if (filesProcessed === 1 && nlpResult && nlpResult.category) {
            analyzeImageContent(updatedForm.images);
          }
          return updatedForm;
        });
      };
      reader.readAsDataURL(file);
    });
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
      if (imageAnalysisLoading) {
        toast('Analyzing image with AI... please wait a moment.', { icon: '⏳' });
        return false;
      }
      if (form.images.length > 0 && imageAnalysisResult && imageAnalysisResult.status === 'MISMATCH') {
        toast.error('Uploaded image does not match your complaint. Please upload a related photo or remove it to proceed.');
        return false;
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
          <h1 className="page-title">File a Complaint</h1>
          <p className="page-subtitle">Describe your issue — we'll automatically detect the right department</p>
        </div>
      </div>

      {/* Step indicator */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '16px 24px', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 0
      }}>
        {[{ n: 1, label: 'Describe Issue' }, { n: 2, label: 'Location' }, { n: 3, label: 'Submit' }]
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
              Step 1: Describe Your Issue
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 20 }}>
              Type or speak your complaint in any language. Our system will automatically identify the department.
            </p>

            {/* Language selector */}
            <div className="form-group">
              <label className="form-label">Select Your Language</label>
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
              <label className="form-label">Voice Input (Speak your complaint)</label>
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
                <label className="form-label">Complaint Title <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional — auto-generated if blank)</span></label>
                <SpeakButton
                  text={buildFieldPrompt('complaintTitle', '', LANG_CODES[selectedLang] || 'en-IN')}
                  lang={LANG_CODES[selectedLang] || 'en-IN'}
                  size="sm"
                  translate={false}
                />
              </div>
              <input
                className="form-control"
                placeholder="e.g., Road pothole near market, No water supply in colony..."
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                maxLength={200}
              />
            </div>

            {/* Description */}
            <div className="form-group">
              <div className="form-label-row">
                <label className="form-label">
                  Describe the Problem <span className="required">*</span>
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
                placeholder={`Type your complaint here in ${LANG_LABELS[selectedLang]}...\n\nExample: There is a large pothole on the main road near the railway station. It has been there for 2 weeks and caused 3 accidents already. Please repair urgently.`}
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
                    AI Auto-Detection
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
                        onClick={() => {
                          const updated = form.images.filter((_, j) => j !== i);
                          setForm(p => ({ ...p, images: updated }));
                          if (updated.length === 0) {
                            setImageAnalysisResult(null);
                          } else {
                            analyzeImageContent(updated);
                          }
                        }}
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
                  <span>Analyzing photo with AI Vision...</span>
                </div>
              )}

              {/* Image Analysis Results - Mismatch Warning */}
              {imageAnalysisResult && imageAnalysisResult.status === 'MISMATCH' && (
                <div style={{
                  marginTop: 16, padding: 14, borderRadius: 8,
                  background: '#FFEBEE',
                  border: '2px solid #F44336'
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 6, fontSize: '0.95rem', color: '#C62828', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>❌</span> Image Does Not Match Your Issue
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#B71C1C', lineHeight: 1.5, marginBottom: 12 }}>
                    ⚠️ {imageAnalysisResult.mismatch_details?.analysis_explanation || "The uploaded image does not appear to match the reported issue. Please upload a photo of the actual issue to proceed."}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        background: '#C62828', color: 'white', border: 'none',
                        borderRadius: 6, padding: '7px 14px', fontSize: '0.82rem',
                        fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                      }}>
                      🔄 Upload Related Photo
                    </button>
                    <button type="button"
                      onClick={() => {
                        setForm(p => ({ ...p, images: [] }));
                        setImageAnalysisResult(null);
                        toast.success('Mismatched photo removed');
                      }}
                      style={{
                        background: 'white', color: '#C62828', border: '1px solid #C62828',
                        borderRadius: 6, padding: '7px 14px', fontSize: '0.82rem',
                        fontWeight: 700, cursor: 'pointer'
                      }}>
                      🗑️ Remove Photo & Proceed
                    </button>
                  </div>
                </div>
              )}

              {/* Verified status */}
              {imageAnalysisResult && imageAnalysisResult.status === 'VERIFIED' && (
                <div style={{
                  marginTop: 16, padding: 14, borderRadius: 8,
                  background: '#E8F5E9',
                  border: '2px solid #4CAF50'
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 6, fontSize: '0.95rem', color: '#2E7D32', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>✅</span> Image Verified
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#1B5E20', lineHeight: 1.5 }}>
                    Image matches your complaint description
                  </div>
                </div>
              )}

              {/* Attached / Pending status */}
              {imageAnalysisResult && (imageAnalysisResult.status === 'ATTACHED' || imageAnalysisResult.status === 'UNCERTAIN') && (
                <div style={{
                  marginTop: 16, padding: '10px 14px', borderRadius: 8,
                  background: 'var(--surface-2, #F8F9FA)',
                  border: '1px solid var(--border, #E0E0E0)',
                  display: 'flex', alignItems: 'center', gap: 10
                }}>
                  <span style={{ fontSize: '1.1rem' }}>📷</span>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #555)' }}>
                    <strong>Photo attached.</strong> Will be reviewed by the assigned officer.
                  </div>
                </div>
              )}
            </div>

            <button type="button" className="btn btn-primary w-full btn-lg" onClick={() => validateStep() && setStep(2)}>
              Next: Add Location
            </button>
          </div>
        )}

        {/* ══ STEP 2: Location ════════════════════════════════════════ */}
        {step === 2 && (
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }}>
              Step 2: Where is the Problem?
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
              Search your area, drag the pin on the map, or use GPS to pinpoint the exact location
            </p>

            {/* Interactive Map & Locality Search */}
            <InteractiveLocationPicker form={form} setForm={setForm} />

            {/* GPS Button */}
            <button type="button" className="btn w-full" onClick={getGPS} disabled={gettingGPS}
              style={{
                marginBottom: 16, padding: '12px', fontSize: '0.9rem',
                background: form.latitude ? '#E8F5E9' : 'var(--secondary)',
                color: form.latitude ? '#2E7D32' : 'white',
                border: form.latitude ? '2px solid #A5D6A7' : 'none',
                borderRadius: 'var(--radius)', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
              }}>
              {gettingGPS
                ? <><div className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2, borderTopColor: 'white' }} /> Getting your location...</>
                : form.latitude
                  ? `📍 GPS Coordinates Locked: ${parseFloat(form.latitude).toFixed(4)}, ${parseFloat(form.longitude).toFixed(4)}`
                  : '🎯 Use My Current GPS Device Location'
              }
            </button>

            {form.latitude && (
              <div style={{ background: '#E8F5E9', border: '1px solid #A5D6A7', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 16, fontSize: '0.85rem', color: '#2E7D32', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>Location pinned.</strong> {form.address && <span>{form.address}</span>}
                </div>
                <button type="button" onClick={() => setForm(p => ({ ...p, latitude: '', longitude: '' }))}
                  style={{ background: 'none', border: 'none', color: '#C62828', cursor: 'pointer', fontSize: '0.8rem', padding: '2px 6px', fontWeight: 600 }}>
                  ✕ Reset Pin
                </button>
              </div>
            )}

            <div style={{ textAlign: 'center', margin: '8px 0 16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              — Verify or adjust administrative zone dropdowns below —
            </div>

            {/* Location hierarchy */}
            <LocationSelector value={form} onChange={vals => setForm(p => ({ ...p, ...vals }))} required />

            <div className="form-group">
              <label className="form-label">Full Address</label>
              <textarea className="form-control" rows={2}
                placeholder="House No, Street Name, Area, Colony..."
                value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Nearby Landmark</label>
                <input className="form-control" placeholder="Near school, temple, market..."
                  value={form.landmark} onChange={e => setForm(p => ({ ...p, landmark: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Pincode</label>
                <input className="form-control" placeholder="6-digit pincode" maxLength="6"
                  value={form.pincode} onChange={e => setForm(p => ({ ...p, pincode: e.target.value }))} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn btn-ghost w-full" onClick={() => setStep(1)}>Back</button>
              <button type="button" className="btn btn-primary w-full btn-lg" onClick={() => validateStep() && setStep(3)}>
                Next: Review & Submit
              </button>
            </div>
          </div>
        )}

        {/* ══ STEP 3: Review & Submit ══════════════════════════════════ */}
        {step === 3 && (
          <form onSubmit={handleSubmit}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 700, marginBottom: 20 }}>
              Step 3: Review & Submit
            </h2>

            {/* Summary */}
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 20 }}>
              <h3 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 12, color: 'var(--text-secondary)' }}>Complaint Summary</h3>
              <div style={{ display: 'grid', gap: 8, fontSize: '0.875rem' }}>
                {form.title && <div><strong>Title:</strong> {form.title}</div>}
                <div><strong>Description:</strong> {(form.description || form.audio_transcript || '').substring(0, 120)}...</div>
                {form.address && <div><strong>Address:</strong> {form.address}</div>}
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
              <button type="button" className="btn btn-ghost w-full" onClick={() => setStep(2)}>Back</button>
              <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
                {loading
                  ? <><div className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Submitting...</>
                  : 'Submit Complaint'
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
