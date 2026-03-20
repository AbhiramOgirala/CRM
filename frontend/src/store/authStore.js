import { create } from 'zustand';
import { authAPI } from '../services/api';

const safeParseUser = () => {
  try {
    const raw = localStorage.getItem('user');
    if (!raw || raw === 'undefined' || raw === 'null') return null;
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem('user');
    return null;
  }
};

const useAuthStore = create((set, get) => ({
  user: safeParseUser(),
  token: localStorage.getItem('token') || null,
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await authAPI.login({ email, password });
      if (!res?.token || !res?.user) throw new Error('Invalid server response');
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      set({ user: res.user, token: res.token, isLoading: false });
      return { success: true, role: res.user.role };
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null });
    window.location.href = '/login';
  },

  updateUser: (updatedFields) => {
    const merged = { ...get().user, ...updatedFields };
    localStorage.setItem('user', JSON.stringify(merged));
    set({ user: merged });
  },

  refreshProfile: async () => {
    if (!get().token) return;
    try {
      const res = await authAPI.getProfile();
      if (res?.user) {
        localStorage.setItem('user', JSON.stringify(res.user));
        set({ user: res.user });
      }
    } catch (err) {
      // Token expired or invalid
      if (err?.message?.includes('401') || err?.message?.includes('Invalid')) {
        get().logout();
      }
    }
  },

  isAuthenticated: () => !!(get().token && get().user),
  isCitizen: () => get().user?.role === 'citizen',
  isOfficer: () => get().user?.role === 'officer',
  isAdmin: () => ['admin', 'super_admin'].includes(get().user?.role),
  canActOnComplaint: (complaint) => {
    const u = get().user;
    if (!u) return false;
    if (u.role === 'admin' || u.role === 'super_admin') return true;
    if (u.role === 'officer') return complaint?.department_id === u.department_id;
    return false;
  }
}));

export default useAuthStore;
