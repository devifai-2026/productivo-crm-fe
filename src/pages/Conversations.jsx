import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config/env';
import useWhatsappAddonStore from '../store/whatsappAddonStore';
import LogsView from '../components/whatsapp/LogsView';
import WebhookLogsView from '../components/whatsapp/WebhookLogsView';
import TemplatePicker from '../components/whatsapp/TemplatePicker';
import SendAttachmentPicker from '../components/whatsapp/SendAttachmentPicker';
import NewChatPanel from '../components/whatsapp/NewChatPanel';
import { Icon } from '@iconify/react';
import { formatDistanceToNow, format } from 'date-fns';
import useConversationStore from '../store/conversationStore';
import useAuthStore from '../store/authStore';
import Header from '../components/layout/Header';
import Avatar from '../components/ui/Avatar';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(ts) {
  if (!ts) return '';
  try {
    return formatDistanceToNow(new Date(ts), { addSuffix: true });
  } catch {
    return '';
  }
}

function msgTime(ts) {
  if (!ts) return '';
  try {
    return format(new Date(ts), 'HH:mm');
  } catch {
    return '';
  }
}

// WhatsApp-style day label for the centered separators: Today / Yesterday / 12 June 2026
function dayLabel(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const today = new Date();
  const yest = new Date(); yest.setDate(today.getDate() - 1);
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, today)) return 'Today';
  if (sameDay(d, yest)) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}
// YYYY-MM-DD key to detect day changes between consecutive messages
function dayKey(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// Known client → their saved name. Unknown sender → their phone number (so it's never
// a misleading guess). The WhatsApp profile name is shown separately as a subtitle.
function displayName(conv) {
  if (conv.clientId?.name) return conv.clientId.name;
  return `+${conv.phone}`;
}

// True when the conversation is NOT linked to a saved client.
function isUnknownSender(conv) {
  return !conv.clientId;
}

// ─── Message bubble ──────────────────────────────────────────────────────────

// Wrap occurrences of `term` (case-insensitive) in a highlight mark. Returns the
// original string when there's no term, so non-search rendering is untouched.
function highlightText(value, term) {
  if (!term || !value) return value;
  const lower = value.toLowerCase();
  const t = term.toLowerCase();
  const out = [];
  let i = 0;
  let key = 0;
  while (i < value.length) {
    const idx = lower.indexOf(t, i);
    if (idx === -1) { out.push(value.slice(i)); break; }
    if (idx > i) out.push(value.slice(i, idx));
    out.push(
      <mark key={key++} className="bg-yellow-300/70 dark:bg-yellow-500/40 text-inherit rounded-sm px-0.5">
        {value.slice(idx, idx + term.length)}
      </mark>
    );
    i = idx + term.length;
  }
  return out;
}

function MessageBubble({ msg, highlight }) {
  const isOut = msg.direction === 'outbound';
  const text  = msg.content?.text || '';
  // content sub-objects always exist (empty defaults) in the schema, so only treat
  // them as real attachments when they actually carry a url/id/filename.
  const rawDoc = msg.content?.document;
  const doc = rawDoc && (rawDoc.filename || rawDoc.url || rawDoc.id) ? rawDoc : null;
  const rawImg = msg.content?.image;
  const img = rawImg && (rawImg.url || rawImg.id) ? rawImg : null;
  const rawMedia = msg.content?.media;
  const media = rawMedia && (rawMedia.url || rawMedia.id) ? rawMedia : null;
  const isVideo = media && (msg.type === 'video' || /video\//.test(media.mimeType || ''));
  const isAudio = media && (msg.type === 'audio' || msg.type === 'voice' || /audio\//.test(media.mimeType || ''));

  // Does this message actually carry any renderable content? If not, show a graceful
  // "unsupported message" line instead of a bare timestamp (which looked broken).
  const hasContent = !!(text || img || isVideo || isAudio || doc);
  // Media-led bubbles (image/video) get tighter padding so the bubble hugs the media.
  const isMediaLed = !!(img?.url || (isVideo && media?.url));

  return (
    <div className={`flex ${isOut ? 'justify-end' : 'justify-start'} mb-1.5`}>
      <div
        className={`relative max-w-[80%] sm:max-w-[60%] text-sm shadow-md ${isMediaLed ? 'p-1' : 'px-3 py-2'} rounded-2xl ${
          isOut
            ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white rounded-br-md'
            : 'bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm text-gray-900 dark:text-gray-100 rounded-bl-md ring-1 ring-black/5 dark:ring-white/10'
        }`}
      >
        {!hasContent && (
          <p className="flex items-center gap-1.5 text-xs italic opacity-70">
            <Icon icon="lucide:file-question" className="w-3.5 h-3.5" />
            Unsupported message
          </p>
        )}
        {/* Image */}
        {img && (
          img.url ? (
            <a href={img.url} target="_blank" rel="noopener noreferrer" className="block">
              <img src={img.url} alt={img.caption || 'image'} className="rounded-[14px] w-full max-h-[320px] object-cover" loading="lazy" />
            </a>
          ) : (
            <div className="flex items-center gap-2 opacity-70 px-2 py-1"><Icon icon="lucide:image" className="w-4 h-4" /><span className="text-xs">Image (processing…)</span></div>
          )
        )}

        {/* Video */}
        {isVideo && (
          media.url
            ? <video src={media.url} controls className="rounded-[14px] w-full max-h-[320px]" />
            : <div className="flex items-center gap-2 opacity-70 px-2 py-1"><Icon icon="lucide:video" className="w-4 h-4" /><span className="text-xs">Video (processing…)</span></div>
        )}

        {/* Audio / voice note */}
        {isAudio && (
          media.url
            ? (
              <div className="flex items-center gap-2 min-w-[200px]">
                <Icon icon={media.voice ? 'lucide:mic' : 'lucide:music'} className={`w-4 h-4 shrink-0 ${isOut ? 'text-green-100' : 'text-gray-500'}`} />
                <audio src={media.url} controls className="h-8 max-w-[200px]" />
              </div>
            )
            : <div className="flex items-center gap-2 opacity-70"><Icon icon="lucide:mic" className="w-4 h-4" /><span className="text-xs">Voice note (processing…)</span></div>
        )}

        {/* Caption (image/video) */}
        {(img?.caption || media?.caption) && (
          <p className={`whitespace-pre-wrap break-words text-xs mt-1 opacity-90 ${isMediaLed ? 'px-1.5' : ''}`}>{img?.caption || media?.caption}</p>
        )}

        {/* Text — full message body (templates render verbatim, matching WhatsApp) */}
        {text && <p className="whitespace-pre-wrap break-words leading-relaxed">{highlightText(text, highlight)}</p>}

        {/* Document */}
        {doc && (
          <a
            href={doc.url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 ${isOut ? 'text-green-100' : 'text-blue-600 dark:text-blue-400'}`}
          >
            <Icon icon="lucide:file-text" className="w-4 h-4 shrink-0" />
            <span className="underline text-xs truncate max-w-[180px]">
              {doc.filename || 'document'}
            </span>
          </a>
        )}
        <div className={`flex items-center gap-1 mt-0.5 ${isMediaLed ? 'px-1.5 pb-0.5' : ''} ${isOut ? 'justify-end' : 'justify-start'}`}>
          <span className={`text-[10px] ${isOut ? 'text-green-100' : 'text-gray-400 dark:text-gray-500'}`}>
            {msgTime(msg.timestamp)}
          </span>
          {isOut && (
            <Icon
              icon={
                msg.status === 'read'
                  ? 'lucide:check-check'
                  : msg.status === 'delivered'
                  ? 'lucide:check-check'
                  : 'lucide:check'
              }
              className={`w-3 h-3 ${msg.status === 'read' ? 'text-blue-200' : 'text-green-200'}`}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Conversation list item ──────────────────────────────────────────────────

function ConvItem({ conv, isActive, onClick }) {
  const name    = displayName(conv);
  const preview = conv.lastMessagePreview || 'No messages yet';
  const unread  = conv.unreadCount || 0;
  // For unknown senders, surface the WhatsApp profile name (if any) as an avatar hint.
  const profileHint = isUnknownSender(conv) && conv.displayName && conv.displayName !== conv.phone ? conv.displayName : '';

  return (
    <button
      onClick={onClick}
      className={`relative w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-gray-100/70 dark:border-gray-800/60 ${
        isActive
          ? 'bg-emerald-50 dark:bg-emerald-900/15'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
      }`}
    >
      {isActive && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-emerald-500" />}
      <div className="relative shrink-0">
        <Avatar name={profileHint || name} size="md" />
        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-gray-950" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline">
          <span className={`text-sm truncate ${unread > 0 ? 'font-semibold text-gray-900 dark:text-white' : 'font-medium text-gray-900 dark:text-gray-100'}`}>
            {name}
          </span>
          <span className={`text-[10px] shrink-0 ml-2 ${unread > 0 ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
            {timeAgo(conv.lastMessageAt)}
          </span>
        </div>
        <div className="flex justify-between items-center mt-0.5">
          <span className={`text-xs truncate flex items-center gap-1 ${unread > 0 ? 'text-gray-700 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}`}>
            {conv.lastMessageDirection === 'outbound' && (
              <Icon icon="lucide:corner-up-right" className="w-3 h-3 shrink-0" />
            )}
            {preview}
          </span>
          {unread > 0 && (
            <span className="ml-2 shrink-0 bg-emerald-500 text-white text-[10px] font-bold rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center shadow-sm">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function Conversations({ onMenuClick }) {
  const { user }  = useAuthStore();
  const {
    conversations,
    currentPhone,
    messages,
    isLoadingConversations,
    isLoadingMessages,
    isSending,
    fetchConversations,
    fetchMessages,
    markRead,
    sendMessage,
    sendTemplate,
    appendInboundMessage,
    updateMessageStatus,
  } = useConversationStore();

  const [search, setSearch]           = useState('');
  const [messageText, setMessageText] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [sendError, setSendError]     = useState('');
  const [activeTab, setActiveTab]     = useState('chats'); // 'chats' | 'logs' | 'webhooks'
  const [showTemplates, setShowTemplates] = useState(false);
  const [attachKind, setAttachKind]   = useState(null);   // 'invoice' | 'meeting' | null
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [pendingContact, setPendingContact] = useState(null); // client picked from New Chat, before first message
  const [showChatSearch, setShowChatSearch] = useState(false); // in-chat message search bar
  const [chatSearch, setChatSearch]   = useState('');

  const { isActive: anyAddonActive, isFetched: addonFetched, fetch: fetchAddons } = useWhatsappAddonStore();
  useEffect(() => {
    if (!addonFetched) fetchAddons();
  }, [addonFetched, fetchAddons]);
  const bottomRef   = useRef(null);
  const pollingRef  = useRef(null);
  const inputRef    = useRef(null);

  // Initial load + polling for conversations list every 5 s
  useEffect(() => {
    fetchConversations();
    pollingRef.current = setInterval(fetchConversations, 5000);
    return () => clearInterval(pollingRef.current);
  }, [fetchConversations]);

  // Poll messages for active conversation every 3 s (fallback if socket drops)
  useEffect(() => {
    if (!currentPhone) return;
    const id = setInterval(() => fetchMessages(currentPhone), 3000);
    return () => clearInterval(id);
  }, [currentPhone, fetchMessages]);

  // Live updates via Socket.io — instant inbound/outbound + status, no waiting on the poll.
  // organizationId may be a populated object ({_id,name,...}) or a raw id string.
  const orgId = typeof user?.organizationId === 'object'
    ? user?.organizationId?._id
    : user?.organizationId;
  useEffect(() => {
    if (!orgId) return;
    const socket = io(SOCKET_URL, {
      query: { orgId },
      transports: ['websocket', 'polling'],
    });

    socket.on('message:new', (msg) => {
      appendInboundMessage(msg);          // adds to open thread + bumps the list preview
    });
    socket.on('message:status', ({ waMessageId, status }) => {
      updateMessageStatus(waMessageId, status);
    });

    return () => socket.disconnect();
  }, [orgId, appendInboundMessage, updateMessageStatus]);

  // Smart auto-scroll: jump to bottom when the conversation changes, and on NEW
  // messages only if the user is already near the bottom. Prevents the 3s poll
  // (which replaces the messages array) from yanking you down while reading history.
  const scrollRef    = useRef(null);
  const prevPhoneRef = useRef(null);
  const prevCountRef = useRef(0);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  // Track whether the user is near the bottom (to toggle the "scroll to latest" button).
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    setShowScrollBtn(!nearBottom);
  }, []);

  const scrollToLatest = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollBtn(false);
  }, []);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const switchedConversation = prevPhoneRef.current !== currentPhone;
    const grew = messages.length > prevCountRef.current;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;

    if (switchedConversation) {
      // Opening a chat → jump straight to the latest (no animation)
      el.scrollTop = el.scrollHeight;
      setShowScrollBtn(false);
    } else if (grew && nearBottom) {
      // New message while already at the bottom → follow it
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    // else: user scrolled up to read — leave them alone

    prevPhoneRef.current = currentPhone;
    prevCountRef.current = messages.length;
  }, [messages, currentPhone]);

  const openConversation = useCallback(
    async (phone) => {
      await fetchMessages(phone);
      markRead(phone);
      setShowNewChat(false);
      setSendError('');
      setShowChatSearch(false);
      setChatSearch('');
      setTimeout(() => inputRef.current?.focus(), 100);
    },
    [fetchMessages, markRead]
  );

  const handleSend = async () => {
    const text = messageText.trim();
    if (!text || !currentPhone) return;
    setMessageText('');
    setSendError('');
    const result = await sendMessage(currentPhone, { type: 'text', message: text });
    if (!result.success) setSendError(result.error || 'Failed to send');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Open (or create) a conversation by raw phone — called from the contact picker.
  // `client` (when picked from the directory) lets us show the name immediately,
  // before any message exists / the conversation is persisted.
  const startNewChat = async (rawPhone, client = null) => {
    const phone = String(rawPhone).replace(/[^0-9]/g, '');
    if (!phone) return;
    setPendingContact(client ? { phone, clientId: { _id: client._id, name: client.name }, displayName: client.name } : null);
    await openConversation(phone);   // creates it on first message
    setShowNewChat(false);
  };

  const filteredConvs = conversations.filter((c) => {
    const name = displayName(c).toLowerCase();
    const q    = search.toLowerCase();
    return name.includes(q) || c.phone.includes(q);
  });

  // Prefer the persisted conversation; fall back to the contact just picked from New Chat
  // (so the name shows immediately, before the first message is sent).
  const activeConv = conversations.find((c) => c.phone === currentPhone)
    || (pendingContact?.phone === currentPhone ? pendingContact : null);

  const totalUnread = conversations.reduce((s, c) => s + (c.unreadCount || 0), 0);

  // In-chat search: when the bar is open with a query, only show matching messages
  // (matching text, caption, or document filename — case-insensitive).
  const chatQuery = chatSearch.trim().toLowerCase();
  const visibleMessages = showChatSearch && chatQuery
    ? messages.filter((m) => {
        const hay = [
          m.content?.text,
          m.content?.image?.caption,
          m.content?.media?.caption,
          m.content?.document?.filename,
        ].filter(Boolean).join(' ').toLowerCase();
        return hay.includes(chatQuery);
      })
    : messages;

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] lg:h-[calc(100vh-4rem)] overflow-hidden">
      <Header
        title="WhatsApp"
        subtitle={activeTab === 'chats' ? (totalUnread > 0 ? `${totalUnread} unread` : 'Conversations') : 'Sent logs'}
        onMenuClick={onMenuClick}
      />

      {/* Tab switcher. Chats + Webhook Logs always available; addon "Logs" only when an addon is active.
          New Chat button sits on the far right, on the same level as the tabs. */}
      <div className="flex items-center justify-between px-4 pt-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
        <div className="flex items-center gap-1">
          {[
            { id: 'chats',    label: 'Chats',        icon: 'lucide:message-circle', show: true },
            { id: 'logs',     label: 'Logs',         icon: 'lucide:list',           show: anyAddonActive },
            { id: 'webhooks', label: 'Webhook Logs', icon: 'lucide:webhook',        show: true },
          ].filter((t) => t.show).map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === t.id
                  ? 'border-green-500 text-green-600 dark:text-green-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <Icon icon={t.icon} className="w-4 h-4" />
                {t.label}
              </span>
            </button>
          ))}
        </div>

        {activeTab === 'chats' && (
          <button
            onClick={() => setShowNewChat(true)}
            className="mb-1.5 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium text-white bg-gradient-to-br from-emerald-500 to-green-600 hover:shadow-lg hover:shadow-emerald-500/30 active:scale-95 transition-all"
          >
            <Icon icon="lucide:plus" className="w-4 h-4" />
            New Chat
          </button>
        )}
      </div>

      {activeTab === 'webhooks' ? (
        <div className="flex-1 overflow-auto no-scrollbar px-6 py-6 bg-gray-50 dark:bg-gray-950">
          <div className="max-w-5xl mx-auto">
            <WebhookLogsView />
          </div>
        </div>
      ) : activeTab === 'logs' && anyAddonActive ? (
        <div className="flex-1 overflow-auto no-scrollbar px-6 py-6 bg-gray-50 dark:bg-gray-950">
          <div className="max-w-5xl mx-auto">
            <LogsView />
          </div>
        </div>
      ) : (
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: Conversation list ── */}
        <aside className="w-80 shrink-0 flex flex-col border-r border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
          {/* Search */}
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
            <div className="relative">
              <Icon
                icon="lucide:search"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations…"
                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-green-500 dark:text-gray-100"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto no-scrollbar">
            {isLoadingConversations && conversations.length === 0 ? (
              <div className="flex justify-center items-center h-32">
                <Spinner size="md" />
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-400 dark:text-gray-500">
                {search ? 'No results' : 'No conversations yet'}
              </div>
            ) : (
              filteredConvs.map((conv) => (
                <ConvItem
                  key={conv._id}
                  conv={conv}
                  isActive={conv.phone === currentPhone}
                  onClick={() => openConversation(conv.phone)}
                />
              ))
            )}
          </div>
        </aside>

        {/* ── Right: Chat area ── */}
        <main className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 min-w-0">
          {!currentPhone ? (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState
                icon="lucide:message-circle"
                title="Select a conversation"
                subtitle="Pick a chat from the left or start a new one"
              />
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 px-4 py-2.5 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-200/60 dark:border-gray-800/60 shadow-sm z-10">
                <div className="relative shrink-0">
                  <Avatar name={displayName(activeConv || { phone: currentPhone })} size="md" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-gray-950" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {activeConv ? displayName(activeConv) : `+${currentPhone}`}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 truncate">
                    {activeConv && !isUnknownSender(activeConv) ? (
                      <>
                        <Icon icon="lucide:user-check" className="w-3 h-3 text-emerald-500 shrink-0" />
                        Saved client · +{currentPhone}
                      </>
                    ) : (
                      <>+{currentPhone}</>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-0.5 shrink-0 text-gray-400 dark:text-gray-500">
                  <button
                    title="Search in chat"
                    onClick={() => {
                      setShowChatSearch((v) => {
                        const next = !v;
                        if (!next) setChatSearch('');
                        return next;
                      });
                    }}
                    className={`p-2 rounded-full transition-colors ${
                      showChatSearch
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-emerald-600'
                    }`}
                  >
                    <Icon icon="lucide:search" className="w-[18px] h-[18px]" />
                  </button>
                </div>
              </div>

              {/* In-chat search bar */}
              {showChatSearch && (
                <div className="flex items-center gap-2 px-4 py-2 bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl border-b border-gray-200/60 dark:border-gray-800/60">
                  <div className="relative flex-1">
                    <Icon icon="lucide:search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      autoFocus
                      value={chatSearch}
                      onChange={(e) => setChatSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Escape' && (setShowChatSearch(false), setChatSearch(''))}
                      placeholder="Search in this conversation…"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/40 dark:text-gray-100"
                    />
                  </div>
                  {chatQuery && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                      {visibleMessages.length} match{visibleMessages.length === 1 ? '' : 'es'}
                    </span>
                  )}
                  <button
                    onClick={() => { setShowChatSearch(false); setChatSearch(''); }}
                    className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Icon icon="lucide:x" className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Messages — premium chat wallpaper.
                  Light: subtle WhatsApp-style doodle on warm paper.
                  Dark : a dark abstract Unsplash photo with a gradient veil for legibility. */}
              <div className="relative flex-1 overflow-hidden">
                {/* Background layer */}
                <div
                  className="absolute inset-0 bg-[#efeae2] dark:bg-gray-950 bg-cover bg-center"
                  style={{
                    backgroundImage:
                      "var(--chat-doodle), url('https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=1600&q=60')",
                  }}
                />
                {/* Doodle for light mode + dark veil for dark mode (CSS var swaps the doodle off in dark) */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/0 dark:from-gray-950/85 dark:via-gray-950/75 dark:to-gray-950/90" />

                {/* Scrollable message list */}
                <div ref={scrollRef} onScroll={handleScroll} className="relative h-full overflow-y-auto no-scrollbar px-4 py-4 space-y-1">
                  {isLoadingMessages && messages.length === 0 ? (
                    <div className="flex justify-center items-center h-32">
                      <Spinner size="md" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex justify-center items-center h-full">
                      <span className="px-4 py-2 rounded-full bg-white/70 dark:bg-gray-900/70 backdrop-blur text-xs text-gray-500 dark:text-gray-300 shadow-sm">
                        No messages yet — send the first one!
                      </span>
                    </div>
                  ) : visibleMessages.length === 0 ? (
                    <div className="flex justify-center items-center h-full">
                      <span className="px-4 py-2 rounded-full bg-white/70 dark:bg-gray-900/70 backdrop-blur text-xs text-gray-500 dark:text-gray-300 shadow-sm">
                        No messages match “{chatSearch.trim()}”
                      </span>
                    </div>
                  ) : (
                    visibleMessages.map((msg, i) => {
                      const prev = visibleMessages[i - 1];
                      const showDay = !prev || dayKey(prev.timestamp) !== dayKey(msg.timestamp);
                      return (
                        <div key={msg._id || msg.waMessageId}>
                          {showDay && (
                            <div className="flex justify-center my-3">
                              <span className="px-3 py-1 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur text-[11px] font-medium text-gray-500 dark:text-gray-300 shadow-sm">
                                {dayLabel(msg.timestamp)}
                              </span>
                            </div>
                          )}
                          <MessageBubble msg={msg} highlight={chatQuery} />
                        </div>
                      );
                    })
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Scroll-to-latest button (shows when scrolled up) */}
                {showScrollBtn && (
                  <button
                    onClick={scrollToLatest}
                    title="Scroll to latest"
                    className="absolute bottom-4 right-4 z-10 w-10 h-10 rounded-full bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-200 shadow-lg ring-1 ring-black/5 dark:ring-white/10 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Icon icon="lucide:chevron-down" className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Error */}
              {sendError && (
                <div className="px-4 py-1.5 bg-red-50 dark:bg-red-900/10 border-t border-red-200 dark:border-red-800">
                  <p className="text-xs text-red-600 dark:text-red-400">{sendError}</p>
                </div>
              )}

              {/* Input bar */}
              <div className="px-4 py-3 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-t border-gray-200/60 dark:border-gray-800/60 flex items-end gap-2">
                {/* Attachment menu: invoice / meeting */}
                <div className="relative shrink-0">
                  <button
                    onClick={() => setShowAttachMenu((v) => !v)}
                    title="Send invoice or meeting invite"
                    className="p-2.5 rounded-full text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-colors"
                  >
                    <Icon icon="lucide:paperclip" className="w-5 h-5" />
                  </button>
                  {showAttachMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowAttachMenu(false)} />
                      <div className="absolute bottom-12 left-0 z-20 w-56 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-100 dark:border-gray-800 py-1">
                        <button
                          onClick={() => { setAttachKind('invoice'); setShowAttachMenu(false); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left whitespace-nowrap text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <Icon icon="lucide:file-text" className="w-4 h-4 shrink-0 text-green-500" /> Send Invoice
                        </button>
                        <button
                          onClick={() => { setAttachKind('meeting'); setShowAttachMenu(false); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left whitespace-nowrap text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <Icon icon="lucide:calendar" className="w-4 h-4 shrink-0 text-green-500" /> Send Meeting
                        </button>
                        <button
                          onClick={() => { setAttachKind('reschedule'); setShowAttachMenu(false); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left whitespace-nowrap text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <Icon icon="lucide:calendar-clock" className="w-4 h-4 shrink-0 text-amber-500" /> Reschedule Meeting
                        </button>
                        <button
                          onClick={() => { setAttachKind('cancel'); setShowAttachMenu(false); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left whitespace-nowrap text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <Icon icon="lucide:calendar-x" className="w-4 h-4 shrink-0 text-red-500" /> Cancel Meeting
                        </button>
                      </div>
                    </>
                  )}
                </div>
                <button
                  onClick={() => setShowTemplates(true)}
                  title="Send a template (use to start or re-open a chat)"
                  className="p-2.5 rounded-full text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-colors shrink-0"
                >
                  <Icon icon="lucide:layout-template" className="w-5 h-5" />
                </button>
                {/* Message pill */}
                <div className="flex-1 flex items-end gap-1 bg-gray-100 dark:bg-gray-800/80 rounded-3xl px-3 py-1 focus-within:ring-2 focus-within:ring-emerald-500/40 transition-shadow">
                  <textarea
                    ref={inputRef}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message…"
                    rows={1}
                    className="flex-1 resize-none bg-transparent px-1 py-1.5 text-sm outline-none dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 max-h-32 overflow-y-auto no-scrollbar"
                    style={{ lineHeight: '1.5' }}
                  />
                </div>
                <button
                  onClick={handleSend}
                  disabled={!messageText.trim() || isSending}
                  className="w-11 h-11 shrink-0 flex items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-green-600 hover:shadow-lg hover:shadow-emerald-500/30 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none text-white transition-all active:scale-95"
                >
                  {isSending ? (
                    <Spinner size="sm" color="white" />
                  ) : (
                    <Icon icon={messageText.trim() ? 'lucide:send' : 'lucide:mic'} className="w-5 h-5" />
                  )}
                </button>
              </div>
            </>
          )}
        </main>
      </div>
      )}

      {showNewChat && (
        <NewChatPanel
          onClose={() => setShowNewChat(false)}
          onPick={startNewChat}
        />
      )}

      {showTemplates && currentPhone && (
        <TemplatePicker
          phone={currentPhone}
          onClose={() => setShowTemplates(false)}
          onSent={(templateId, variables) => sendTemplate(currentPhone, templateId, variables)}
        />
      )}

      {attachKind && currentPhone && (
        <SendAttachmentPicker
          kind={attachKind}
          onClose={() => setAttachKind(null)}
          onSent={() => fetchMessages(currentPhone)}
        />
      )}
    </div>
  );
}
