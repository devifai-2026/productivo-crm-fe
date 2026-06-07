import { useEffect, useState, useCallback } from 'react';
import { Icon } from '@iconify/react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config/env';
import useAuthStore from '../store/authStore';
import { usageAPI } from '../services/api';
import Header from '../components/layout/Header';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import {
  GrafanaShell, GrafanaPanel, GrafanaStat, GrafanaDonut, GrafanaMultiBar, LiveDot,
} from '../components/grafana/GrafanaKit';
import { NEON } from '../components/grafana/grafanaTheme';

const DB_METRICS = [
  { key: 'users',    label: 'Team Members', icon: 'lucide:users',        accent: 'cyan'   },
  { key: 'clients',  label: 'Clients',      icon: 'lucide:briefcase',    accent: 'violet' },
  { key: 'projects', label: 'Projects',     icon: 'lucide:folder',       accent: 'amber'  },
  { key: 'tasks',    label: 'Tasks',        icon: 'lucide:check-circle', accent: 'green'  },
  { key: 'invoices', label: 'Invoices',     icon: 'lucide:file-text',    accent: 'blue'   },
  { key: 'meetings', label: 'Meetings',     icon: 'lucide:video',        accent: 'pink'   },
];

const ACTIVITY_TABS = [
  { id: '',         label: 'All' },
  { id: 'api',      label: 'API' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'email',    label: 'Email' },
];

// Grafana terminal-style activity row (shared style with the SuperAdmin logs).
function ActivityRow({ log }) {
  const typeMeta = {
    api:      { icon: 'lucide:activity', color: NEON.blue },
    email:    { icon: 'lucide:mail',     color: NEON.amber },
    whatsapp: { icon: 'mdi:whatsapp',    color: NEON.green },
  };
  const m = typeMeta[log.type] || typeMeta.api;
  return (
    <li className="flex items-start gap-3 py-2 px-1 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03] transition-colors font-mono">
      <span className="text-[10px] text-slate-600 shrink-0 mt-1 tabular-nums w-12">
        {new Date(log.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
      </span>
      <Icon icon={m.icon} className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: m.color }} />
      <div className="flex-1 min-w-0">
        <p className="text-xs truncate">
          {log.type === 'api' ? (
            <span>
              <span className="text-cyan-300/90">{log.method}</span>{' '}
              <span className="text-slate-300">{log.path}</span>
              <span className={`ml-2 ${log.success ? 'text-emerald-400' : 'text-rose-400'}`}>{log.statusCode}</span>
            </span>
          ) : (
            <span className="text-slate-200">{log.subject || `${log.type} → ${log.to || '—'}`}</span>
          )}
        </p>
        <p className="text-[10px] text-slate-500 mt-0.5 truncate">
          {log.userEmail || 'system'}
          {log.type !== 'api' && log.to ? <> · to {log.to}</> : null}
          {log.durationMs ? <> · {log.durationMs}ms</> : null}
          {!log.success && log.errorMsg ? <> · <span className="text-rose-400">{log.errorMsg}</span></> : null}
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
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (isPO) {
      usageAPI.listSuperadmins().then((r) => setSuperadmins(r.data?.data || [])).catch(() => {});
    }
  }, [isPO]);

  const loadOverview = useCallback((showSpinner = true) => {
    if (showSpinner) setLoading(true);
    const params = isPO && selectedSA ? { superadminId: selectedSA } : {};
    return usageAPI.getOverview(params)
      .then((r) => setOverview(r.data?.data || null))
      .catch(() => setOverview(null))
      .finally(() => setLoading(false));
  }, [isPO, selectedSA]);

  useEffect(() => { loadOverview(true); }, [loadOverview]);

  // Live binding — join the platform-wide admin room; refresh stats on push.
  useEffect(() => {
    const socket = io(SOCKET_URL, { query: { admin: '1' }, transports: ['websocket', 'polling'] });
    socket.on('connect', () => setLive(true));
    socket.on('disconnect', () => setLive(false));
    socket.on('admin:payments', () => loadOverview(false));
    return () => socket.disconnect();
  }, [loadOverview]);

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

  const act = overview?.activity;
  return (
    <div>
      <Header
        title="Data & Activity"
        subtitle={loading ? 'Loading…' : scopeLabel}
        onMenuClick={onMenuClick}
      />

      <GrafanaShell>
        {/* Console header strip + scope selector */}
        <div className="flex items-center justify-between gap-3 flex-wrap px-1 pb-3 mb-1">
          <div className="flex items-center gap-2 font-mono text-xs text-cyan-300/80">
            <Icon icon="lucide:terminal" className="w-4 h-4" />
            <span className="tracking-widest uppercase truncate">data // {scopeLabel}</span>
          </div>
          <div className="flex items-center gap-3">
            {isPO && (
              <select
                value={selectedSA}
                onChange={(e) => setSelectedSA(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] text-xs font-mono text-slate-200 outline-none focus:border-cyan-500/40"
              >
                <option value="" className="bg-[#0e1426]">Entire platform</option>
                {superadmins.map((s) => (
                  <option key={s._id} value={s._id} className="bg-[#0e1426]">{s.name} — {s.email}</option>
                ))}
              </select>
            )}
            <LiveDot live={live} />
          </div>
        </div>

        {loading && !overview ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : !overview ? (
          <EmptyState icon="lucide:database" title="No data" description="Couldn't load usage stats." />
        ) : (
          <div className="space-y-4">
            {/* DB record readouts */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              {DB_METRICS.map((m) => (
                <GrafanaStat key={m.key} label={m.label} value={(overview.db?.[m.key] ?? 0).toLocaleString('en-IN')} icon={m.icon} accent={m.accent} />
              ))}
            </div>

            {/* Activity-this-month readouts (with mini sparkline from the 6-month trend) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <GrafanaStat label="API requests · month" value={(act.api.thisMonth || 0).toLocaleString('en-IN')} icon="lucide:activity" accent="blue"
                sub={`${(act.api.today || 0).toLocaleString('en-IN')} today${act.api.errorsThisMonth ? ` · ${act.api.errorsThisMonth} err` : ''}`}
                spark={(overview.trend || []).map((t) => t.api)} />
              <GrafanaStat label="Emails sent · month" value={(act.email.thisMonth || 0).toLocaleString('en-IN')} icon="lucide:mail" accent="amber"
                sub={`${(act.email.today || 0).toLocaleString('en-IN')} today${act.email.failedThisMonth ? ` · ${act.email.failedThisMonth} failed` : ''}`}
                spark={(overview.trend || []).map((t) => t.email)} />
              <GrafanaStat label="WhatsApp · month" value={(act.whatsapp.thisMonth || 0).toLocaleString('en-IN')} icon="mdi:whatsapp" accent="green"
                sub={`${(act.whatsapp.today || 0).toLocaleString('en-IN')} today${act.whatsapp.failedThisMonth ? ` · ${act.whatsapp.failedThisMonth} failed` : ''}`}
                spark={(overview.trend || []).map((t) => t.whatsapp)} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* 6-month trend */}
              <GrafanaPanel title="6-month activity trend" icon="lucide:bar-chart-3" accent="cyan" className="lg:col-span-2">
                <GrafanaMultiBar
                  data={overview.trend || []}
                  xKey="month"
                  series={[
                    { key: 'api', label: 'API', color: NEON.blue },
                    { key: 'email', label: 'Email', color: NEON.amber },
                    { key: 'whatsapp', label: 'WhatsApp', color: NEON.green },
                  ]}
                />
              </GrafanaPanel>

              {/* This-month channel mix */}
              <GrafanaPanel title="Channel mix · month" icon="lucide:pie-chart" accent="violet">
                <GrafanaDonut
                  data={[
                    { name: 'API', value: act.api.thisMonth || 0, color: NEON.blue },
                    { name: 'Email', value: act.email.thisMonth || 0, color: NEON.amber },
                    { name: 'WhatsApp', value: act.whatsapp.thisMonth || 0, color: NEON.green },
                  ]}
                />
              </GrafanaPanel>
            </div>

            {/* Recent activity stream — terminal style */}
            <GrafanaPanel title="Recent activity" icon="lucide:scroll-text" accent="green"
              right={
                <div className="flex items-center gap-1">
                  {ACTIVITY_TABS.map((t) => (
                    <button key={t.id || 'all'} onClick={() => setActivityFilter(t.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider transition-colors border ${
                        activityFilter === t.id
                          ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
                          : 'bg-white/[0.03] text-slate-400 border-white/5 hover:text-slate-200'
                      }`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              }>
              {filtered.length === 0 ? (
                <p className="text-xs text-slate-500 py-8 text-center font-mono">// no activity matches this filter</p>
              ) : (
                <ul className="max-h-[28rem] overflow-y-auto no-scrollbar">
                  {filtered.map((log) => <ActivityRow key={log._id} log={log} />)}
                </ul>
              )}
            </GrafanaPanel>
          </div>
        )}
      </GrafanaShell>
    </div>
  );
}
