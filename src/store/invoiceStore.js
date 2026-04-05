import { create } from 'zustand';
import { invoiceAPI } from '../services/api';
import { registerStoreReset } from './authStore';

const initialState = { invoices: [], currentInvoice: null, isLoading: false, error: null, pagination: { total: 0, page: 1, limit: 15, pages: 1 } };

const useInvoiceStore = create((set) => {
  registerStoreReset(() => set(initialState));
  return {
  ...initialState,

  fetchInvoices: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const res = await invoiceAPI.getAll(params);
      const invoices = res.data?.data || res.data || [];
      const pagination = res.data?.pagination || { total: invoices.length, page: 1, limit: 15, pages: 1 };
      set({ invoices: Array.isArray(invoices) ? invoices : [], pagination, isLoading: false });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to fetch invoices', isLoading: false });
    }
  },

  fetchInvoice: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await invoiceAPI.getById(id);
      const invoice = res.data?.data || res.data;
      set({ currentInvoice: invoice, isLoading: false });
      return invoice;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to fetch invoice', isLoading: false });
    }
  },

  createInvoice: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await invoiceAPI.create(data);
      const invoice = res.data?.data || res.data;
      set((state) => ({ invoices: [invoice, ...state.invoices], isLoading: false }));
      return { success: true, data: invoice };
    } catch (err) {
      const data = err.response?.data || {};
      const message = data.error || data.message || 'Failed to create invoice';
      set({ error: message, isLoading: false });
      return { success: false, error: message, code: data.code, limit: data.limit, current: data.current };
    }
  },

  updateInvoice: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await invoiceAPI.update(id, data);
      const updated = res.data?.data || res.data;
      set((state) => ({
        invoices: state.invoices.map((i) => (i._id === id ? updated : i)),
        currentInvoice: state.currentInvoice?._id === id ? updated : state.currentInvoice,
        isLoading: false,
      }));
      return { success: true, data: updated };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update invoice';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  generatePdf: async (id) => {
    try {
      const res = await invoiceAPI.generatePdf(id);
      const updated = res.data?.data || res.data;
      if (updated?.pdfUrl) {
        set((state) => ({
          currentInvoice: state.currentInvoice?._id === id
            ? { ...state.currentInvoice, pdfUrl: updated.pdfUrl }
            : state.currentInvoice,
        }));
      }
      return { success: true, data: updated };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to generate PDF' };
    }
  },

  sendInvoice: async (id) => {
    try {
      await invoiceAPI.send(id);
      set((state) => ({
        currentInvoice: state.currentInvoice?._id === id
          ? { ...state.currentInvoice, status: 'sent' }
          : state.currentInvoice,
        invoices: state.invoices.map((i) => i._id === id ? { ...i, status: 'sent' } : i),
      }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to send invoice' };
    }
  },

  clearCurrent: () => set({ currentInvoice: null }),
  };
});

export default useInvoiceStore;
