import { create } from 'zustand';
import { whatsappAPI } from '../services/api';
import { registerStoreReset } from './authStore';

const initialState = { conversations: [], currentPhone: null, messages: [], isLoadingConversations: false, isLoadingMessages: false, isSending: false, error: null };

const useConversationStore = create((set, get) => {
  registerStoreReset(() => set(initialState));
  return {
  ...initialState,

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

  sendTemplate: async (phone, templateId, variables = []) => {
    set({ isSending: true });
    try {
      const res = await whatsappAPI.sendTemplate(phone, { templateId, variables });
      const newMsg = res.data?.data;
      if (newMsg) {
        set((state) => ({
          messages: [...state.messages, newMsg],
          conversations: state.conversations.map((c) =>
            c.phone === phone
              ? {
                  ...c,
                  lastMessageAt: newMsg.timestamp,
                  lastMessagePreview: newMsg.content?.text || '[template]',
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
      return { success: false, error: err.response?.data?.error || 'Failed to send template' };
    }
  },

  // Called from socket.io (message:new) or polling — append a message (either direction)
  // and keep the conversation list in sync. Handles brand-new senders too.
  appendInboundMessage: (msg) => {
    const { currentPhone, messages, conversations, fetchConversations } = get();
    const isInbound = msg.direction === 'inbound';

    // Add to the open thread if it belongs to it. Dedup defensively: the same message
    // can arrive via the optimistic send AND the socket echo. Match on _id, waMessageId,
    // or (same direction + same text within a few seconds) to absorb races.
    if (msg.phone === currentPhone) {
      const dupe = messages.find((m) =>
        (m._id && msg._id && m._id === msg._id) ||
        (m.waMessageId && msg.waMessageId && m.waMessageId === msg.waMessageId) ||
        (m.direction === msg.direction &&
          (m.content?.text || '') === (msg.content?.text || '') &&
          Math.abs(new Date(m.timestamp) - new Date(msg.timestamp)) < 10000)
      );
      if (!dupe) {
        set({ messages: [...messages, msg] });
      }
    }

    const exists = conversations.some((c) => c.phone === msg.phone);
    if (!exists) {
      // New sender not in the list yet — pull the fresh list so it shows up immediately.
      fetchConversations();
      return;
    }

    const preview = msg.content?.text || `[${msg.type}]`;
    set({
      conversations: conversations
        .map((c) =>
          c.phone === msg.phone
            ? {
                ...c,
                lastMessageAt: msg.timestamp,
                lastMessagePreview: preview,
                lastMessageDirection: msg.direction || (isInbound ? 'inbound' : 'outbound'),
                // Only bump unread for inbound messages to a chat that isn't currently open
                unreadCount:
                  isInbound && msg.phone !== currentPhone
                    ? (c.unreadCount || 0) + 1
                    : c.unreadCount || 0,
              }
            : c
        )
        // Re-sort so the most recent conversation floats to top (WhatsApp behaviour)
        .sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0)),
    });
  },

  // Update delivery/read status of an outbound message (from socket message:status)
  updateMessageStatus: (waMessageId, status) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.waMessageId === waMessageId ? { ...m, status } : m
      ),
    }));
  },

  clearMessages: () => set({ messages: [], currentPhone: null }),
  };
});

export default useConversationStore;
