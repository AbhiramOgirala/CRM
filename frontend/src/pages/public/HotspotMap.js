import React, { useState, useEffect, useRef } from 'react';
import { complaintsAPI, locationAPI } from '../../services/api';

const CATEGORY_COLORS = {
  roads: '#E65100', water_supply: '#0277BD', electricity: '#F9A825',
  waste_management: '#558B2F', drainage: '#00838F', infrastructure: '#6A1B9A',
  parks: '#2E7D32', health: '#C62828', education: '#283593',
  street_lights: '#FF6F00', other: '#546E7A'
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
  const [error, setError] = useState(null);
  const [totalComplaints, setTotalComplaints] = useState(0);
  const userLocationRef = useRef(null);

  useEffect(() => {
    // Attempt to get user's location on mount
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          userLocationRef.current = loc;
          if (mapInstanceRef.current && !filters.state_id) {
            mapInstanceRef.current.setView([loc.lat, loc.lng], 12);
          }
        },
        (err) => console.log('Location access denied or failed:', err)
      );
    }
    locationAPI.getStates()
      .then(r => setStates(r.states || []))
      .catch(error => {
        console.error('Failed to load states:', error);
        setStates([]);
      });
    initMap();
  }, []);

  useEffect(() => {
    loadHotspots();
  }, [filters]);

  const initMap = () => {
    if (mapInstanceRef.current || !mapRef.current) return;

    // Check if Leaflet is already loaded
    const L = window.L;
    if (!L) {
      // Load Leaflet CSS and JS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        // Wait a bit for Leaflet to fully initialize
        setTimeout(setupMap, 100);
      };
      script.onerror = () => {
        console.error('Failed to load Leaflet library');
        setError('Failed to load map library. Please refresh the page.');
      };
      document.head.appendChild(script);
    } else {
      setupMap();
    }
  };

  const setupMap = () => {
    const L = window.L;
    if (!L || !mapRef.current || mapInstanceRef.current) return;

    try {
      const map = L.map(mapRef.current).setView([20.5937, 78.9629], 5);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);
      mapInstanceRef.current = map;

      // Load hotspots after map is ready
      if (hotspots.length > 0) {
        updateMapMarkers(hotspots);
      }
    } catch (error) {
      console.error('Failed to initialize map:', error);
      setError('Failed to initialize map. Please refresh the page.');
    }
  };

  const loadHotspots = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Loading hotspots with filters:', filters);

      // Load both hotspots and total complaints for comparison
      const [hotspotsRes, dashboardRes] = await Promise.all([
        complaintsAPI.getHotspots(filters),
        complaintsAPI.getDashboard()
      ]);

      console.log('Hotspots API response:', hotspotsRes);
      const data = hotspotsRes.hotspots || [];
      setHotspots(data);
      setTotalComplaints(dashboardRes.stats?.total || 0);

      // Update stats
      const byCategory = {};
      data.forEach(h => { byCategory[h.category] = (byCategory[h.category] || 0) + 1; });
      setStats({ total: data.length, byCategory });

      // Update map markers
      updateMapMarkers(data);
    } catch (error) {
      console.error('Failed to load hotspots:', error);
      setError('Failed to load hotspot data. Please try again.');
      setHotspots([]);
      setStats({ total: 0, byCategory: {} });
      setTotalComplaints(0);
    } finally {
      setLoading(false);
    }
  };

  const updateMapMarkers = (data) => {
    const L = window.L;
    const map = mapInstanceRef.current;
    if (!L || !map) return;

    try {
      // Remove existing markers
      markersRef.current.forEach(m => map.removeLayer(m));
      markersRef.current = [];
      const bounds = [];

      data.forEach(h => {
        if (!h.latitude || !h.longitude) return;
        bounds.push([h.latitude, h.longitude]);
        const PRIORITY_COLORS = { low: '#10B981', medium: '#FBBF24', high: '#F97316', critical: '#EF4444' };
        const prioritySize = { critical: 28, high: 24, medium: 20, low: 16 };
        const size = prioritySize[h.priority] || 20;
        const color = PRIORITY_COLORS[h.priority] || PRIORITY_COLORS.medium;

        const icon = L.divIcon({
          className: '',
          html: `<div style="width:${size}px;height:${size}px;background:${color}66;border-radius:50%;border:2px solid ${color};"></div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2]
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

      if (filters.state_id) {
        // If user actively selected a state filter, focus on bounds
        if (bounds.length > 0) {
          const latLngBounds = L.latLngBounds(bounds);
          map.fitBounds(latLngBounds, { padding: [50, 50] });
        }
      } else if (userLocationRef.current) {
        // Default view with user location available
        map.setView([userLocationRef.current.lat, userLocationRef.current.lng], 12);
      } else if (bounds.length > 0) {
        // Fallback to center of markers if no user location
        const latLngBounds = L.latLngBounds(bounds);
        const center = latLngBounds.getCenter();
        const maxDist = Math.max(
          Math.abs(latLngBounds.getNorth() - latLngBounds.getSouth()),
          Math.abs(latLngBounds.getEast() - latLngBounds.getWest())
        );

        if (maxDist > 4) {
          map.fitBounds(latLngBounds, { padding: [50, 50] });
        } else {
          map.setView(center, 12);
        }
      } else {
        map.setView([20.5937, 78.9629], 5);
      }
    } catch (error) {
      console.error('Failed to update map markers:', error);
    }
  };

  return (
    <div style={{ background: '#111827', padding: '24px', borderRadius: '12px', color: 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, marginBottom: '8px', color: '#ffffff', fontFamily: 'Inter, sans-serif' }}>Problem Hotspots Map</h1>
          <p style={{ color: '#8b92a5', margin: 0, fontSize: '0.95rem' }}>Bubble size and color intensity increase with repeated complaints in the same area.</p>
        </div>
        <div style={{ color: '#8b92a5', fontSize: '0.9rem' }}>
          {stats.total} hotspot cluster(s)
        </div>
      </div>

      {/* Map */}
      <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #1f2937', marginBottom: '20px' }}>
        <div ref={mapRef} style={{ height: 600, background: '#E8EAF6' }}>
          {!window.L && (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
              <div className="loading-spinner" style={{ width: 36, height: 36, borderColor: '#374151', borderTopColor: '#3b82f6' }} />
              <p style={{ color: '#8b92a5' }}>Loading map...</p>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'center', color: '#8b92a5', fontSize: '0.9rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 14, height: 14, background: '#10B981', borderRadius: '50%' }}></div> Low
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 14, height: 14, background: '#FBBF24', borderRadius: '50%' }}></div> Medium
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 14, height: 14, background: '#F97316', borderRadius: '50%' }}></div> High
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 14, height: 14, background: '#EF4444', borderRadius: '50%' }}></div> Critical
        </div>
      </div>

      <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #1f2937', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <select style={{ background: '#1f2937', color: 'white', border: '1px solid #374151', borderRadius: '6px', padding: '8px 12px' }} value={filters.state_id} onChange={e => setFilters(p => ({ ...p, state_id: e.target.value }))}>
          <option value="">All States</option>
          {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select style={{ background: '#1f2937', color: 'white', border: '1px solid #374151', borderRadius: '6px', padding: '8px 12px' }} value={filters.category} onChange={e => setFilters(p => ({ ...p, category: e.target.value }))}>
          <option value="">All Categories</option>
          {Object.keys(CATEGORY_COLORS).map(c => (
            <option key={c} value={c}>{c.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())}</option>
          ))}
        </select>
        <select style={{ background: '#1f2937', color: 'white', border: '1px solid #374151', borderRadius: '6px', padding: '8px 12px' }} value={filters.days} onChange={e => setFilters(p => ({ ...p, days: e.target.value }))}>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">Last 1 year</option>
        </select>
        <button
          onClick={loadHotspots}
          disabled={loading}
          style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', padding: '8px 16px', cursor: 'pointer' }}
        >
          {loading ? '🔄 Loading...' : '🔄 Refresh'}
        </button>
      </div>
    </div>
  );
}
