import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import useAuthStore from '../store/authStore';
import { usageAPI } from '../services/api';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';

const DB_METRICS = [
  { key: 'users',    label: 'Team Members', icon: 'lucide:users',        color: 'blue'    },
  { key: 'clients',  label: 'Clients',      icon: 'lucide:briefcase',    color: 'purple'  },
  { key: 'projects', label: 'Projects',     icon: 'lucide:folder',       color: 'amber'   },
  { key: 'tasks',    label: 'Tasks',        icon: 'lucide:check-circle', color: 'emerald' },
  { key: 'invoices', label: 'Invoices',     icon: 'lucide:file-text',    color: 'indigo'  },
  { key: 'meetings', label: 'Meetings',     icon: 'lucide:video',        color: 'rose'    },
];

const COLOR_MAP = {
  blue:    { bg: 'bg-blue-50 dark:bg-blue-900/20',       text: 'text-blue-600 dark:text-blue-400' },
  purple:  { bg: 'bg-purple-50 dark:bg-purple-900/20',   text: 'text-purple-600 dark:text-purple-400' },
  amber:   { bg: 'bg-amber-50 dark:bg-amber-900/20',     text: 'text-amber-600 dark:text-amber-400' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400' },
  indigo:  { bg: 'bg-indigo-50 dark:bg-indigo-900/20',   text: 'text-indigo-600 dark:text-indigo-400' },
  rose:    { bg: 'bg-rose-50 dark:bg-rose-900/20',       text: 'text-rose-600 dark:text-rose-400' },
};

const ACTIVITY_TABS = [
  { id: '',         label: 'All' },
  { id: 'api',      label: 'API' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'email',    label: 'Email' },
];

function StatCard({ icon, label, value, color = 'blue' }) {
  const c = COLOR_MAP[color] || COLOR_MAP.blue;
  return (
    <Card>
      <div className="flex items-center gap-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${c.bg}`}>
          <Icon icon={icon} className={`w-5 h-5 ${c.text}`} />
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{(value ?? 0).toLocaleString('en-IN')}</p>
        </div>
      </div>
    </Card>
  );
}

function ActivityRow({ log }) {
  const typeMeta = {
    api:      { icon: 'lucide:activity',      color: 'text-blue-500'    },
    email:    { icon: 'lucide:mail',          color: 'text-amber-500'   },
    whatsapp: { icon: 'mdi:whatsapp',         color: 'text-emerald-500' },
  };
  const m = typeMeta[log.type] || typeMeta.api;
  return (
    <li className="flex items-start gap-3 py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 mt-0.5">
        <Icon icon={m.icon} className={`w-3.5 h-3.5 ${m.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
            {log.type === 'api' ? (
              <span className="font-mono">
                {log.method} {log.path}
                <span className={`ml-2 text-xs ${log.success ? 'text-emerald-600' : 'text-red-500'}`}>
                  {log.statusCode}
                </span>
              </span>
            ) : (
              <span>{log.subject || `${log.type} → ${log.to || '—'}`}</span>
            )}
          </p>
          <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
            {new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
          {log.userEmail || 'system'}
          {log.type !== 'api' && log.to ? <> · to {log.to}</> : null}
          {log.durationMs ? <> · {log.durationMs}ms</> : null}
          {!log.success && log.errorMsg ? <> · <span className="text-red-500">{log.errorMsg}</span></> : null}
        </p>
      </div>
    </li>
  );
}

export default function DataUsage({ onMenuClick }) {
  const { user } = useAuthStore();
  const isPO = user?.role === 'product_owner';
  const [superadmins, setSuperadmins] = useState([]);
  const [selectedSA, setSelectedSA] = useState('');
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activityFilter, setActivityFilter] = useState('');

  useEffect(() => {
    if (isPO) {
      usageAPI.listSuperadmins().then((r) => setSuperadmins(r.data?.data || [])).catch(() => {});
    }
  }, [isPO]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = isPO && selectedSA ? { superadminId: selectedSA } : {};
    usageAPI.getOverview(params)
      .then((r) => { if (!cancelled) setOverview(r.data?.data || null); })
      .catch(() => { if (!cancelled) setOverview(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedSA, isPO]);

  const recent = overview?.recent || [];
  const filtered = activityFilter ? recent.filter((l) => l.type === activityFilter) : recent;

  const scopeLabel = (() => {
    if (!overview?.target) return 'Your organization';
    const { kind, name } = overview.target;
    if (kind === 'platform') return 'Entire platform';
    if (kind === 'superadmin') return name ? `${name}'s organizations` : 'Superadmin';
    if (kind === 'org') return name || 'Organization';
    return 'Your organization';
  })();

  return (
    <div>
      <Header
        title="Data & Activity"
        subtitle={loading ? 'Loading…' : scopeLabel}
        onMenuClick={onMenuClick}
      />

      {/* Superadmin selector — product_owner only */}
      {isPO && (
        <div className="mb-6 flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">View stats for:</label>
          <select
            value={selectedSA}
            onChange={(e) => setSelectedSA(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-blue-500"
          >
            <option value="">Entire platform</option>
            {superadmins.map((s) => (
              <option key={s._id} value={s._id}>{s.name} — {s.email}</option>
            ))}
          </select>
        </div>
      )}

      {loading && !overview ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : !overview ? (
        <EmptyState icon="lucide:database" title="No data" description="Couldn't load usage stats." />
      ) : (
        <div className="space-y-6">
          {/* DB stats */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">
              Database records
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
              {DB_METRICS.map((m) => (
                <StatCard
                  key={m.key}
                  icon={m.icon}
                  label={m.label}
                  value={overview.db?.[m.key]}
                  color={m.color}
                />
              ))}
            </div>
          </div>

          {/* Activity summary */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">
              Activity this month
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon icon="lucide:activity" className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">API Requests</span>
                  </div>
                  {!!overview.activity.api.errorsThisMonth && (
                    <span className="text-xs text-red-500 font-semibold">{overview.activity.api.errorsThisMonth} errors</span>
                  )}
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                  {overview.activity.api.thisMonth.toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {overview.activity.api.today.toLocaleString('en-IN')} today
                </p>
              </Card>
              <Card>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon icon="lucide:mail" className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Emails Sent</span>
                  </div>
                  {!!overview.activity.email.failedThisMonth && (
                    <span className="text-xs text-red-500 font-semibold">{overview.activity.email.failedThisMonth} failed</span>
                  )}
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                  {overview.activity.email.thisMonth.toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {overview.activity.email.today.toLocaleString('en-IN')} today
                </p>
              </Card>
              <Card>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon icon="mdi:whatsapp" className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">WhatsApp Sends</span>
                  </div>
                  {!!overview.activity.whatsapp.failedThisMonth && (
                    <span className="text-xs text-red-500 font-semibold">{overview.activity.whatsapp.failedThisMonth} failed</span>
                  )}
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                  {overview.activity.whatsapp.thisMonth.toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {overview.activity.whatsapp.today.toLocaleString('en-IN')} today
                </p>
              </Card>
            </div>
          </div>

          {/* 6-month trend chart */}
          <Card>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">6-month activity trend</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overview.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="api"      name="API"      fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="email"    name="Email"    fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="whatsapp" name="WhatsApp" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Recent activity feed */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Recent activity</h3>
              <div className="flex items-center gap-1">
                {ACTIVITY_TABS.map((t) => (
                  <button
                    key={t.id || 'all'}
                    onClick={() => setActivityFilter(t.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      activityFilter === t.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            {filtered.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">No activity matches this filter.</p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map((log) => (
                  <ActivityRow key={log._id} log={log} />
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
