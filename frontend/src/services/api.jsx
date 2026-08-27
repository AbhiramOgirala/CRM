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

      const specificLocal = [
        addr.suburb,
        addr.neighbourhood,
        addr.road,
        addr.county,
        addr.village,
        addr.town,
        addr.hamlet,
        addr.quarter
      ].filter(Boolean).map(s => String(s).toLowerCase().replace(/mandal|block|taluka|colony|road|nagar|village/gi, '').trim()).filter(s => s.length >= 3);

      const allText = (d.display_name || '').toLowerCase();
      const districtName = (addr.state_district || addr.city || addr.county || '').toLowerCase();

      const statesRes = await locationAPI.getStates();
      const allStates = statesRes.states || [];
      
      let matchedState = allStates.find(s => {
        const sName = s.name.toLowerCase();
        return (addr.state && addr.state.toLowerCase().includes(sName)) || allText.includes(sName);
      });

      if (!matchedState) {
        if (allText.includes('hyderabad') || allText.includes('telangana')) {
          matchedState = allStates.find(s => s.name === 'Telangana');
        } else if (allText.includes('mumbai') || allText.includes('maharashtra')) {
          matchedState = allStates.find(s => s.name === 'Maharashtra');
        } else if (allText.includes('kolkata') || allText.includes('west bengal')) {
          matchedState = allStates.find(s => s.name === 'West Bengal');
        } else if (allText.includes('bengaluru') || allText.includes('karnataka')) {
          matchedState = allStates.find(s => s.name === 'Karnataka');
        } else if (allText.includes('delhi')) {
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

      const scoreMandal = (mName) => {
        const clean = mName.toLowerCase().trim();
        if (clean.length < 3) return 0;
        let score = 0;
        for (const loc of specificLocal) {
          if (loc === clean) score = Math.max(score, 1000);
          else if (loc.length >= 4 && (loc.includes(clean) || clean.includes(loc))) score = Math.max(score, 800);
        }
        if (allText.includes(clean)) {
          score = Math.max(score, 400);
        }
        // If it only matches because of district name, downgrade score
        if (score > 0 && districtName.includes(clean) && !specificLocal.some(l => l.includes(clean))) {
          score = 50;
        }
        return score;
      };

      let bestMatch = null;
      let maxScore = 0;

      for (const dist of districtData) {
        const distClean = dist.name.toLowerCase().trim();
        const distScore = (districtName.includes(distClean) || allText.includes(distClean)) ? 100 : 0;

        for (const tal of dist.talukas) {
          const talClean = tal.name.toLowerCase().trim();
          const talScore = (allText.includes(talClean) || specificLocal.some(l => l.includes(talClean))) ? 200 : 0;

          for (const mandal of tal.mandals) {
            const mScore = scoreMandal(mandal.name);
            const total = mScore * 10 + talScore + distScore;
            if (total > maxScore && mScore > 0) {
              maxScore = total;
              bestMatch = {
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

      if (bestMatch) {
        return bestMatch;
      }

      // Fallback: match district
      const matchedDist = districtData.find(dist => {
        const distClean = dist.name.toLowerCase().trim();
        return districtName.includes(distClean) || allText.includes(distClean);
      });

      if (matchedDist) {
        return {
          address: addressStr || d.display_name || '',
          pincode,
          state_id: matchedState.id,
          state_name: matchedState.name,
          district_id: matchedDist.id,
          taluka_id: matchedDist.talukas[0]?.id || '',
          mandal_id: matchedDist.talukas[0]?.mandals[0]?.id || ''
        };
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
