import { useEffect, useRef, useState, useCallback } from 'react';
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

function displayName(conv) {
  return conv.clientId?.name || conv.displayName || `+${conv.phone}`;
}

// ─── Message bubble ──────────────────────────────────────────────────────────

function MessageBubble({ msg }) {
  const isOut = msg.direction === 'outbound';
  const text  = msg.content?.text || '';
  const doc   = msg.content?.document;

  return (
    <div className={`flex ${isOut ? 'justify-end' : 'justify-start'} mb-1`}>
      <div
        className={`max-w-[72%] px-3 py-2 rounded-2xl text-sm shadow-sm ${
          isOut
            ? 'bg-green-500 text-white rounded-br-sm'
            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm'
        }`}
      >
        {text && <p className="whitespace-pre-wrap break-words">{text}</p>}
        {doc && (
          <a
            href={doc.url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 ${isOut ? 'text-green-100' : 'text-blue-600 dark:text-blue-400'}`}
          >
            <Icon icon="lucide:file-text" className="w-4 h-4 shrink-0" />
            <span className="underline text-xs truncate max-w-[180px]">
              {doc.filename || 'document.pdf'}
            </span>
          </a>
        )}
        {msg.type === 'image' && (
          <div className="flex items-center gap-2 opacity-70">
            <Icon icon="lucide:image" className="w-4 h-4" />
            <span className="text-xs">Image</span>
          </div>
        )}
        <div className={`flex items-center gap-1 mt-0.5 ${isOut ? 'justify-end' : 'justify-start'}`}>
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

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-gray-100 dark:border-gray-800 ${
        isActive
          ? 'bg-green-50 dark:bg-green-900/10'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
      }`}
    >
      <Avatar name={name} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{name}</span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0 ml-2">
            {timeAgo(conv.lastMessageAt)}
          </span>
        </div>
        <div className="flex justify-between items-center mt-0.5">
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
            {conv.lastMessageDirection === 'outbound' && (
              <Icon icon="lucide:corner-up-right" className="w-3 h-3 shrink-0" />
            )}
            {preview}
          </span>
          {unread > 0 && (
            <span className="ml-2 shrink-0 bg-green-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
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
    appendInboundMessage,
    clearMessages,
  } = useConversationStore();

  const [search, setSearch]           = useState('');
  const [messageText, setMessageText] = useState('');
  const [newPhone, setNewPhone]       = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [sendError, setSendError]     = useState('');
  const bottomRef   = useRef(null);
  const pollingRef  = useRef(null);
  const inputRef    = useRef(null);

  // Initial load + polling for conversations list every 5 s
  useEffect(() => {
    fetchConversations();
    pollingRef.current = setInterval(fetchConversations, 5000);
    return () => clearInterval(pollingRef.current);
  }, [fetchConversations]);

  // Poll messages for active conversation every 3 s
  useEffect(() => {
    if (!currentPhone) return;
    const id = setInterval(() => fetchMessages(currentPhone), 3000);
    return () => clearInterval(id);
  }, [currentPhone, fetchMessages]);

  // Scroll to bottom when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openConversation = useCallback(
    async (phone) => {
      await fetchMessages(phone);
      markRead(phone);
      setShowNewChat(false);
      setSendError('');
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

  const startNewChat = async () => {
    const phone = newPhone.trim().replace(/[^0-9]/g, '');
    if (!phone) return;
    // Open the conversation (will create it on first message)
    await openConversation(phone);
    setNewPhone('');
    setShowNewChat(false);
  };

  const filteredConvs = conversations.filter((c) => {
    const name = displayName(c).toLowerCase();
    const q    = search.toLowerCase();
    return name.includes(q) || c.phone.includes(q);
  });

  const activeConv = conversations.find((c) => c.phone === currentPhone);

  const totalUnread = conversations.reduce((s, c) => s + (c.unreadCount || 0), 0);

  return (
    <div className="flex flex-col h-screen">
      <Header
        title="WhatsApp"
        subtitle={totalUnread > 0 ? `${totalUnread} unread` : 'Conversations'}
        onMenuClick={onMenuClick}
        onAction={() => setShowNewChat(true)}
        actionLabel="New Chat"
        actionIcon="lucide:plus"
      />

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

          {/* New chat modal */}
          {showNewChat && (
            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 bg-green-50 dark:bg-green-900/10">
              <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">
                Start new conversation
              </p>
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && startNewChat()}
                  placeholder="Phone (e.g. 919876543210)"
                  className="flex-1 px-2 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-green-500 dark:text-gray-100"
                />
                <button
                  onClick={startNewChat}
                  className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg font-medium"
                >
                  Open
                </button>
                <button
                  onClick={() => setShowNewChat(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600"
                >
                  <Icon icon="lucide:x" className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* List */}
          <div className="flex-1 overflow-y-auto">
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
              <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800">
                <Avatar name={displayName(activeConv || { phone: currentPhone })} size="md" />
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {activeConv ? displayName(activeConv) : `+${currentPhone}`}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    +{currentPhone}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
                {isLoadingMessages && messages.length === 0 ? (
                  <div className="flex justify-center items-center h-32">
                    <Spinner size="md" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex justify-center items-center h-32 text-sm text-gray-400 dark:text-gray-500">
                    No messages yet. Send the first one!
                  </div>
                ) : (
                  messages.map((msg) => <MessageBubble key={msg._id || msg.waMessageId} msg={msg} />)
                )}
                <div ref={bottomRef} />
              </div>

              {/* Error */}
              {sendError && (
                <div className="px-4 py-1.5 bg-red-50 dark:bg-red-900/10 border-t border-red-200 dark:border-red-800">
                  <p className="text-xs text-red-600 dark:text-red-400">{sendError}</p>
                </div>
              )}

              {/* Input bar */}
              <div className="px-4 py-3 bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message… (Enter to send)"
                  rows={1}
                  className="flex-1 resize-none px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-gray-100 max-h-32 overflow-y-auto"
                  style={{ lineHeight: '1.5' }}
                />
                <button
                  onClick={handleSend}
                  disabled={!messageText.trim() || isSending}
                  className="p-2.5 rounded-xl bg-green-500 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
                >
                  {isSending ? (
                    <Spinner size="sm" color="white" />
                  ) : (
                    <Icon icon="lucide:send" className="w-5 h-5" />
                  )}
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
