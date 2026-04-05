import { create } from 'zustand';
import { taskAPI } from '../services/api';

const useTaskStore = create((set, get) => ({
  tasks: [],
  currentTask: null,
  isLoading: false,
  error: null,
  filters: {
    status: '',
    priority: '',
    search: '',
  },

  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),

  fetchTasks: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const res = await taskAPI.getAll(params);
      const tasks = res.data?.data || res.data || [];
      set({ tasks: Array.isArray(tasks) ? tasks : [], isLoading: false });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to fetch tasks', isLoading: false });
    }
  },

  fetchTask: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await taskAPI.getById(id);
      const task = res.data?.data || res.data;
      set({ currentTask: task, isLoading: false });
      return task;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to fetch task', isLoading: false });
    }
  },

  createTask: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await taskAPI.create(data);
      const task = res.data?.data || res.data;
      set((state) => ({ tasks: [task, ...state.tasks], isLoading: false }));
      return { success: true, data: task };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to create task';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  updateTask: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await taskAPI.update(id, data);
      const updated = res.data?.data || res.data;
      set((state) => ({
        tasks: state.tasks.map((t) => (t._id === id ? updated : t)),
        currentTask: state.currentTask?._id === id ? updated : state.currentTask,
        isLoading: false,
      }));
      return { success: true, data: updated };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update task';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  deleteTask: async (id) => {
    try {
      await taskAPI.delete(id);
      set((state) => ({
        tasks: state.tasks.filter((t) => t._id !== id),
      }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to delete task' };
    }
  },

  clearCurrent: () => set({ currentTask: null }),
}));

export default useTaskStore;
