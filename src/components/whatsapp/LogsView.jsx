import { useEffect, useState, useRef } from 'react';
import { Icon } from '@iconify/react';
import { whatsappAddonAPI } from '../../services/api';
import Input from '../ui/Input';
import Spinner from '../ui/Spinner';
import EmptyState from '../ui/EmptyState';

const FEATURE_TABS = [
  { id: '', label: 'All', icon: 'lucide:list' },
  { id: 'invoice', label: 'Invoices', icon: 'lucide:file-text' },
  { id: 'task_reminder', label: 'Tasks', icon: 'lucide:bell' },
  { id: 'meeting_invite', label: 'Meetings', icon: 'lucide:calendar' },
];

const PAGE_SIZE = 25;

function stripPrefix(subject) {
  return (subject || '').replace(/^\[(invoice|task_reminder|meeting_invite)\]\s*/i, '');
}

function formatWhen(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function LogsView() {
  const [feature, setFeature] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const searchTimer = useRef(null);

  // Debounce the search input → q
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setQ(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(searchTimer.current);
  }, [searchInput]);

  // Fetch when any filter changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    whatsappAddonAPI
      .getLogs({ feature: feature || undefined, q: q || undefined, from: from || undefined, to: to || undefined, page, limit: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return;
        setLogs(res.data?.data || []);
        setTotal(res.data?.total || 0);
      })
      .catch(() => {
        if (!cancelled) {
          setLogs([]);
          setTotal(0);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [feature, q, from, to, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const clearFilters = () => {
    setFeature('');
    setSearchInput('');
    setQ('');
    setFrom('');
    setTo('');
    setPage(1);
  };
  const hasFilters = !!(feature || q || from || to);

  return (
    <div className="space-y-4">
      {/* Feature tabs */}
      <div className="flex items-center gap-2 overflow-x-auto">
        {FEATURE_TABS.map((t) => (
          <button
            key={t.id || 'all'}
            onClick={() => { setFeature(t.id); setPage(1); }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors shrink-0 ${
              feature === t.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <Icon icon={t.icon} className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Icon icon="lucide:search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search recipient or subject..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-3">
          <Input
            type="date"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1); }}
            className="w-36"
          />
          <Input
            type="date"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1); }}
            className="w-36"
          />
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="md" />
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon="mdi:whatsapp"
            title="No WhatsApp sends yet"
            description={hasFilters ? 'Try different filters.' : 'Your sent invoices, reminders, and invites will appear here.'}
          />
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {logs.map((log) => (
              <li key={log._id} className="flex items-start gap-3 px-4 py-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  log.success ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'
                }`}>
                  <Icon
                    icon={log.success ? 'mdi:whatsapp' : 'lucide:alert-circle'}
                    className={`w-4 h-4 ${log.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-gray-900 dark:text-gray-100 font-medium truncate">
                      {stripPrefix(log.subject)}
                    </p>
                    <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                      {formatWhen(log.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    to <span className="font-mono">{log.to || '—'}</span>
                    {log.userEmail ? <> · by {log.userEmail}</> : null}
                  </p>
                  {!log.success && log.errorMsg && (
                    <p className="text-xs text-red-500 mt-0.5 truncate">{log.errorMsg}</p>
                  )}
                </div>
              </li>
            ))}
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
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Icon icon="lucide:chevron-left" className="w-4 h-4" />
            </button>
            <span className="text-gray-600 dark:text-gray-400 text-sm px-2">
              Page {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Icon icon="lucide:chevron-right" className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
