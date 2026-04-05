import { create } from 'zustand';
import { whatsappAPI } from '../services/api';

const useConversationStore = create((set, get) => ({
  conversations: [],
  currentPhone: null,
  messages: [],
  isLoadingConversations: false,
  isLoadingMessages: false,
  isSending: false,
  error: null,

  fetchConversations: async () => {
    set({ isLoadingConversations: true, error: null });
    try {
      const res = await whatsappAPI.getConversations();
      const data = res.data?.data || res.data || [];
      set({ conversations: Array.isArray(data) ? data : [], isLoadingConversations: false });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to fetch conversations', isLoadingConversations: false });
    }
  },

  fetchMessages: async (phone) => {
    set({ isLoadingMessages: true, currentPhone: phone, error: null });
    try {
      const res = await whatsappAPI.getMessages(phone);
      const data = res.data?.data || res.data || [];
      set({ messages: Array.isArray(data) ? data : [], isLoadingMessages: false });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to fetch messages', isLoadingMessages: false });
    }
  },

  markRead: async (phone) => {
    try {
      await whatsappAPI.markRead(phone);
      // Reset unread count locally
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.phone === phone ? { ...c, unreadCount: 0 } : c
        ),
      }));
    } catch (_) {}
  },

  sendMessage: async (phone, payload) => {
    set({ isSending: true });
    try {
      const res = await whatsappAPI.sendMessage(phone, payload);
      const newMsg = res.data?.data;
      if (newMsg) {
        set((state) => ({
          messages: [...state.messages, newMsg],
          conversations: state.conversations.map((c) =>
            c.phone === phone
              ? {
                  ...c,
                  lastMessageAt: newMsg.timestamp,
                  lastMessagePreview: newMsg.content?.text || `[${newMsg.type}]`,
                  lastMessageDirection: 'outbound',
                }
              : c
          ),
          isSending: false,
        }));
      } else {
        set({ isSending: false });
      }
      return { success: true };
    } catch (err) {
      set({ isSending: false });
      return { success: false, error: err.response?.data?.error || 'Failed to send message' };
    }
  },

  // Called from socket.io or polling — append inbound message
  appendInboundMessage: (msg) => {
    const { currentPhone, messages, conversations } = get();
    if (msg.phone === currentPhone) {
      // Avoid duplicates
      if (!messages.find((m) => m._id === msg._id || m.waMessageId === msg.waMessageId)) {
        set({ messages: [...messages, msg] });
      }
    }
    // Update conversation preview
    set({
      conversations: conversations.map((c) =>
        c.phone === msg.phone
          ? {
              ...c,
              lastMessageAt: msg.timestamp,
              lastMessagePreview: msg.content?.text || `[${msg.type}]`,
              lastMessageDirection: 'inbound',
              unreadCount: msg.phone !== currentPhone ? (c.unreadCount || 0) + 1 : 0,
            }
          : c
      ),
    });
  },

  clearMessages: () => set({ messages: [], currentPhone: null }),
}));

export default useConversationStore;
