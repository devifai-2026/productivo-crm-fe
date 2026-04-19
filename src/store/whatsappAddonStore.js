/**
 * WhatsApp Add-on Store
 *
 * Tracks per-feature addon status (invoice / task_reminder / meeting_invite).
 * `isActive` stays as a boolean (true if ANY feature is unlocked) so existing
 * guards (Sidebar, CreateMeeting, InvoiceDetail) keep working.
 */
import { create } from 'zustand';
import { whatsappAddonAPI } from '../services/api';
import { registerStoreReset } from './authStore';

const DEFAULT_FEATURES = {
  invoice: { isActive: false, expiresAt: null },
  task_reminder: { isActive: false, expiresAt: null },
  meeting_invite: { isActive: false, expiresAt: null },
};

const DEFAULT_PRICES = { invoice: 499, task_reminder: 499, meeting_invite: 499, bundle: 1199 };

function computeAnyActive(features) {
  return !!(features?.invoice?.isActive || features?.task_reminder?.isActive || features?.meeting_invite?.isActive);
}

const useWhatsappAddonStore = create((set, get) => ({
  features: DEFAULT_FEATURES,
  prices: DEFAULT_PRICES,
  isActive: false, // true if ANY feature is unlocked
  isFetched: false,
  isLoading: false,

  isFeatureActive: (feature) => !!get().features[feature]?.isActive,

  fetch: async () => {
    if (get().isLoading) return;
    set({ isLoading: true });
    try {
      const res = await whatsappAddonAPI.getMine();
      const d = res.data?.data ?? {};
      const features = { ...DEFAULT_FEATURES, ...(d.features || {}) };
      set({
        features,
        prices: { ...DEFAULT_PRICES, ...(d.prices || {}) },
        isActive: computeAnyActive(features),
        isFetched: true,
        isLoading: false,
      });
    } catch {
      set({
        features: DEFAULT_FEATURES,
        prices: DEFAULT_PRICES,
        isActive: false,
        isFetched: true,
        isLoading: false,
      });
    }
  },

  reset: () => set({
    features: DEFAULT_FEATURES,
    prices: DEFAULT_PRICES,
    isActive: false,
    isFetched: false,
    isLoading: false,
  }),
}));

registerStoreReset(() => useWhatsappAddonStore.getState().reset());

export default useWhatsappAddonStore;
