import { create } from 'zustand';
import { authAPI } from '../services/api';

const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('token') || null,
  isLoading: false,
  isInitialized: false,
  error: null,

  initialize: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ isInitialized: true, user: null, token: null });
      return;
    }
    try {
      set({ isLoading: true });
      const res = await authAPI.getProfile();
      const user = res.data?.data || res.data;
      set({ user, token, isInitialized: true, isLoading: false });
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      set({ user: null, token: null, isInitialized: true, isLoading: false });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authAPI.login({ email, password });
      const { token, user } = res.data?.data || res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, token, isLoading: false, error: null });
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data?.error || 'Login failed';
      set({ isLoading: false, error: message });
      return { success: false, error: message };
    }
  },

  signup: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authAPI.signup(data);
      const { token, user } = res.data?.data || res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, token, isLoading: false, error: null });
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data?.error || 'Signup failed';
      set({ isLoading: false, error: message });
      return { success: false, error: message };
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, error: null });
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
