import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

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
  register:       (data) => api.post('/auth/register', data),
  login:          (data) => api.post('/auth/login', data),
  getProfile:     ()     => api.get('/auth/profile'),
  updateProfile:  (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data)
};

// ── NLP ─────────────────────────────────────────────────────────────
export const nlpAPI = {
  preview: (text) => api.post('/nlp/preview', { text })
};

// ── Complaints ───────────────────────────────────────────────────────
export const complaintsAPI = {
  file:           (data)         => api.post('/complaints', data),
  getAll:         (params)       => api.get('/complaints', { params }),
  getMy:          (params)       => api.get('/complaints/my', { params }),
  getById:        (id)           => api.get(`/complaints/${id}`),
  updateStatus:   (id, data)     => api.put(`/complaints/${id}/status`, data),
  assign:         (id, data)     => api.post(`/complaints/${id}/assign`, data),
  upvote:         (id)           => api.post(`/complaints/${id}/upvote`),
  getHotspots:    (params)       => api.get('/complaints/hotspots', { params }),
  getDashboard:   (params)       => api.get('/complaints/dashboard', { params }),
  addComment:     (id, data)     => api.post(`/complaints/${id}/comments`, data)
};

// ── Location ─────────────────────────────────────────────────────────
export const locationAPI = {
  getStates:         ()    => api.get('/location/states'),
  getDistricts:      (sid) => api.get(`/location/districts/${sid}`),
  getCorporations:   (did) => api.get(`/location/corporations/${did}`),
  getMunicipalities: (did) => api.get(`/location/municipalities/${did}`),
  getTalukas:        (did) => api.get(`/location/talukas/${did}`),
  getMandals:        (tid) => api.get(`/location/mandals/${tid}`),
  getGramPanchayats: (mid) => api.get(`/location/gram-panchayats/${mid}`)
};

// ── Leaderboard ───────────────────────────────────────────────────────
export const leaderboardAPI = {
  getCitizens:  (params) => api.get('/leaderboard/citizens', { params }),
  getDepts:     ()       => api.get('/leaderboard/departments'),
  getOfficers:  (params) => api.get('/leaderboard/officers', { params }),
  getArea:      (params) => api.get('/leaderboard/area', { params }),
  getDistrict:  (params) => api.get('/leaderboard/district', { params })
};

// ── Notifications ─────────────────────────────────────────────────────
export const notificationsAPI = {
  getAll:    (params) => api.get('/notifications', { params }),
  markRead:  (data)   => api.put('/notifications/read', data),
  delete:    (id)     => api.delete(`/notifications/${id}`)
};

// ── Admin ─────────────────────────────────────────────────────────────
export const adminAPI = {
  getUsers:        (params) => api.get('/admin/users', { params }),
  createOfficer:   (data)   => api.post('/admin/officers', data),
  toggleStatus:    (id)     => api.put(`/admin/users/${id}/toggle-status`),
  assignDept:      (id, d)  => api.put(`/admin/users/${id}/department`, d),
  getDepartments:  ()       => api.get('/admin/departments'),
  getStats:        ()       => api.get('/admin/stats'),
  getEscalated:    ()       => api.get('/admin/escalated')
};

export default api;
