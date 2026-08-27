import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export const getNotificationsStreamUrl = (token) => {
  const encodedToken = encodeURIComponent(token || '');
  return `${API_URL}/notifications/stream?token=${encodedToken}`;
};

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

// ── Request interceptor: attach token ──────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle errors gracefully ─────────────────
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (!error.response) {
      // Network error / server down
      return Promise.reject(new Error('Cannot connect to server. Make sure the backend is running.'));
    }
    const status = error.response.status;
    const message = error.response.data?.error || error.response.data?.message || 'Something went wrong';

    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(new Error(message));
  }
);

// ── Auth ────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data)
};

// ── NLP ─────────────────────────────────────────────────────────────
export const nlpAPI = {
  preview: (text, state_id) => api.post('/nlp/preview', { text, state_id }),
  generateTitle: (text, category, priority) => api.post('/nlp/generate-title', { text, category, priority })
};

// ── Complaints ───────────────────────────────────────────────────────
export const complaintsAPI = {
  file: (data) => api.post('/complaints', data),
  getAll: (params) => api.get('/complaints', { params }),
  getMy: (params) => api.get('/complaints/my', { params }),
  getDeleteReasons: () => api.get('/complaints/delete-reasons'),
  getById: (id) => api.get(`/complaints/${id}`),
  deleteByCitizen: (id, data) => api.delete(`/complaints/${id}`, { data }),
  updateStatus: (id, data) => api.put(`/complaints/${id}/status`, data),
  assign: (id, data) => api.post(`/complaints/${id}/assign`, data),
  upvote: (id) => api.post(`/complaints/${id}/upvote`),
  getHotspots: (params) => api.get('/complaints/hotspots', { params }),
  getDashboard: (params) => api.get('/complaints/dashboard', { params }),
  addComment: (id, data) => api.post(`/complaints/${id}/comments`, data)
};

// ── Location ─────────────────────────────────────────────────────────
export const locationAPI = {
  getStates: () => api.get('/location/states'),
  getDistricts: (sid) => api.get(`/location/districts/${sid}`),
  getCorporations: (did) => api.get(`/location/corporations/${did}`),
  getMunicipalities: (did) => api.get(`/location/municipalities/${did}`),
  getTalukas: (did) => api.get(`/location/talukas/${did}`),
  getMandals: (tid) => api.get(`/location/mandals/${tid}`),
  getGramPanchayats: (mid) => api.get(`/location/gram-panchayats/${mid}`),
  resolveGPSLocation: async (latitude, longitude) => {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`);
      const d = await r.json();
      const addr = d.address || {};

      const addressStr = [addr.road, addr.suburb, addr.neighbourhood, addr.city || addr.town || addr.village].filter(Boolean).join(', ');
      const pincode = addr.postcode || '';

      const searchTerms = new Set();
      Object.values(addr).forEach(val => {
        if (val) {
          searchTerms.add(String(val).toLowerCase());
          String(val).toLowerCase().split(/[\s\-]/).forEach(t => {
            if (t && t.length > 2) searchTerms.add(t);
          });
        }
      });
      if (d.display_name) {
        d.display_name.split(',').forEach(p => {
          const clean = p.trim().toLowerCase();
          if (clean) {
            searchTerms.add(clean);
            clean.split(/[\s\-]/).forEach(t => {
              if (t && t.length > 2) searchTerms.add(t);
            });
          }
        });
      }

      const hasTerm = (name) => {
        if (!name) return false;
        const norm = name.toLowerCase();
        for (const term of searchTerms) {
          if (term.includes(norm) || norm.includes(term)) return true;
        }
        return false;
      };

      const statesRes = await locationAPI.getStates();
      const allStates = statesRes.states || [];
      let matchedState = allStates.find(s => hasTerm(s.name));

      if (!matchedState) {
        const fullTxt = JSON.stringify(addr).toLowerCase();
        if (fullTxt.includes('hyderabad') || fullTxt.includes('telangana')) {
          matchedState = allStates.find(s => s.name === 'Telangana');
        } else if (fullTxt.includes('mumbai') || fullTxt.includes('maharashtra')) {
          matchedState = allStates.find(s => s.name === 'Maharashtra');
        } else if (fullTxt.includes('kolkata') || fullTxt.includes('west bengal')) {
          matchedState = allStates.find(s => s.name === 'West Bengal');
        } else if (fullTxt.includes('bengaluru') || fullTxt.includes('karnataka')) {
          matchedState = allStates.find(s => s.name === 'Karnataka');
        } else if (fullTxt.includes('delhi')) {
          matchedState = allStates.find(s => s.name === 'Delhi');
        }
      }

      if (!matchedState) {
        return { address: addressStr || d.display_name || '', pincode };
      }

      const distRes = await locationAPI.getDistricts(matchedState.id);
      const districts = distRes.districts || [];

      const districtData = await Promise.all(
        districts.map(async (dist) => {
          const tRes = await locationAPI.getTalukas(dist.id);
          const talukas = tRes.talukas || [];
          const talukaData = await Promise.all(
            talukas.map(async (tal) => {
              const mRes = await locationAPI.getMandals(tal.id);
              return {
                ...tal,
                mandals: mRes.mandals || []
              };
            })
          );
          return {
            ...dist,
            talukas: talukaData
          };
        })
      );

      for (const dist of districtData) {
        for (const tal of dist.talukas) {
          for (const mandal of tal.mandals) {
            if (hasTerm(mandal.name)) {
              return {
                address: addressStr || d.display_name || '',
                pincode,
                state_id: matchedState.id,
                state_name: matchedState.name,
                district_id: dist.id,
                taluka_id: tal.id,
                mandal_id: mandal.id
              };
            }
          }
        }
      }

      for (const dist of districtData) {
        for (const tal of dist.talukas) {
          if (hasTerm(tal.name)) {
            return {
              address: addressStr || d.display_name || '',
              pincode,
              state_id: matchedState.id,
              state_name: matchedState.name,
              district_id: dist.id,
              taluka_id: tal.id
            };
          }
        }
      }

      for (const dist of districtData) {
        if (hasTerm(dist.name)) {
          return {
            address: addressStr || d.display_name || '',
            pincode,
            state_id: matchedState.id,
            state_name: matchedState.name,
            district_id: dist.id
          };
        }
      }

      return {
        address: addressStr || d.display_name || '',
        pincode,
        state_id: matchedState.id,
        state_name: matchedState.name
      };
    } catch (err) {
      console.error('[resolveGPSLocation error]', err);
      return { address: '', pincode: '' };
    }
  }
};


// ── Leaderboard ───────────────────────────────────────────────────────
export const leaderboardAPI = {
  getCitizens: (params) => api.get('/leaderboard/citizens', { params }),
  getDepts: () => api.get('/leaderboard/departments'),
  getOfficers: (params) => api.get('/leaderboard/officers', { params }),
  getArea: (params) => api.get('/leaderboard/area', { params }),
  getDistrict: (params) => api.get('/leaderboard/district', { params })
};

// ── Notifications ─────────────────────────────────────────────────────
export const notificationsAPI = {
  getAll:    (params) => api.get('/notifications', { params }),
  markRead:  (data)   => api.put('/notifications/read', data),
  clear:     ()       => api.delete('/notifications'),
  delete:    (id)     => api.delete(`/notifications/${id}`)
};

// ── Admin ─────────────────────────────────────────────────────────────
export const adminAPI = {
  getUsers: (params) => api.get('/admin/users', { params }),
  createOfficer: (data) => api.post('/admin/officers', data),
  toggleStatus: (id) => api.put(`/admin/users/${id}/toggle-status`),
  assignDept: (id, d) => api.put(`/admin/users/${id}/department`, d),
  getDepartments: () => api.get('/admin/departments'),
  getStats: () => api.get('/admin/stats'),
  getEscalated: () => api.get('/admin/escalated')
};

export default api;
