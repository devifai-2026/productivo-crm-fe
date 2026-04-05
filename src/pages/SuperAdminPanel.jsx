import { useState, useEffect, useCallback } from 'react';
import { Icon } from '@iconify/react';
import { format, parseISO } from 'date-fns';
import { superAdminAPI, featureFlagAPI } from '../services/api';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Select from '../components/ui/Select';
import Spinner from '../components/ui/Spinner';

function StatCard({ label, value, icon, color = 'blue', sub }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
  };
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colors[color]}`}>
        <Icon icon={icon} className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-xl font-bold text-gray-900 dark:text-gray-50">{value?.toLocaleString() ?? '—'}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function UsageMeter({ label, used, limit, color = 'blue' }) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const barColor =
    pct >= 90 ? 'bg-red-500' :
    pct >= 70 ? 'bg-amber-500' :
    color === 'emerald' ? 'bg-emerald-500' : 'bg-blue-500';
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
        <span>{label}</span>
        <span>{used?.toLocaleString()} / {limit?.toLocaleString()}</span>
      </div>
      <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{pct.toFixed(1)}% used</p>
    </div>
  );
}

const METHOD_COLORS = {
  GET: 'text-emerald-600 dark:text-emerald-400',
  POST: 'text-blue-600 dark:text-blue-400',
  PUT: 'text-amber-600 dark:text-amber-400',
  PATCH: 'text-purple-600 dark:text-purple-400',
  DELETE: 'text-red-600 dark:text-red-400',
};

export default function SuperAdminPanel({ onMenuClick }) {
  const [overview, setOverview] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logPagination, setLogPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [logType, setLogType] = useState('api');
  const [logSuccess, setLogSuccess] = useState('');
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [payments, setPayments] = useState(null);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentPage, setPaymentPage] = useState(1);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');

  // Feature flags state
  const [waFlags, setWaFlags] = useState([]);
  const [loadingWaFlags, setLoadingWaFlags] = useState(false);
  const [waSaving, setWaSaving] = useState({}); // { [superadminId]: bool }
  const [waForm, setWaForm] = useState({}); // { [superadminId]: { isEnabled, expiryLabel, customDate, note } }

  const fetchWaFlags = useCallback(async () => {
    setLoadingWaFlags(true);
    try {
      const res = await featureFlagAPI.listWhatsapp();
      const list = res.data?.data || [];
      setWaFlags(list);
      // Initialize form state for each entry
      const forms = {};
      list.forEach((entry) => {
        forms[entry.superadminId] = {
          isEnabled: entry.whatsapp.isEnabled,
          expiryLabel: entry.whatsapp.expiryLabel || 'never',
          customDate: '',
          note: entry.whatsapp.note || '',
        };
      });
      setWaForm(forms);
    } catch {
      setWaFlags([]);
    }
    setLoadingWaFlags(false);
  }, []);

  const handleWaSave = async (superadminId) => {
    const form = waForm[superadminId];
    if (!form) return;
    setWaSaving((prev) => ({ ...prev, [superadminId]: true }));
    try {
      await featureFlagAPI.setWhatsapp(superadminId, {
        isEnabled: form.isEnabled,
        expiryLabel: form.expiryLabel,
        customDate: form.expiryLabel === 'custom' ? form.customDate : undefined,
        note: form.note || undefined,
      });
      await fetchWaFlags();
    } catch {
      // silently fail
    }
    setWaSaving((prev) => ({ ...prev, [superadminId]: false }));
  };

  const fetchOverview = async () => {
    setLoadingOverview(true);
    try {
      const res = await superAdminAPI.getOverview();
      setOverview(res.data?.data || null);
    } catch {
      setOverview(null);
    }
    setLoadingOverview(false);
  };

  const fetchLogs = useCallback(async (page = 1) => {
    setLoadingLogs(true);
    try {
      const params = { type: logType, page, limit: 50 };
      if (logSuccess !== '') params.success = logSuccess;
      const res = await superAdminAPI.getLogs(params);
      const d = res.data?.data || {};
      setLogs(d.logs || []);
      setLogPagination(d.pagination || { total: 0, page: 1, pages: 1 });
    } catch {
      setLogs([]);
    }
    setLoadingLogs(false);
  }, [logType, logSuccess]);

  const fetchPayments = useCallback(async (page = 1) => {
    setLoadingPayments(true);
    try {
      const params = { page, limit: 20 };
      if (paymentStatusFilter) params.status = paymentStatusFilter;
      const res = await superAdminAPI.getPayments(params);
      setPayments(res.data?.data || null);
      setPaymentPage(page);
    } catch {
      setPayments(null);
    }
    setLoadingPayments(false);
  }, [paymentStatusFilter]);

  useEffect(() => { fetchOverview(); }, []);
  useEffect(() => { if (activeTab === 'logs') fetchLogs(1); }, [activeTab, fetchLogs]);
  useEffect(() => { if (activeTab === 'payments') fetchPayments(1); }, [activeTab, fetchPayments]);
  useEffect(() => { if (activeTab === 'features') fetchWaFlags(); }, [activeTab, fetchWaFlags]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'lucide:layout-dashboard' },
    { id: 'db', label: 'DB Usage', icon: 'lucide:database' },
    { id: 'usage', label: 'Usage & Limits', icon: 'lucide:bar-chart-2' },
    { id: 'payments', label: 'Paid Users', icon: 'lucide:credit-card' },
    { id: 'logs', label: 'Activity Logs', icon: 'lucide:scroll-text' },
    { id: 'orgs', label: 'Client Usage', icon: 'lucide:building-2' },
    { id: 'enquiries', label: 'Enquiries', icon: 'mdi:email-newsletter' },
    { id: 'features', label: 'Feature Flags', icon: 'lucide:zap' },
  ];

  return (
    <div>
      <Header
        title="Super Admin Panel"
        subtitle="Platform-wide activity, usage, and analytics"
        onMenuClick={onMenuClick}
        actionLabel="Refresh"
        actionIcon="lucide:refresh-cw"
        onAction={() => { fetchOverview(); if (activeTab === 'logs') fetchLogs(1); }}
      />

      {/* Tabs — horizontally scrollable so all 6 tabs are always reachable */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1 scrollbar-none">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-all duration-150 shrink-0
              ${activeTab === t.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }
              ${t.id === 'enquiries' ? 'border border-amber-300 dark:border-amber-700' : ''}
            `}
          >
            <Icon icon={t.icon} className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {loadingOverview && !overview ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <>
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && overview && (
            <div className="space-y-6">
              {/* DB Stats */}
              <div>
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Database</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                  <StatCard label="Users" value={overview.db.users} icon="lucide:users" color="blue" />
                  <StatCard label="Orgs" value={overview.db.organizations} icon="lucide:building-2" color="purple" />
                  <StatCard label="Clients" value={overview.db.clients} icon="lucide:user-check" color="emerald" />
                  <StatCard label="Projects" value={overview.db.projects} icon="lucide:folder" color="amber" />
                  <StatCard label="Tasks" value={overview.db.tasks} icon="lucide:check-square" color="blue" />
                  <StatCard label="Meetings" value={overview.db.meetings} icon="lucide:video" color="purple" />
                  <StatCard label="Invoices" value={overview.db.invoices} icon="lucide:file-text" color="emerald" />
                  <StatCard label="Enquiries" value={overview.db.enquiries} icon="mdi:email-newsletter" color="amber" sub={`${overview.enquiries?.new || 0} new`} />
                </div>
              </div>

              {/* API Stats */}
              <div>
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Platform Activity (Today)</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard label="API Calls" value={overview.api.today} icon="lucide:activity" color="blue" />
                  <StatCard label="Errors Today" value={overview.api.errorsToday} icon="lucide:alert-triangle" color="red" />
                  <StatCard label="Emails Today" value={overview.email.today} icon="lucide:mail" color="emerald" />
                  <StatCard label="WhatsApp Today" value={overview.whatsapp.today} icon="lucide:message-circle" color="purple" sub={`Limit: ${overview.whatsapp.dailyLimit}/day`} />
                </div>
              </div>

              {/* Monthly chart */}
              <div>
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Monthly Volume (Last 6 Months)</h2>
                <Card padding={false}>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800">
                          <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Month</th>
                          <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">API Calls</th>
                          <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Emails Sent</th>
                          <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">WhatsApp Sent</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                        {(overview.api.monthly || []).map((m, i) => (
                          <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="px-5 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{m.month}</td>
                            <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-400 text-right">{m.api?.toLocaleString()}</td>
                            <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-400 text-right">{m.emails?.toLocaleString()}</td>
                            <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-400 text-right">{m.whatsapp?.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>

              {/* Top endpoints */}
              <div>
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Top Endpoints Today</h2>
                <Card padding={false}>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800">
                          <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Endpoint</th>
                          <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Calls</th>
                          <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Avg ms</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                        {(overview.api.topEndpoints || []).map((ep, i) => (
                          <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="px-5 py-3 text-sm font-mono">
                              <span className={`font-semibold mr-2 ${METHOD_COLORS[ep.method] || 'text-gray-600'}`}>{ep.method}</span>
                              <span className="text-gray-700 dark:text-gray-300">{ep.path}</span>
                            </td>
                            <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-400 text-right">{ep.count}</td>
                            <td className="px-5 py-3 text-sm text-gray-500 text-right">{ep.avgMs}ms</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* DB USAGE TAB */}
          {activeTab === 'db' && overview && (
            <div className="space-y-6">
              {/* MongoDB global stats */}
              <div>
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Total DB Usage (All Clients)</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <StatCard label="Collections" value={overview.db.native?.totalCollections} icon="lucide:layers" color="blue" />
                  <StatCard label="Total Documents" value={overview.db.native?.totalDocuments} icon="lucide:file" color="purple" />
                  <StatCard label="Data Size" value={overview.db.native?.dataSizeKB != null ? `${(overview.db.native.dataSizeKB / 1024).toFixed(1)} MB` : '—'} icon="lucide:hard-drive" color="emerald" />
                  <StatCard label="Storage Size" value={overview.db.native?.storageSizeKB != null ? `${(overview.db.native.storageSizeKB / 1024).toFixed(1)} MB` : '—'} icon="lucide:database" color="amber" />
                  <StatCard label="Index Size" value={overview.db.native?.indexSizeKB != null ? `${(overview.db.native.indexSizeKB / 1024).toFixed(1)} MB` : '—'} icon="lucide:search" color="blue" />
                  <StatCard label="Avg Doc Size" value={overview.db.native?.avgObjSizeBytes != null ? `${overview.db.native.avgObjSizeBytes} B` : '—'} icon="lucide:ruler" color="purple" />
                </div>
              </div>

              {/* Document counts per model */}
              <div>
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Document Counts</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard label="Users" value={overview.db.users} icon="lucide:users" color="blue" />
                  <StatCard label="Organizations" value={overview.db.organizations} icon="lucide:building-2" color="purple" />
                  <StatCard label="Clients" value={overview.db.clients} icon="lucide:user-check" color="emerald" />
                  <StatCard label="Projects" value={overview.db.projects} icon="lucide:folder" color="amber" />
                  <StatCard label="Tasks" value={overview.db.tasks} icon="lucide:check-square" color="blue" />
                  <StatCard label="Meetings" value={overview.db.meetings} icon="lucide:video" color="purple" />
                  <StatCard label="Invoices" value={overview.db.invoices} icon="lucide:file-text" color="emerald" />
                  <StatCard label="Activity Logs" value={overview.db.activityLogs} icon="lucide:scroll-text" color="amber" />
                </div>
              </div>

              {/* Per-collection stats table */}
              <div>
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Per-Collection Stats</h2>
                <Card padding={false}>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800">
                          <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Collection</th>
                          <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Documents</th>
                          <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Data (KB)</th>
                          <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Avg Doc (B)</th>
                          <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Index (KB)</th>
                          <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Indexes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                        {(overview.db.collections || []).map((col) => (
                          <tr key={col.name} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="px-5 py-3 text-sm font-mono font-medium text-gray-900 dark:text-gray-100">{col.name}</td>
                            <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-400 text-right">{col.count?.toLocaleString()}</td>
                            <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-400 text-right">{col.sizeKB?.toLocaleString()}</td>
                            <td className="px-5 py-3 text-sm text-gray-500 text-right">{col.avgObjSizeBytes}</td>
                            <td className="px-5 py-3 text-sm text-gray-500 text-right">{col.totalIndexSizeKB?.toLocaleString()}</td>
                            <td className="px-5 py-3 text-sm text-gray-500 text-right">{col.indexes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* USAGE TAB */}
          {activeTab === 'usage' && overview && (
            <div className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Email */}
                <Card>
                  <div className="flex items-center gap-2 mb-4">
                    <Icon icon="lucide:mail" className="w-5 h-5 text-emerald-500" />
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">Email Usage</h3>
                    <span className="ml-auto text-xs text-gray-400">Brevo free tier</span>
                  </div>
                  <div className="space-y-4">
                    <UsageMeter label="Today" used={overview.email.today} limit={overview.email.dailyLimit} color="emerald" />
                    <UsageMeter label="This Month" used={overview.email.thisMonth} limit={overview.email.monthlyLimit} color="emerald" />
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-lg font-bold text-gray-900 dark:text-gray-50">{overview.email.thisMonth}</p>
                      <p className="text-xs text-gray-500">This Month</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900 dark:text-gray-50">{overview.email.lastMonth}</p>
                      <p className="text-xs text-gray-500">Last Month</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-red-500">{overview.email.failedThisMonth}</p>
                      <p className="text-xs text-gray-500">Failed</p>
                    </div>
                  </div>
                </Card>

                {/* WhatsApp */}
                <Card>
                  <div className="flex items-center gap-2 mb-4">
                    <Icon icon="lucide:message-circle" className="w-5 h-5 text-green-500" />
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">WhatsApp Usage</h3>
                    <span className="ml-auto text-xs text-gray-400">Meta Cloud API</span>
                  </div>
                  <div className="space-y-4">
                    <UsageMeter label="Today" used={overview.whatsapp.today} limit={overview.whatsapp.dailyLimit} />
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-lg font-bold text-gray-900 dark:text-gray-50">{overview.whatsapp.thisMonth}</p>
                      <p className="text-xs text-gray-500">This Month</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900 dark:text-gray-50">{overview.whatsapp.lastMonth}</p>
                      <p className="text-xs text-gray-500">Last Month</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-red-500">{overview.whatsapp.failedThisMonth}</p>
                      <p className="text-xs text-gray-500">Failed</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Location APIs */}
              {overview.location && (
                <>
                  <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Location APIs</h2>
                  <div className="grid lg:grid-cols-2 gap-6">

                    {/* Country State City */}
                    <Card>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                          <Icon icon="lucide:map" className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Country State City API</h3>
                          <p className="text-xs text-gray-400">State &amp; city lookups · Free tier</p>
                        </div>
                        <div className={`ml-auto px-2 py-0.5 rounded-full text-xs font-semibold ${
                          overview.location.csc.monthCount / overview.location.csc.monthlyLimit >= 0.9
                            ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                            : overview.location.csc.monthCount / overview.location.csc.monthlyLimit >= 0.7
                            ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                        }`}>
                          {overview.location.csc.monthCount / overview.location.csc.monthlyLimit >= 0.9 ? 'Critical' :
                           overview.location.csc.monthCount / overview.location.csc.monthlyLimit >= 0.7 ? 'Warning' : 'Healthy'}
                        </div>
                      </div>

                      <div className="space-y-3 mt-4">
                        <UsageMeter label="Upstream calls today" used={overview.location.csc.dayCount} limit={overview.location.csc.dailyLimit} color="blue" />
                        <UsageMeter label="Upstream calls this month" used={overview.location.csc.monthCount} limit={overview.location.csc.monthlyLimit} color="blue" />
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 grid grid-cols-3 gap-3 text-center">
                        <div>
                          <p className="text-lg font-bold text-gray-900 dark:text-gray-50">{overview.location.csc.cacheHits.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">Cache hits</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-gray-900 dark:text-gray-50">{overview.location.csc.cacheSize} / 36</p>
                          <p className="text-xs text-gray-500">States cached</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-gray-900 dark:text-gray-50">{(overview.location.csc.monthlyLimit - overview.location.csc.monthCount).toLocaleString()}</p>
                          <p className="text-xs text-gray-500">Remaining / mo</p>
                        </div>
                      </div>

                      <div className="mt-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/40">
                        <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1.5">Free tier limits</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-blue-600 dark:text-blue-400">
                          <span>• 3,000 requests / month</span>
                          <span>• 100 requests / day</span>
                          <span className="col-span-2 text-blue-500 dark:text-blue-500 mt-0.5">
                            ✓ City results are cached permanently — each state is only fetched once
                          </span>
                        </div>
                      </div>
                    </Card>

                    {/* LocationIQ */}
                    <Card>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                          <Icon icon="lucide:map-pin" className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">LocationIQ</h3>
                          <p className="text-xs text-gray-400">Static map tiles · Free tier</p>
                        </div>
                        <div className={`ml-auto px-2 py-0.5 rounded-full text-xs font-semibold ${
                          overview.location.locationiq.dayCount / overview.location.locationiq.dailyLimit >= 0.9
                            ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                            : overview.location.locationiq.dayCount / overview.location.locationiq.dailyLimit >= 0.7
                            ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                        }`}>
                          {overview.location.locationiq.dayCount / overview.location.locationiq.dailyLimit >= 0.9 ? 'Critical' :
                           overview.location.locationiq.dayCount / overview.location.locationiq.dailyLimit >= 0.7 ? 'Warning' : 'Healthy'}
                        </div>
                      </div>

                      <div className="space-y-3 mt-4">
                        <UsageMeter label="Requests today" used={overview.location.locationiq.dayCount} limit={overview.location.locationiq.dailyLimit} color="blue" />
                      </div>

                      {/* Rate indicators */}
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        {/* Per-minute */}
                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                          <div className="flex items-end justify-between mb-1.5">
                            <span className="text-xs text-gray-500">This minute</span>
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                              {overview.location.locationiq.minuteCount} / {overview.location.locationiq.minuteLimit}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                overview.location.locationiq.minuteCount / overview.location.locationiq.minuteLimit >= 0.9 ? 'bg-red-500' :
                                overview.location.locationiq.minuteCount / overview.location.locationiq.minuteLimit >= 0.7 ? 'bg-amber-500' : 'bg-purple-500'
                              }`}
                              style={{ width: `${Math.min((overview.location.locationiq.minuteCount / overview.location.locationiq.minuteLimit) * 100, 100)}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-400 mt-1">60 req / min limit</p>
                        </div>
                        {/* Per-second */}
                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                          <div className="flex items-end justify-between mb-1.5">
                            <span className="text-xs text-gray-500">Last second</span>
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                              {overview.location.locationiq.secondCount} / {overview.location.locationiq.secondLimit}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                overview.location.locationiq.secondCount >= overview.location.locationiq.secondLimit ? 'bg-red-500' : 'bg-purple-500'
                              }`}
                              style={{ width: `${Math.min((overview.location.locationiq.secondCount / overview.location.locationiq.secondLimit) * 100, 100)}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-400 mt-1">2 req / sec limit</p>
                        </div>
                      </div>

                      <div className="mt-3 p-3 rounded-xl bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800/40">
                        <p className="text-xs text-purple-700 dark:text-purple-300 font-medium mb-1.5">Free tier limits</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-purple-600 dark:text-purple-400">
                          <span>• 5,000 requests / day</span>
                          <span>• 60 requests / minute</span>
                          <span>• 2 requests / second</span>
                          <span className="text-purple-500 dark:text-purple-500">Used for map tiles</span>
                        </div>
                      </div>
                    </Card>

                  </div>
                </>
              )}
            </div>
          )}

          {/* LOGS TAB */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Select
                  value={logType}
                  onChange={(e) => setLogType(e.target.value)}
                  options={[
                    { value: 'api', label: 'API Requests' },
                    { value: 'email', label: 'Emails' },
                    { value: 'whatsapp', label: 'WhatsApp' },
                  ]}
                />
                <Select
                  value={logSuccess}
                  onChange={(e) => setLogSuccess(e.target.value)}
                  placeholder="All"
                  options={[
                    { value: '', label: 'All' },
                    { value: 'true', label: 'Success' },
                    { value: 'false', label: 'Failed' },
                  ]}
                />
                <span className="text-xs text-gray-400 self-center">{logPagination.total} total</span>
              </div>

              <Card padding={false}>
                {loadingLogs ? (
                  <div className="py-16 flex justify-center"><Spinner /></div>
                ) : logs.length === 0 ? (
                  <div className="py-16 text-center text-gray-400 dark:text-gray-500 text-sm">No logs found</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800">
                          <th className="text-left font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Time</th>
                          {logType === 'api' && <>
                            <th className="text-left font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Method</th>
                            <th className="text-left font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Path</th>
                            <th className="text-left font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Status</th>
                            <th className="text-left font-medium text-gray-500 uppercase tracking-wider px-4 py-3">User</th>
                            <th className="text-right font-medium text-gray-500 uppercase tracking-wider px-4 py-3">ms</th>
                          </>}
                          {logType !== 'api' && <>
                            <th className="text-left font-medium text-gray-500 uppercase tracking-wider px-4 py-3">To</th>
                            <th className="text-left font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Subject</th>
                            <th className="text-left font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Status</th>
                          </>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                        {logs.map((log) => (
                          <tr key={log._id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 ${!log.success ? 'bg-red-50/50 dark:bg-red-900/5' : ''}`}>
                            <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                              {log.createdAt ? format(parseISO(log.createdAt), 'MMM d HH:mm:ss') : '—'}
                            </td>
                            {logType === 'api' && <>
                              <td className="px-4 py-2.5">
                                <span className={`font-semibold ${METHOD_COLORS[log.method] || 'text-gray-600'}`}>{log.method}</span>
                              </td>
                              <td className="px-4 py-2.5 font-mono text-gray-700 dark:text-gray-300 max-w-xs truncate">{log.path}</td>
                              <td className="px-4 py-2.5">
                                <span className={`font-medium ${
                                  log.statusCode >= 500 ? 'text-red-600' :
                                  log.statusCode >= 400 ? 'text-amber-600' :
                                  'text-emerald-600'
                                }`}>{log.statusCode}</span>
                              </td>
                              <td className="px-4 py-2.5 text-gray-500 truncate max-w-[120px]">{log.userEmail || '—'}</td>
                              <td className="px-4 py-2.5 text-gray-400 text-right">{log.durationMs ?? '—'}</td>
                            </>}
                            {logType !== 'api' && <>
                              <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{log.to || '—'}</td>
                              <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400 max-w-xs truncate">{log.subject || '—'}</td>
                              <td className="px-4 py-2.5">
                                {log.success
                                  ? <span className="text-emerald-600 font-medium">Sent</span>
                                  : <span className="text-red-500 font-medium" title={log.errorMsg}>Failed</span>
                                }
                              </td>
                            </>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {logPagination.pages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
                    <span className="text-xs text-gray-500">
                      Page {logPagination.page} of {logPagination.pages}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => fetchLogs(logPagination.page - 1)}
                        disabled={logPagination.page <= 1}
                        className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => fetchLogs(logPagination.page + 1)}
                        disabled={logPagination.page >= logPagination.pages}
                        className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* ENQUIRIES TAB */}
          {activeTab === 'enquiries' && overview && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <StatCard label="Total Enquiries" value={overview.enquiries?.total} icon="mdi:email-newsletter" color="blue" />
                <StatCard label="New / Unread" value={overview.enquiries?.new} icon="lucide:bell" color="amber" />
                <StatCard label="Premium Requests" value={overview.enquiries?.premium} icon="lucide:zap" color="purple" />
              </div>

              {/* Recent enquiries table */}
              <div>
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Recent Enquiries</h2>
                <Card padding={false}>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800">
                          <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Name</th>
                          <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Contact</th>
                          <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Source</th>
                          <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Message</th>
                          <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
                          <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Received</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                        {(overview.enquiries?.recent || []).length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">No enquiries yet</td>
                          </tr>
                        ) : (overview.enquiries?.recent || []).map((enq) => (
                          <tr key={enq._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0
                                  ${enq.source === 'premium_feature' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'}`}>
                                  {(enq.fullName || '?').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{enq.fullName}</p>
                                  {enq.orgName && <p className="text-xs text-gray-400">{enq.orgName}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <p className="text-sm text-gray-600 dark:text-gray-400">{enq.email}</p>
                              <p className="text-xs text-gray-400">{enq.phone}</p>
                            </td>
                            <td className="px-5 py-3.5">
                              {enq.source === 'premium_feature' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                  <Icon icon="lucide:zap" className="w-3 h-3" />
                                  Premium
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                  <Icon icon="lucide:globe" className="w-3 h-3" />
                                  Landing
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="text-sm text-gray-600 dark:text-gray-400 truncate block max-w-[200px]">
                                {enq.description?.length > 60 ? enq.description.slice(0, 60) + '…' : enq.description}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold
                                ${enq.status === 'new' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                  enq.status === 'converted' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                  'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                                {enq.status || 'new'}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-sm text-gray-500 whitespace-nowrap">
                              {enq.createdAt ? new Date(enq.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* PAYMENTS TAB — Purchase records from landing page */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              {/* Summary cards */}
              {payments?.summary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard
                    label="Total Revenue"
                    value={`₹${(payments.summary.totalRevenue || 0).toLocaleString('en-IN')}`}
                    icon="lucide:indian-rupee"
                    color="emerald"
                  />
                  <StatCard label="Paid" value={payments.summary.paid} icon="lucide:check-circle" color="emerald" />
                  <StatCard label="Pending" value={payments.summary.pending} icon="lucide:clock" color="amber" />
                  <StatCard label="Failed" value={payments.summary.failed} icon="lucide:x-circle" color="red" />
                </div>
              )}

              {/* Filter */}
              <div className="flex gap-3 flex-wrap">
                <Select
                  value={paymentStatusFilter}
                  onChange={(e) => { setPaymentStatusFilter(e.target.value); fetchPayments(1); }}
                  placeholder="All statuses"
                  options={[
                    { value: '', label: 'All' },
                    { value: 'paid', label: 'Paid' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'failed', label: 'Failed' },
                  ]}
                />
                {payments?.pagination && (
                  <span className="text-xs text-gray-400 self-center">{payments.pagination.total} total</span>
                )}
              </div>

              <Card padding={false}>
                {loadingPayments ? (
                  <div className="py-16 flex justify-center"><Spinner /></div>
                ) : !payments?.purchases?.length ? (
                  <div className="py-16 text-center text-gray-400 dark:text-gray-500 text-sm">No payment records found</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800">
                          <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Name</th>
                          <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Email</th>
                          <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Phone</th>
                          <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Plan</th>
                          <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Amount</th>
                          <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
                          <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                        {payments.purchases.map((p) => (
                          <tr key={p._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="px-5 py-3.5 text-sm font-medium text-gray-900 dark:text-gray-100">{p.name}</td>
                            <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-400">{p.email}</td>
                            <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-400">{p.phone}</td>
                            <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-400">{p.plan || 'Pro'}</td>
                            <td className="px-5 py-3.5 text-sm font-semibold text-gray-900 dark:text-gray-100 text-right">
                              ₹{(p.amount || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold
                                ${p.status === 'paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                  p.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                {p.status}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-sm text-gray-500 whitespace-nowrap">
                              {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {payments?.pagination?.pages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
                    <span className="text-xs text-gray-500">Page {paymentPage} of {payments.pagination.pages}</span>
                    <div className="flex gap-2">
                      <button onClick={() => fetchPayments(paymentPage - 1)} disabled={paymentPage <= 1}
                        className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40">Previous</button>
                      <button onClick={() => fetchPayments(paymentPage + 1)} disabled={paymentPage >= payments.pagination.pages}
                        className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40">Next</button>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* CLIENT USAGE TAB — DB + API + comms usage per paid superadmin */}
          {activeTab === 'orgs' && overview && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Usage breakdown per paid client (superadmin) — includes all their orgs, org admins, and employees.
              </p>
              {(overview.superadminBreakdown || []).length === 0 ? (
                <div className="py-16 text-center text-gray-400 text-sm">No paid clients yet</div>
              ) : (overview.superadminBreakdown || []).map((group, i) => (
                <Card key={i}>
                  {/* Client header */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                      <Icon icon="lucide:user" className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {group.superadmin?.name || 'Unassigned'}
                      </p>
                      <p className="text-xs text-gray-400">{group.superadmin?.email || '—'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {group.orgs.length} org{group.orgs.length !== 1 ? 's' : ''}: {group.orgs.map((o) => o.name + (o.isMaster ? '' : ' (child)')).join(', ')}
                      </p>
                    </div>
                  </div>

                  {/* 3-column grid: DB | API | Comms */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                    {/* DB Usage */}
                    <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-3 space-y-2">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Icon icon="lucide:database" className="w-3.5 h-3.5" /> DB Records
                      </p>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                        <span className="text-gray-500">Users</span>
                        <span className="text-right font-medium text-gray-800 dark:text-gray-200">{group.db.users}</span>
                        <span className="text-gray-500">Tasks</span>
                        <span className="text-right font-medium text-gray-800 dark:text-gray-200">{group.db.tasks}</span>
                        <span className="text-gray-500">Projects</span>
                        <span className="text-right font-medium text-gray-800 dark:text-gray-200">{group.db.projects}</span>
                        <span className="text-gray-500">Clients</span>
                        <span className="text-right font-medium text-gray-800 dark:text-gray-200">{group.db.clients}</span>
                        <span className="text-gray-500">Invoices</span>
                        <span className="text-right font-medium text-gray-800 dark:text-gray-200">{group.db.invoices}</span>
                        <span className="text-gray-500">Meetings</span>
                        <span className="text-right font-medium text-gray-800 dark:text-gray-200">{group.db.meetings}</span>
                      </div>
                    </div>

                    {/* API Activity */}
                    <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-3 space-y-2">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Icon icon="lucide:activity" className="w-3.5 h-3.5" /> API Activity
                      </p>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                        <span className="text-gray-500">Today</span>
                        <span className="text-right font-medium text-gray-800 dark:text-gray-200">{group.api.today}</span>
                        <span className="text-gray-500">This month</span>
                        <span className="text-right font-medium text-gray-800 dark:text-gray-200">{group.api.thisMonth}</span>
                        <span className="text-gray-500">Errors/mo</span>
                        <span className={`text-right font-medium ${group.api.errorsThisMonth > 0 ? 'text-red-500' : 'text-gray-800 dark:text-gray-200'}`}>
                          {group.api.errorsThisMonth}
                        </span>
                      </div>
                    </div>

                    {/* Comms */}
                    <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-3 space-y-2">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Icon icon="lucide:mail" className="w-3.5 h-3.5" /> Communications
                      </p>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                        <span className="text-gray-500">Emails/mo</span>
                        <span className="text-right font-medium text-emerald-600 dark:text-emerald-400">{group.email.thisMonth}</span>
                        <span className="text-gray-500">WhatsApp/mo</span>
                        <span className="text-right font-medium text-green-600 dark:text-green-400">{group.whatsapp.thisMonth}</span>
                      </div>
                    </div>

                  </div>
                </Card>
              ))}
            </div>
          )}
          {/* FEATURE FLAGS TAB */}
          {activeTab === 'features' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">WhatsApp Add-on</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Enable or disable WhatsApp for each client (superadmin). Set expiry to auto-lock after a period.</p>
                </div>
                <button
                  onClick={fetchWaFlags}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="Refresh"
                >
                  <Icon icon="lucide:refresh-cw" className="w-4 h-4" />
                </button>
              </div>

              {loadingWaFlags ? (
                <div className="flex justify-center py-10"><Spinner size="lg" /></div>
              ) : waFlags.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400 py-10 text-center">No clients found.</div>
              ) : (
                <div className="space-y-3">
                  {waFlags.map((entry) => {
                    const saId = entry.superadminId;
                    const form = waForm[saId] || { isEnabled: false, expiryLabel: 'never', customDate: '', note: '' };
                    const wa = entry.whatsapp;
                    const statusColor = wa.isActive
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : wa.isExpired
                        ? 'text-red-500 dark:text-red-400'
                        : 'text-gray-400 dark:text-gray-500';
                    const statusLabel = wa.isActive ? 'Active' : wa.isExpired ? 'Expired' : 'Disabled';

                    return (
                      <Card key={saId} padding={false}>
                        <div className="p-4 space-y-4">
                          {/* Header row */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{entry.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{entry.email}</p>
                              {entry.masterOrg && (
                                <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">Org: {entry.masterOrg}</p>
                              )}
                            </div>
                            <span className={`text-xs font-semibold shrink-0 ${statusColor}`}>{statusLabel}</span>
                          </div>

                          {wa.expiresAt && (
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              Expires: {new Date(wa.expiresAt).toLocaleDateString('en-IN')}
                              {wa.isExpired ? ' (expired)' : ''}
                            </p>
                          )}

                          {/* Toggle */}
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700 dark:text-gray-300">WhatsApp Enabled</span>
                            <button
                              type="button"
                              onClick={() => setWaForm((prev) => ({
                                ...prev,
                                [saId]: { ...form, isEnabled: !form.isEnabled },
                              }))}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none
                                ${form.isEnabled ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                            >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
                                ${form.isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                          </div>

                          {/* Expiry — only show when enabling */}
                          {form.isEnabled && (
                            <div className="space-y-2">
                              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Expiry</label>
                              <div className="flex gap-2 flex-wrap">
                                {['never', '1_week', '3_months', '6_months', 'custom'].map((opt) => (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => setWaForm((prev) => ({ ...prev, [saId]: { ...form, expiryLabel: opt } }))}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                                      ${form.expiryLabel === opt
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                      }`}
                                  >
                                    {opt === 'never' ? 'Never' : opt === '1_week' ? '1 Week' : opt === '3_months' ? '3 Months' : opt === '6_months' ? '6 Months' : 'Custom'}
                                  </button>
                                ))}
                              </div>
                              {form.expiryLabel === 'custom' && (
                                <input
                                  type="date"
                                  value={form.customDate}
                                  onChange={(e) => setWaForm((prev) => ({ ...prev, [saId]: { ...form, customDate: e.target.value } }))}
                                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                />
                              )}
                            </div>
                          )}

                          {/* Note */}
                          <div className="space-y-1">
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Note (optional)</label>
                            <input
                              type="text"
                              placeholder="Internal note..."
                              value={form.note}
                              maxLength={300}
                              onChange={(e) => setWaForm((prev) => ({ ...prev, [saId]: { ...form, note: e.target.value } }))}
                              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                            />
                          </div>

                          {/* Save */}
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleWaSave(saId)}
                              disabled={waSaving[saId]}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
                            >
                              {waSaving[saId] ? (
                                <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
                              ) : (
                                <Icon icon="lucide:save" className="w-4 h-4" />
                              )}
                              Save
                            </button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
