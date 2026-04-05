import { create } from 'zustand';
import { clientAPI } from '../services/api';
import { registerStoreReset } from './authStore';

const initialState = { clients: [], currentClient: null, isLoading: false, error: null };

const useClientStore = create((set) => {
  registerStoreReset(() => set(initialState));
  return {
  ...initialState,

  fetchClients: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const res = await clientAPI.getAll(params);
      const clients = res.data?.data || res.data || [];
      set({ clients: Array.isArray(clients) ? clients : [], isLoading: false });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to fetch clients', isLoading: false });
    }
  },

  fetchClient: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await clientAPI.getById(id);
      const client = res.data?.data || res.data;
      set({ currentClient: client, isLoading: false });
      return client;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to fetch client', isLoading: false });
    }
  },

  createClient: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await clientAPI.create(data);
      const client = res.data?.data || res.data;
      set((state) => ({ clients: [client, ...state.clients], isLoading: false }));
      return { success: true, data: client };
    } catch (err) {
      const data = err.response?.data || {};
      const message = data.error || data.message || 'Failed to create client';
      set({ error: message, isLoading: false });
      return { success: false, error: message, code: data.code, limit: data.limit, current: data.current };
    }
  },

  updateClient: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await clientAPI.update(id, data);
      const updated = res.data?.data || res.data;
      set((state) => ({
        clients: state.clients.map((c) => (c._id === id ? updated : c)),
        currentClient: state.currentClient?._id === id ? updated : state.currentClient,
        isLoading: false,
      }));
      return { success: true, data: updated };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update client';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  deleteClient: async (id) => {
    try {
      await clientAPI.delete(id);
      set((state) => ({
        clients: state.clients.filter((c) => c._id !== id),
      }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to delete client' };
    }
  },

  clearCurrent: () => set({ currentClient: null }),
  };
});

export default useClientStore;
