import React, { useState, useEffect, useRef } from 'react';
import { complaintsAPI, locationAPI } from '../../services/api';

const CATEGORY_COLORS = {
  roads: '#E65100', water_supply: '#0277BD', electricity: '#F9A825',
  waste_management: '#558B2F', drainage: '#00838F', infrastructure: '#6A1B9A',
  parks: '#2E7D32', health: '#C62828', education: '#283593', other: '#546E7A'
};

export default function HotspotMap() {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [hotspots, setHotspots] = useState([]);
  const [states, setStates] = useState([]);
  const [filters, setFilters] = useState({ state_id: '', category: '', days: 30 });
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, byCategory: {} });

  useEffect(() => {
    locationAPI.getStates().then(r => setStates(r.states || []));
    initMap();
  }, []);

  useEffect(() => {
    loadHotspots();
  }, [filters]);

  const initMap = () => {
    if (mapInstanceRef.current || !mapRef.current) return;
    // Dynamically load leaflet
    const L = window.L;
    if (!L) {
      // Load Leaflet CSS and JS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => setupMap();
      document.head.appendChild(script);
    } else {
      setupMap();
    }
  };

  const setupMap = () => {
    const L = window.L;
    if (!L || !mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView([20.5937, 78.9629], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    mapInstanceRef.current = map;
  };

  const loadHotspots = async () => {
    setLoading(true);
    try {
      const res = await complaintsAPI.getHotspots(filters);
      const data = res.hotspots || [];
      setHotspots(data);

      // Update stats
      const byCategory = {};
      data.forEach(h => { byCategory[h.category] = (byCategory[h.category] || 0) + 1; });
      setStats({ total: data.length, byCategory });

      // Update map markers
      updateMapMarkers(data);
    } catch {} finally { setLoading(false); }
  };

  const updateMapMarkers = (data) => {
    const L = window.L;
    const map = mapInstanceRef.current;
    if (!L || !map) return;

    // Remove existing markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    data.forEach(h => {
      if (!h.latitude || !h.longitude) return;
      const color = CATEGORY_COLORS[h.category] || '#546E7A';
      const prioritySize = { critical: 14, high: 12, medium: 10, low: 8 };
      const size = prioritySize[h.priority] || 8;

      const icon = L.divIcon({
        className: '',
        html: `<div style="width:${size}px;height:${size}px;background:${color};border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>`,
        iconSize: [size, size],
        iconAnchor: [size/2, size/2]
      });

      const marker = L.marker([h.latitude, h.longitude], { icon })
        .bindPopup(`
          <div style="min-width:200px;font-family:sans-serif">
            <strong style="font-size:0.9rem">${h.title || h.category}</strong><br>
            <span style="color:${color};font-size:0.75rem;font-weight:700">${h.category?.replace(/_/g, ' ').toUpperCase()}</span><br>
            <span style="font-size:0.78rem;color:#666">${h.address || 'Location marked'}</span><br>
            <span style="font-size:0.75rem;background:${color}20;color:${color};padding:2px 6px;border-radius:10px;display:inline-block;margin-top:4px">${h.priority} priority</span>
          </div>
        `);
      marker.addTo(map);
      markersRef.current.push(marker);
    });
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🗺️ Complaint Hotspot Map</h1>
          <p className="page-subtitle">Geographic distribution of civic complaints</p>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <select className="form-control" value={filters.state_id} onChange={e => setFilters(p => ({ ...p, state_id: e.target.value }))}>
          <option value="">All States</option>
          {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="form-control" value={filters.category} onChange={e => setFilters(p => ({ ...p, category: e.target.value }))}>
          <option value="">All Categories</option>
          {Object.keys(CATEGORY_COLORS).map(c => (
            <option key={c} value={c}>{c.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())}</option>
          ))}
        </select>
        <select className="form-control" value={filters.days} onChange={e => setFilters(p => ({ ...p, days: e.target.value }))}>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">Last 1 year</option>
        </select>
        {loading && <div className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />}
      </div>

      {/* Stats strip */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <span style={{ background: 'var(--secondary)', color: 'white', borderRadius: 20, padding: '4px 14px', fontSize: '0.8rem', fontWeight: 700 }}>
          📍 {stats.total} locations shown
        </span>
        {Object.entries(stats.byCategory).sort((a,b) => b[1]-a[1]).slice(0,5).map(([cat, count]) => (
          <span key={cat} style={{ background: CATEGORY_COLORS[cat] + '20', color: CATEGORY_COLORS[cat], borderRadius: 20, padding: '4px 12px', fontSize: '0.75rem', fontWeight: 700, border: `1px solid ${CATEGORY_COLORS[cat]}40` }}>
            {cat.replace(/_/g, ' ')}: {count}
          </span>
        ))}
      </div>

      {/* Map */}
      <div style={{ borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
        <div ref={mapRef} style={{ height: 500, background: '#E8EAF6' }}>
          {!window.L && (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
              <div className="loading-spinner" style={{ width: 36, height: 36 }} />
              <p style={{ color: 'var(--text-muted)' }}>Loading map...</p>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 10 }}>Map Legend</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
            <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
              <div style={{ width: 10, height: 10, background: color, borderRadius: '50%', border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', flexShrink: 0 }} />
              {cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          🔴 Larger dots = Higher priority complaints | Click on a dot to see details
        </div>
      </div>
    </div>
  );
}
