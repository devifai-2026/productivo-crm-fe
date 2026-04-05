import { useState, useEffect, useCallback } from 'react';
import { Icon } from '@iconify/react';
import { format, parseISO } from 'date-fns';
import { superAdminAPI } from '../services/api';
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

  useEffect(() => { fetchOverview(); }, []);
  useEffect(() => { if (activeTab === 'logs') fetchLogs(1); }, [activeTab, fetchLogs]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'lucide:layout-dashboard' },
    { id: 'db', label: 'DB Stats', icon: 'lucide:database' },
    { id: 'usage', label: 'Usage & Limits', icon: 'lucide:bar-chart-2' },
    { id: 'logs', label: 'Activity Logs', icon: 'lucide:scroll-text' },
    { id: 'orgs', label: 'Org Breakdown', icon: 'lucide:building-2' },
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

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-900 rounded-xl p-1 w-fit flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150
              ${activeTab === t.id
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
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
                </div>
              </div>

              {/* API Stats */}
              <div>
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">API Activity (Today)</h2>
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

          {/* DB STATS TAB */}
          {activeTab === 'db' && overview && (
            <div className="space-y-6">
              {/* MongoDB global stats */}
              <div>
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">MongoDB Database</h2>
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

          {/* ORG BREAKDOWN TAB */}
          {activeTab === 'orgs' && overview && (
            <Card padding={false}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Organization</th>
                      <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Users</th>
                      <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Meetings</th>
                      <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Invoices</th>
                      <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Tasks</th>
                      <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Emails (mo)</th>
                      <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">WA (mo)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {(overview.orgStats || []).map((org) => (
                      <tr key={org.orgId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-5 py-3.5 text-sm font-medium text-gray-900 dark:text-gray-100">{org.name}</td>
                        <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-400 text-right">{org.users}</td>
                        <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-400 text-right">{org.meetings}</td>
                        <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-400 text-right">{org.invoices}</td>
                        <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-400 text-right">{org.tasks}</td>
                        <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-400 text-right">{org.emailsSent}</td>
                        <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-400 text-right">{org.waSent}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
