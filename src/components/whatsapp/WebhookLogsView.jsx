import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { whatsappAPI } from '../../services/api';
import Input from '../ui/Input';
import Spinner from '../ui/Spinner';
import EmptyState from '../ui/EmptyState';

const PAGE_SIZE = 30;

const DIRECTION_TABS = [
  { id: '',         label: 'All',      icon: 'lucide:list' },
  { id: 'inbound',  label: 'Incoming', icon: 'lucide:arrow-right' },
  { id: 'outbound', label: 'Outgoing', icon: 'lucide:arrow-left' },
];

// WhatsApp delivery statuses → colour + icon
const STATUS_META = {
  read:      { label: 'Read',      cls: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400',       icon: 'lucide:check-check' },
  delivered: { label: 'Delivered', cls: 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-300',          icon: 'lucide:check-check' },
  sent:      { label: 'Sent',      cls: 'text-gray-500 bg-gray-50 dark:bg-gray-800/60 dark:text-gray-400',         icon: 'lucide:check' },
  pending:   { label: 'Pending',   cls: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400',     icon: 'lucide:clock' },
  failed:    { label: 'Failed',    cls: 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400',             icon: 'lucide:alert-circle' },
};

function StatusPill({ status }) {
  const m = STATUS_META[status] || STATUS_META.sent;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${m.cls}`}>
      <Icon icon={m.icon} className="w-3 h-3" />
      {m.label}
    </span>
  );
}

function formatWhen(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function bodyText(msg) {
  const c = msg.content || {};
  if (c.text) return c.text;
  if (c.document?.filename || c.document?.url) return `📄 ${c.document.filename || 'Document'}`;
  if (c.image?.id || c.image?.url) return `🖼 Image${c.image.caption ? ` — ${c.image.caption}` : ''}`;
  if (c.media?.id || c.media?.url) {
    if (msg.type === 'video') return '🎬 Video';
    if (msg.type === 'voice' || c.media.voice) return '🎤 Voice note';
    if (msg.type === 'audio') return '🎵 Audio';
    if (msg.type === 'sticker') return '🌟 Sticker';
    return '📎 Media';
  }
  if (c.template?.name) return `📋 Template: ${c.template.name}`;
  return `[${msg.type}]`;
}

export default function WebhookLogsView() {
  const [direction, setDirection] = useState('');
  const [status, setStatus]       = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [q, setQ]                 = useState('');
  const [page, setPage]           = useState(1);
  const [logs, setLogs]           = useState([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(false);
  const [expanded, setExpanded]   = useState(null);
  const searchTimer = useRef(null);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setQ(searchInput.trim()); setPage(1); }, 400);
    return () => clearTimeout(searchTimer.current);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    whatsappAPI
      .getMessageLogs({ direction: direction || undefined, status: status || undefined, q: q || undefined, page, limit: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return;
        setLogs(res.data?.data || []);
        setTotal(res.data?.total || 0);
      })
      .catch(() => { if (!cancelled) { setLogs([]); setTotal(0); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [direction, status, q, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      {/* Direction + status filters */}
      <div className="flex flex-wrap items-center gap-2">
        {DIRECTION_TABS.map((t) => (
          <button
            key={t.id || 'all'}
            onClick={() => { setDirection(t.id); setPage(1); }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              direction === t.id
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <Icon icon={t.icon} className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700" />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="px-3 py-1.5 rounded-full text-sm bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-none outline-none"
        >
          <option value="">Any status</option>
          <option value="sent">Sent</option>
          <option value="delivered">Delivered</option>
          <option value="read">Read</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Search */}
      <div className="relative">
        <Icon icon="lucide:search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search number, name, or message text…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Spinner size="md" /></div>
        ) : logs.length === 0 ? (
          <EmptyState icon="lucide:webhook" title="No webhook events yet"
            description="Incoming and outgoing WhatsApp messages will appear here with delivery status." />
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {logs.map((log) => {
              const isOut = log.direction === 'outbound';
              const isOpen = expanded === log._id;
              return (
                <li key={log._id}>
                  <button
                    onClick={() => setExpanded(isOpen ? null : log._id)}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    {/* Direction icon */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      isOut ? 'bg-green-50 dark:bg-green-900/20' : 'bg-blue-50 dark:bg-blue-900/20'
                    }`}>
                      <Icon
                        icon={isOut ? 'lucide:arrow-left' : 'lucide:arrow-right'}
                        className={`w-4 h-4 ${isOut ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {isOut ? 'To' : 'From'} <span className="font-mono">+{log.phone}</span>
                          {log.clientId?.name && <span className="text-gray-400 font-normal"> · {log.clientId.name}</span>}
                        </span>
                        <span className="text-[11px] text-gray-400 dark:text-gray-500 shrink-0">{formatWhen(log.timestamp)}</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{bodyText(log)}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] uppercase tracking-wide text-gray-400">{log.type}</span>
                        {isOut && <StatusPill status={log.status} />}
                      </div>
                    </div>
                    <Icon icon={isOpen ? 'lucide:chevron-up' : 'lucide:chevron-down'} className="w-4 h-4 text-gray-300 shrink-0 mt-1" />
                  </button>

                  {/* Expanded raw detail */}
                  {isOpen && (
                    <div className="px-4 pb-3 pl-15">
                      <pre className="text-[11px] bg-gray-50 dark:bg-gray-950 rounded-lg p-3 overflow-x-auto text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-gray-800">
{JSON.stringify({
  direction: log.direction,
  type: log.type,
  status: log.status,
  phone: log.phone,
  senderName: log.senderName,
  waMessageId: log.waMessageId,
  content: log.content,
  timestamp: log.timestamp,
}, null, 2)}
                      </pre>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800">
              <Icon icon="lucide:chevron-left" className="w-4 h-4" />
            </button>
            <span className="text-gray-600 dark:text-gray-400 px-2">Page {page} / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800">
              <Icon icon="lucide:chevron-right" className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
