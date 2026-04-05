import { create } from 'zustand';
import { organizationAPI } from '../services/api';
import { registerStoreReset } from './authStore';

const initialState = { organizations: [], currentOrg: null, isLoading: false };

const useOrganizationStore = create((set) => {
  registerStoreReset(() => set(initialState));
  return {
  ...initialState,

  fetchOrganizations: async () => {
    set({ isLoading: true });
    try {
      const res = await organizationAPI.get();
      const data = res.data?.data || res.data || [];
      set({ organizations: Array.isArray(data) ? data : [data], isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchOrgById: async (id) => {
    set({ isLoading: true });
    try {
      const res = await organizationAPI.getById(id);
      set({ currentOrg: res.data?.data || res.data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  createOrg: async (data) => {
    try {
      const res = await organizationAPI.create(data);
      const org = res.data?.data || res.data;
      set((s) => ({ organizations: [...s.organizations, org] }));
      return { success: true, org };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Failed' };
    }
  },

  updateOrg: async (id, data) => {
    try {
      const res = await organizationAPI.update(id, data);
      const org = res.data?.data || res.data;
      set((s) => ({
        organizations: s.organizations.map((o) => (o._id === id ? org : o)),
        currentOrg: org,
      }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Failed' };
    }
  },

  deleteOrg: async (id) => {
    try {
      await organizationAPI.delete(id);
      set((s) => ({
        organizations: s.organizations.filter((o) => o._id !== id),
        currentOrg: null,
      }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Failed to delete organization' };
    }
  },
  };
});

export default useOrganizationStore;
