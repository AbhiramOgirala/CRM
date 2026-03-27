import React, { useState, useEffect, useRef, useMemo } from 'react';
import { complaintsAPI, locationAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const CATEGORY_COLORS = {
  roads: '#E65100', water_supply: '#0277BD', electricity: '#F9A825',
  waste_management: '#558B2F', drainage: '#00838F', infrastructure: '#6A1B9A',
  parks: '#2E7D32', health: '#C62828', education: '#283593',
  street_lights: '#FF6F00', other: '#546E7A'
};

export default function HotspotMap() {
  const { user } = useAuthStore();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const nearbyCircleRef = useRef(null);
  const [hotspots, setHotspots] = useState([]);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [filters, setFilters] = useState({ state_id: '', district_id: '', category: '', days: 30 });
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, byCategory: {} });
  const [error, setError] = useState(null);
  const [totalComplaints, setTotalComplaints] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const [loadedStateFilter, setLoadedStateFilter] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [nearbyRadiusKm, setNearbyRadiusKm] = useState(10);
  const [detectedStateName, setDetectedStateName] = useState('');
  const [detectedStateId, setDetectedStateId] = useState('');

  const normalizeStateName = (name) => String(name || '')
    .toLowerCase()
    .replace(/union territory|nct of|state|ut|&/g, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const haversineKm = (lat1, lon1, lat2, lon2) => {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const deltaLat = toRad(lat2 - lat1);
    const deltaLon = toRad(lon2 - lon1);
    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const displayedHotspots = useMemo(() => {
    if (!nearbyOnly || !userLocation) return hotspots;
    return hotspots.filter(h => {
      const latitude = Number(h.latitude);
      const longitude = Number(h.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
      return haversineKm(userLocation.lat, userLocation.lng, latitude, longitude) <= nearbyRadiusKm;
    });
  }, [hotspots, nearbyOnly, userLocation, nearbyRadiusKm]);

  const displayedCategoryStats = useMemo(() => {
    const byCategory = {};
    displayedHotspots.forEach(h => {
      byCategory[h.category] = (byCategory[h.category] || 0) + 1;
    });
    return byCategory;
  }, [displayedHotspots]);

  useEffect(() => {
    locationAPI.getStates()
      .then(r => setStates(r.states || []))
      .catch(error => {
        console.error('Failed to load states:', error);
        setStates([]);
      });
    
    // Small delay to ensure DOM is ready
    const timer = setTimeout(initMap, 100);

    // Handle container resize automatically
    const resizeObserver = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
        }
    });
    
    if (mapRef.current) {
        resizeObserver.observe(mapRef.current);
    }

    // Force updates on window events
    const forceUpdate = () => {
        if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
    };
    window.addEventListener('resize', forceUpdate);
    window.addEventListener('orientationchange', forceUpdate);
    
    return () => {
        clearTimeout(timer);
        resizeObserver.disconnect();
        window.removeEventListener('resize', forceUpdate);
        window.removeEventListener('orientationchange', forceUpdate);
        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
            setMapReady(false);
        }
        userMarkerRef.current = null;
        nearbyCircleRef.current = null;
    };
  }, []);

  // Auto-load user's registered location when logged in
  useEffect(() => {
    if (user && mapReady && states.length > 0) {
      loadUserRegisteredLocation();
    }
  }, [user, mapReady, states]);

  // Sync map markers whenever hotspots change or map becomes ready
  useEffect(() => {
    if (mapReady) {
      updateMapMarkers(displayedHotspots);
    }
  }, [mapReady, displayedHotspots, userLocation, nearbyOnly, nearbyRadiusKm]);

  useEffect(() => {
    if (!mapReady || !filters.state_id || !hotspots.length) return;
    if ((filters.state_id || '') !== loadedStateFilter) return;

    const selectedState = states.find(s => String(s.id) === String(filters.state_id));
    const stateLat = Number(selectedState?.center_lat ?? selectedState?.latitude ?? selectedState?.lat);
    const stateLng = Number(selectedState?.center_lng ?? selectedState?.longitude ?? selectedState?.lng);

    const map = mapInstanceRef.current;
    if (!map) return;

    if (Number.isFinite(stateLat) && Number.isFinite(stateLng)) {
      map.flyTo([stateLat, stateLng], 7, { duration: 0.8 });
      return;
    }

    const validCoords = hotspots
      .map(h => ({ lat: Number(h.latitude), lng: Number(h.longitude) }))
      .filter(c => Number.isFinite(c.lat) && Number.isFinite(c.lng));

    if (!validCoords.length) return;

    const avgLat = validCoords.reduce((sum, c) => sum + c.lat, 0) / validCoords.length;
    const avgLng = validCoords.reduce((sum, c) => sum + c.lng, 0) / validCoords.length;
    map.flyTo([avgLat, avgLng], 7, { duration: 0.8 });
  }, [mapReady, filters.state_id, hotspots, loadedStateFilter, states]);

  useEffect(() => {
    loadHotspots();
  }, [filters]);

  // Load districts when state changes
  useEffect(() => {
    if (filters.state_id) {
      locationAPI.getDistricts(filters.state_id)
        .then(r => setDistricts(r.districts || []))
        .catch(error => {
          console.error('Failed to load districts:', error);
          setDistricts([]);
        });
    } else {
      setDistricts([]);
      setFilters(prev => ({ ...prev, district_id: '' }));
    }
  }, [filters.state_id]);

  const initMap = () => {
    if (mapInstanceRef.current || !mapRef.current) return;
    setupMap();
  };

  const setupMap = () => {
    if (!mapRef.current) return;
    if (mapInstanceRef.current) return; // Map already initialized

    try {
      const map = L.map(mapRef.current, {
        zoomControl: false, // Reposition later for better mobile UX
        attributionControl: false,
        zoomAnimation: true,
        fadeAnimation: true,
        markerZoomAnimation: true
      }).setView([20.5937, 78.9629], 5);

      L.control.zoom({ position: 'bottomright' }).addTo(map);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
        tileSize: 256,
        zoomOffset: 0
      }).addTo(map);
      
      mapInstanceRef.current = map;

      // Force initial invalidateSize to ensure tiles render
      setTimeout(() => { 
        if (map) map.invalidateSize(); 
      }, 500);

      // Signal map is ready
      setMapReady(true);
    } catch (error) {
      console.error('Failed to initialize map:', error);
      setError('Failed to initialize map. Please refresh the page.');
    }
  };

  const loadHotspots = async () => {
    setLoading(true);
    setError(null);
    const activeFilters = { ...filters };
    try {
      console.log('Loading hotspots with filters:', activeFilters);

      // Load both hotspots and total complaints for comparison
      const [hotspotsRes, dashboardRes] = await Promise.all([
        complaintsAPI.getHotspots(activeFilters),
        complaintsAPI.getDashboard()
      ]);

      console.log('Hotspots API response:', hotspotsRes);
      const data = hotspotsRes.hotspots || [];
      setHotspots(data);
      setLoadedStateFilter(activeFilters.state_id || '');
      setTotalComplaints(dashboardRes.stats?.total || 0);

      // Update stats
      const byCategory = {};
      data.forEach(h => { byCategory[h.category] = (byCategory[h.category] || 0) + 1; });
      setStats({ total: data.length, byCategory });

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
    const map = mapInstanceRef.current;
    if (!map) return;

    try {
      // Remove existing markers
      markersRef.current.forEach(m => map.removeLayer(m));
      markersRef.current = [];
      if (userMarkerRef.current) {
        map.removeLayer(userMarkerRef.current);
        userMarkerRef.current = null;
      }
      if (nearbyCircleRef.current) {
        map.removeLayer(nearbyCircleRef.current);
        nearbyCircleRef.current = null;
      }

      data.forEach(h => {
        if (!h.latitude || !h.longitude) return;
        const color = CATEGORY_COLORS[h.category] || '#546E7A';
        const prioritySize = { critical: 16, high: 14, medium: 12, low: 10 };
        const size = prioritySize[h.priority] || 10;
        const markerSize = size + 4;
        const latitude = Number(h.latitude);
        const longitude = Number(h.longitude);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

        // Mobile-safe marker icon via inline SVG data URL
        const svgMarkup = `
          <svg xmlns="http://www.w3.org/2000/svg" width="${markerSize}" height="${markerSize}" viewBox="0 0 ${markerSize} ${markerSize}">
            <circle cx="${markerSize / 2}" cy="${markerSize / 2}" r="${size / 2}" fill="${color}" stroke="#ffffff" stroke-width="2" />
          </svg>
        `;

        const icon = L.icon({
          iconUrl: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgMarkup)}`,
          iconSize: [markerSize, markerSize],
          iconAnchor: [markerSize / 2, markerSize / 2],
          popupAnchor: [0, -markerSize / 2],
          className: 'hotspot-marker-icon'
        });

        const marker = L.marker([latitude, longitude], { icon })
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

      if (userLocation) {
        const userMarker = L.circleMarker([userLocation.lat, userLocation.lng], {
          radius: 7,
          color: '#ffffff',
          weight: 2,
          fillColor: '#1A237E',
          fillOpacity: 1
        }).bindPopup(user ? '📍 Your registered location' : '📍 Your current location');

        userMarker.addTo(map);
        userMarkerRef.current = userMarker;

        if (nearbyOnly) {
          const nearbyCircle = L.circle([userLocation.lat, userLocation.lng], {
            radius: nearbyRadiusKm * 1000,
            color: '#1A237E',
            weight: 1,
            fillColor: '#1A237E',
            fillOpacity: 0.08
          });
          nearbyCircle.addTo(map);
          nearbyCircleRef.current = nearbyCircle;
        }
      }

      // Fit map to bounds of all markers
      if (markersRef.current.length > 0) {
        const group = L.featureGroup(markersRef.current);
        map.fitBounds(group.getBounds(), { padding: [50, 50] });
      } else if (userLocation) {
        map.setView([userLocation.lat, userLocation.lng], 11);
      }

      // Force map update for mobile rendering
      setTimeout(() => { 
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 500); // Increased timeout to ensure layout is settled
    } catch (error) {
      console.error('Failed to update map markers:', error);
    }
  };

  const focusDetectedStateCenter = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const targetStateId = detectedStateId || filters.state_id;
    if (!targetStateId) {
      if (userLocation) map.flyTo([userLocation.lat, userLocation.lng], 10, { duration: 0.8 });
      return;
    }

    const selectedState = states.find(s => String(s.id) === String(targetStateId));
    const stateLat = Number(selectedState?.center_lat ?? selectedState?.latitude ?? selectedState?.lat);
    const stateLng = Number(selectedState?.center_lng ?? selectedState?.longitude ?? selectedState?.lng);

    if (Number.isFinite(stateLat) && Number.isFinite(stateLng)) {
      map.flyTo([stateLat, stateLng], 7, { duration: 0.8 });
      return;
    }

    if (hotspots.length > 0) {
      const group = L.featureGroup(
        hotspots
          .map(h => {
            const latitude = Number(h.latitude);
            const longitude = Number(h.longitude);
            return Number.isFinite(latitude) && Number.isFinite(longitude)
              ? L.marker([latitude, longitude])
              : null;
          })
          .filter(Boolean)
      );
      if (group.getLayers().length > 0) {
        map.fitBounds(group.getBounds(), { padding: [50, 50] });
      }
    }
  };

  const detectStateFromCoordinates = async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=5&addressdetails=1`
      );
      const payload = await response.json();
      const rawState = payload?.address?.state || payload?.address?.state_district || '';
      if (!rawState) return;

      setDetectedStateName(rawState);
      const normalizedRaw = normalizeStateName(rawState);
      const matchedState = states.find(s => {
        const normalizedState = normalizeStateName(s.name);
        return normalizedState === normalizedRaw || normalizedState.includes(normalizedRaw) || normalizedRaw.includes(normalizedState);
      });

      if (!matchedState) return;

      setDetectedStateId(String(matchedState.id));
      setFilters(prev => ({ ...prev, state_id: String(matchedState.id) }));
    } catch (reverseError) {
      console.warn('Could not detect state from current location:', reverseError);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported on this device/browser.');
      return;
    }

    setLocationLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const location = { lat: latitude, lng: longitude };

        setUserLocation(location);
        setNearbyOnly(true);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 11, { duration: 0.8 });
        }

        await detectStateFromCoordinates(latitude, longitude);
        setLocationLoading(false);
      },
      () => {
        setError('Unable to fetch current location. Please allow location permission and try again.');
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  };

  const loadUserRegisteredLocation = async () => {
    if (!user) return;

    // Set user's registered state as filter
    if (user.state_id) {
      setFilters(prev => ({ ...prev, state_id: String(user.state_id) }));
    }

    // Try to geocode user's registered address
    if (user.address || user.pincode) {
      try {
        setLocationLoading(true);

        // Build search query from user's registration data
        const addressParts = [];
        if (user.address) addressParts.push(user.address);
        if (user.pincode) addressParts.push(user.pincode);

        // Add district and state names if available
        if (user.district_id) {
          const district = await locationAPI.getDistricts(user.state_id);
          const districtData = district.districts?.find(d => String(d.id) === String(user.district_id));
          if (districtData?.name) addressParts.push(districtData.name);
        }

        if (user.state_id) {
          const stateName = states.find(s => String(s.id) === String(user.state_id))?.name;
          if (stateName) addressParts.push(stateName);
        }

        addressParts.push('India');

        const searchQuery = addressParts.join(', ');

        // Geocode the address
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
        );
        const results = await response.json();

        if (results && results.length > 0) {
          const latitude = parseFloat(results[0].lat);
          const longitude = parseFloat(results[0].lon);

          if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
            const location = { lat: latitude, lng: longitude };
            setUserLocation(location);

            // Center map on user's registered location
            if (mapInstanceRef.current) {
              mapInstanceRef.current.flyTo([latitude, longitude], 11, { duration: 0.8 });
            }
          }
        }

        setLocationLoading(false);
      } catch (error) {
        console.error('Failed to geocode user address:', error);
        setLocationLoading(false);

        // Fallback: try to center on state if geocoding fails
        if (user.state_id && mapInstanceRef.current) {
          const selectedState = states.find(s => String(s.id) === String(user.state_id));
          const stateLat = Number(selectedState?.center_lat ?? selectedState?.latitude ?? selectedState?.lat);
          const stateLng = Number(selectedState?.center_lng ?? selectedState?.longitude ?? selectedState?.lng);

          if (Number.isFinite(stateLat) && Number.isFinite(stateLng)) {
            mapInstanceRef.current.flyTo([stateLat, stateLng], 7, { duration: 0.8 });
          }
        }
      }
    } else if (user.state_id && mapInstanceRef.current) {
      // No address, just center on state
      const selectedState = states.find(s => String(s.id) === String(user.state_id));
      const stateLat = Number(selectedState?.center_lat ?? selectedState?.latitude ?? selectedState?.lat);
      const stateLng = Number(selectedState?.center_lng ?? selectedState?.longitude ?? selectedState?.lng);

      if (Number.isFinite(stateLat) && Number.isFinite(stateLng)) {
        mapInstanceRef.current.flyTo([stateLat, stateLng], 7, { duration: 0.8 });
      }
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Complaint Hotspot Map</h1>
          <p className="page-subtitle">Geographic distribution of civic complaints</p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div style={{
          background: '#ffebee',
          color: '#c62828',
          padding: '12px',
          borderRadius: 'var(--radius)',
          marginBottom: '16px',
          border: '1px solid #ffcdd2'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Empty state message */}
      {!loading && !error && displayedHotspots.length === 0 && (
        <div style={{
          background: '#f5f5f5',
          color: '#666',
          padding: '20px',
          borderRadius: 'var(--radius)',
          marginBottom: '16px',
          textAlign: 'center',
          border: '1px solid #e0e0e0'
        }}>
          📍 {nearbyOnly ? 'No nearby hotspots found for your current location.' : 'No complaint hotspots found for the selected filters.'}<br />
          Try adjusting the time range, location filters, or nearby radius.<br />
          <small style={{ fontSize: '0.75rem', marginTop: '8px', display: 'block' }}>
            Note: Only complaints with GPS coordinates are shown on the map.
          </small>
        </div>
      )}

      {/* Filters */}
      <div className="filter-bar">
        <select className="form-control" value={filters.state_id} onChange={e => setFilters(p => ({ ...p, state_id: e.target.value, district_id: '' }))}>
          <option value="">All States</option>
          {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select 
          className="form-control" 
          value={filters.district_id} 
          onChange={e => setFilters(p => ({ ...p, district_id: e.target.value }))}
          disabled={!filters.state_id}
        >
          <option value="">All Districts</option>
          {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
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
        <button
          className="btn btn-primary"
          onClick={loadHotspots}
          disabled={loading}
          style={{ minWidth: '100px' }}
        >
          {loading ? '🔄 Loading...' : '🔄 Refresh'}
        </button>
        <button
          className="btn"
          onClick={useCurrentLocation}
          disabled={locationLoading}
          style={{ minWidth: '180px', border: '1px solid var(--border)' }}
        >
          {locationLoading ? '📍 Locating...' : '📍 Use GPS Location'}
        </button>
        {user && (user.address || user.pincode || user.state_id) && (
          <button
            className="btn"
            onClick={loadUserRegisteredLocation}
            disabled={locationLoading}
            style={{ minWidth: '180px', border: '1px solid var(--border)', background: 'var(--primary-light)', color: 'var(--primary)' }}
          >
            {locationLoading ? '📍 Loading...' : '🏠 My Registered Location'}
          </button>
        )}
        <button
          className="btn"
          onClick={focusDetectedStateCenter}
          disabled={!detectedStateId && !filters.state_id}
          style={{ minWidth: '150px', border: '1px solid var(--border)' }}
        >
          🗺️ Focus My State
        </button>
        <select
          className="form-control"
          value={nearbyRadiusKm}
          onChange={e => setNearbyRadiusKm(Number(e.target.value))}
          disabled={!userLocation}
        >
          <option value={5}>Nearby (5 km)</option>
          <option value={10}>Nearby (10 km)</option>
          <option value={20}>Nearby (20 km)</option>
          <option value={30}>Nearby (30 km)</option>
        </select>
        <button
          className="btn"
          onClick={() => setNearbyOnly(prev => !prev)}
          disabled={!userLocation}
          style={{ minWidth: '130px', border: '1px solid var(--border)' }}
        >
          {nearbyOnly ? '✅ Nearby On' : 'Nearby Off'}
        </button>
        {loading && <div className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />}
      </div>

      {(detectedStateName || userLocation) && (
        <div style={{ marginBottom: 10, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          {user && userLocation && !detectedStateName && (
            <span style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '4px 10px', borderRadius: 4, marginRight: 8 }}>
              📍 Map centered on your registered location
              {user.district_id && districts.length > 0 && (
                <span> ({districts.find(d => String(d.id) === String(user.district_id))?.name || 'District'})</span>
              )}
            </span>
          )}
          {detectedStateName && <span>Detected state: <strong>{detectedStateName}</strong>. </span>}
          {userLocation && <span>Current location mode is active{nearbyOnly ? ` (${nearbyRadiusKm} km radius).` : '.'}</span>}
        </div>
      )}

      {/* Stats strip */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <span style={{ background: 'var(--secondary)', color: 'white', borderRadius: 20, padding: '4px 14px', fontSize: '0.8rem', fontWeight: 700 }}>
          📍 {displayedHotspots.length} of {totalComplaints} complaints shown (with GPS)
        </span>
        {Object.entries(displayedCategoryStats).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([cat, count]) => (
          <span key={cat} style={{ background: CATEGORY_COLORS[cat] + '20', color: CATEGORY_COLORS[cat], borderRadius: 20, padding: '4px 12px', fontSize: '0.75rem', fontWeight: 700, border: `1px solid ${CATEGORY_COLORS[cat]}40` }}>
            {cat.replace(/_/g, ' ')}: {count}
          </span>
        ))}
      </div>

      <div style={{ 
        height: '65vh', 
        minHeight: '400px', 
        width: '100%', 
        borderRadius: 'var(--radius)', 
        overflow: 'hidden', 
        border: '1px solid var(--border)', 
        marginTop: '16px',
        background: '#E8EAF6',
        position: 'relative',
        zIndex: 0
      }}>
        <div
          ref={mapRef}
          style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
          role="application"
          aria-label="Interactive hotspot map showing civic complaint locations across India"
        />
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
          🔴 Larger dots = Higher priority complaints | Click on a dot to see details<br />
          📍 Complaints are automatically located using their address information<br />
          💡 New complaints filed with addresses will appear on the map automatically
        </div>
      </div>
    </div>
  );
}
