import { create } from 'zustand';
import { meetingAPI } from '../services/api';

const useMeetingStore = create((set) => ({
  meetings: [],
  currentMeeting: null,
  isLoading: false,
  error: null,

  fetchMeetings: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const res = await meetingAPI.getAll(params);
      const meetings = res.data?.data || res.data || [];
      set({ meetings: Array.isArray(meetings) ? meetings : [], isLoading: false });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to fetch meetings', isLoading: false });
    }
  },

  fetchMeeting: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await meetingAPI.getById(id);
      const meeting = res.data?.data || res.data;
      set({ currentMeeting: meeting, isLoading: false });
      return meeting;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to fetch meeting', isLoading: false });
    }
  },

  createMeeting: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await meetingAPI.create(data);
      const meeting = res.data?.data || res.data;
      set((state) => ({ meetings: [meeting, ...state.meetings], isLoading: false }));
      return { success: true, data: meeting };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to create meeting';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  updateMeeting: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await meetingAPI.update(id, data);
      const updated = res.data?.data || res.data;
      set((state) => ({
        meetings: state.meetings.map((m) => (m._id === id ? updated : m)),
        currentMeeting: state.currentMeeting?._id === id ? updated : state.currentMeeting,
        isLoading: false,
      }));
      return { success: true, data: updated };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update meeting';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  deleteMeeting: async (id) => {
    try {
      await meetingAPI.delete(id);
      set((state) => ({
        meetings: state.meetings.filter((m) => m._id !== id),
      }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Failed to delete meeting' };
    }
  },

  cancelMeeting: async (id) => {
    try {
      await meetingAPI.cancel(id);
      set((state) => ({
        meetings: state.meetings.map((m) => m._id === id ? { ...m, status: 'cancelled' } : m),
        currentMeeting: state.currentMeeting?._id === id ? { ...state.currentMeeting, status: 'cancelled' } : state.currentMeeting,
      }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to cancel meeting' };
    }
  },

  addNotes: async (id, notes) => {
    try {
      const res = await meetingAPI.addNotes(id, { notes });
      const updated = res.data?.data || res.data;
      set((state) => ({
        meetings: state.meetings.map((m) => (m._id === id ? updated : m)),
        currentMeeting: state.currentMeeting?._id === id ? updated : state.currentMeeting,
      }));
      return { success: true, data: updated };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Failed to save notes' };
    }
  },

  sendNotes: async (id) => {
    try {
      const res = await meetingAPI.sendNotes(id);
      return { success: true, data: res.data?.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Failed to send notes' };
    }
  },

  clearCurrent: () => set({ currentMeeting: null }),
}));

export default useMeetingStore;
