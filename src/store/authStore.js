import { create } from 'zustand';
import { authAPI } from '../services/api';

// Collect all store reset functions so logout can wipe every store at once
const storeResetFns = new Set();
export const registerStoreReset = (fn) => storeResetFns.add(fn);
const resetAllStores = () => storeResetFns.forEach((fn) => fn());

// Helper: fetch subscription plan and attach to store
async function fetchAndSetSubscription(set) {
  try {
    const res = await authAPI.getSubscription();
    const sub = res.data?.data || res.data;
    const plan = sub?.plan || 'free';
    localStorage.setItem('subscription_plan', plan);
    set({ subscriptionPlan: plan });
  } catch {
    // fall back to cached value or free
    const cached = localStorage.getItem('subscription_plan') || 'free';
    set({ subscriptionPlan: cached });
  }
}

const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('token') || null,
  subscriptionPlan: localStorage.getItem('subscription_plan') || 'free',
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
      // Always re-fetch subscription for superadmin to ensure localStorage is fresh
      if (user?.role === 'superadmin') {
        fetchAndSetSubscription(set);
      } else {
        // Non-superadmin roles don't have subscriptions — mark as pro so no upgrade UI shown
        set({ subscriptionPlan: 'pro' });
      }
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
      const { token, user, subscription } = res.data?.data || res.data;
      const plan = subscription?.plan || 'free';
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('subscription_plan', plan);
      set({ user, token, subscriptionPlan: plan, isLoading: false, error: null });
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
      const { token, user, subscription } = res.data?.data || res.data;
      const plan = subscription?.plan || 'free';
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('subscription_plan', plan);
      set({ user, token, subscriptionPlan: plan, isLoading: false, error: null });
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data?.error || 'Signup failed';
      set({ isLoading: false, error: message });
      return { success: false, error: message };
    }
  },

  // OTP-based signup: verifies OTP and logs the user in
  signupVerifyOtp: async (email, otp) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authAPI.signupVerifyOtp({ email, otp });
      const { token, user, subscription } = res.data?.data || res.data;
      const plan = subscription?.plan || 'free';
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('subscription_plan', plan);
      set({ user, token, subscriptionPlan: plan, isLoading: false, error: null });
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data?.error || 'Verification failed';
      set({ isLoading: false, error: message });
      return { success: false, error: message };
    }
  },

  refreshProfile: async () => {
    try {
      const res = await authAPI.getProfile();
      const user = res.data?.data || res.data;
      set({ user });
      return user;
    } catch {
      return null;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('subscription_plan');
    resetAllStores();
    set({ user: null, token: null, subscriptionPlan: 'free', error: null });
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
