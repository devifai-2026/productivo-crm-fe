import { create } from 'zustand';
import { projectAPI } from '../services/api';

const useProjectStore = create((set) => ({
  projects: [],
  currentProject: null,
  isLoading: false,
  error: null,

  fetchProjects: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const res = await projectAPI.getAll(params);
      const projects = res.data?.data || res.data || [];
      set({ projects: Array.isArray(projects) ? projects : [], isLoading: false });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to fetch projects', isLoading: false });
    }
  },

  fetchProject: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await projectAPI.getById(id);
      const project = res.data?.data || res.data;
      set({ currentProject: project, isLoading: false });
      return project;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to fetch project', isLoading: false });
    }
  },

  createProject: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await projectAPI.create(data);
      const project = res.data?.data || res.data;
      set((state) => ({ projects: [project, ...state.projects], isLoading: false }));
      return { success: true, data: project };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to create project';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  updateProject: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await projectAPI.update(id, data);
      const updated = res.data?.data || res.data;
      set((state) => ({
        projects: state.projects.map((p) => (p._id === id ? updated : p)),
        currentProject: state.currentProject?._id === id ? updated : state.currentProject,
        isLoading: false,
      }));
      return { success: true, data: updated };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update project';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  deleteProject: async (id) => {
    try {
      await projectAPI.delete(id);
      set((state) => ({
        projects: state.projects.filter((p) => p._id !== id),
      }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to delete project' };
    }
  },

  clearCurrent: () => set({ currentProject: null }),
}));

export default useProjectStore;
