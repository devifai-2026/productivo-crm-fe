/**
 * WhatsApp Add-on Store
 *
 * Fetches and caches the WhatsApp addon status for the current user's org.
 * Used by Sidebar, CreateMeeting, InvoiceDetail, and any other place that
 * needs to know if WhatsApp features are available.
 *
 * isActive = true  → WA is enabled and not expired (all WA features unlocked)
 * isActive = false → WA is locked/expired (hide WA fields, show email-only UI)
 */
import { create } from 'zustand';
import api from '../config/api';
import { registerStoreReset } from './authStore';

const useWhatsappAddonStore = create((set, get) => ({
  isActive: false,
  isEnabled: false,
  isExpired: false,
  expiresAt: null,
  expiryLabel: 'never',
  reason: '',
  isFetched: false,
  isLoading: false,

  fetch: async () => {
    if (get().isLoading) return;
    set({ isLoading: true });
    try {
      const res = await api.get('/feature-flags/whatsapp/me');
      const d = res.data?.data ?? {};
      set({
        isActive: d.isActive ?? false,
        isEnabled: d.isEnabled ?? false,
        isExpired: d.isExpired ?? false,
        expiresAt: d.expiresAt ?? null,
        expiryLabel: d.expiryLabel ?? 'never',
        reason: d.reason ?? '',
        isFetched: true,
        isLoading: false,
      });
    } catch {
      set({ isActive: false, isFetched: true, isLoading: false });
    }
  },

  reset: () => set({
    isActive: false, isEnabled: false, isExpired: false,
    expiresAt: null, expiryLabel: 'never', reason: '',
    isFetched: false, isLoading: false,
  }),
}));

registerStoreReset(() => useWhatsappAddonStore.getState().reset());

export default useWhatsappAddonStore;
