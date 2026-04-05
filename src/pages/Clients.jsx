import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import useClientStore from '../store/clientStore';
import { clientAPI } from '../services/api';
import { getEntityColor } from '../utils/entityColor';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import SearchBar from '../components/ui/SearchBar';
import Select from '../components/ui/Select';
import EmptyState from '../components/ui/EmptyState';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';

const PIPELINE_STAGES = [
  { key: 'lead', label: 'Lead', color: 'gray' },
  { key: 'contacted', label: 'Contacted', color: 'blue' },
  { key: 'quotation_sent', label: 'Quotation Sent', color: 'yellow' },
  { key: 'quotation_revised', label: 'Quotation Revised', color: 'orange' },
  { key: 'mvp_shared', label: 'MVP Shared', color: 'purple' },
  { key: 'converted', label: 'Converted', color: 'green' },
  { key: 'lost', label: 'Lost', color: 'red' },
];

const stageColorClasses = {
  lead: 'border-t-gray-400',
  contacted: 'border-t-blue-500',
  quotation_sent: 'border-t-amber-500',
  quotation_revised: 'border-t-orange-500',
  mvp_shared: 'border-t-purple-500',
  converted: 'border-t-emerald-500',
  lost: 'border-t-red-500',
};

const stageBgClasses = {
  lead: 'bg-gray-50 dark:bg-gray-800/30',
  contacted: 'bg-blue-50/50 dark:bg-blue-900/10',
  quotation_sent: 'bg-amber-50/50 dark:bg-amber-900/10',
  quotation_revised: 'bg-orange-50/50 dark:bg-orange-900/10',
  mvp_shared: 'bg-purple-50/50 dark:bg-purple-900/10',
  converted: 'bg-emerald-50/50 dark:bg-emerald-900/10',
  lost: 'bg-red-50/50 dark:bg-red-900/10',
};

export default function Clients({ onMenuClick }) {
  const { clients, isLoading, fetchClients } = useClientStore();
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [viewMode, setViewMode] = useState('pipeline');
  const navigate = useNavigate();

  useEffect(() => {
    fetchClients();
  }, []);

  const filtered = clients.filter((client) => {
    const matchesSearch =
      !search ||
      client.name?.toLowerCase().includes(search.toLowerCase()) ||
      client.email?.toLowerCase().includes(search.toLowerCase()) ||
      client.company?.toLowerCase().includes(search.toLowerCase());
    const matchesStage = !stageFilter || client.pipelineStage === stageFilter;
    return matchesSearch && matchesStage;
  });

  const handleStageChange = async (clientId, newStage) => {
    try {
      await clientAPI.updatePipeline(clientId, { pipelineStage: newStage });
      fetchClients();
    } catch {
      // silently fail
    }
  };

  const getClientsByStage = (stageKey) => {
    return filtered.filter((c) => (c.pipelineStage || 'lead') === stageKey);
  };

  // Chart data
  const STAGE_CHART_COLORS = {
    lead: '#94a3b8', contacted: '#60a5fa', quotation_sent: '#fbbf24',
    quotation_revised: '#f97316', mvp_shared: '#c084fc', converted: '#34d399', lost: '#f87171',
  };
  const pieData = PIPELINE_STAGES
    .map((s) => ({ name: s.label, value: clients.filter((c) => (c.pipelineStage || 'lead') === s.key).length, color: STAGE_CHART_COLORS[s.key] }))
    .filter((d) => d.value > 0);
  const barData = PIPELINE_STAGES.map((s) => ({
    name: s.label.replace(' ', '\n'),
    Clients: clients.filter((c) => (c.pipelineStage || 'lead') === s.key).length,
    fill: STAGE_CHART_COLORS[s.key],
  }));

  return (
    <div>
      <Header
        title="Clients"
        subtitle={`${clients.length} clients`}
        actionLabel="New Client"
        actionIcon="lucide:plus"
        onAction={() => navigate('/clients/new')}
        onMenuClick={onMenuClick}
      />

      {/* Charts */}
      {clients.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <Card>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Clients by Pipeline Stage</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                <Bar dataKey="Clients" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Pipeline Distribution</p>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} paddingAngle={2}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 shrink-0">
          <button
            onClick={() => setViewMode('pipeline')}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
              viewMode === 'pipeline'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Icon icon="lucide:kanban" className="w-4 h-4 inline mr-1.5 -mt-0.5" />
            Pipeline
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
              viewMode === 'list'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Icon icon="lucide:list" className="w-4 h-4 inline mr-1.5 -mt-0.5" />
            List
          </button>
        </div>
        <div className="flex-1">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search clients..."
            className="max-w-md"
          />
        </div>
        {viewMode === 'list' && (
          <Select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            placeholder="All Stages"
            options={[
              { value: '', label: 'All Stages' },
              ...PIPELINE_STAGES.map((s) => ({ value: s.key, label: s.label })),
            ]}
          />
        )}
      </div>

      {isLoading && clients.length === 0 ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : clients.length === 0 ? (
        <EmptyState
          icon="lucide:users"
          title="No clients yet"
          subtitle="Add your first client to get started"
          actionLabel="Add Client"
          onAction={() => navigate('/clients/new')}
        />
      ) : viewMode === 'pipeline' ? (
        /* Pipeline / Kanban View */
        <div className="overflow-x-auto pb-4 -mx-4 px-4 lg:-mx-0 lg:px-0">
          <div className="flex gap-4 min-w-max">
            {PIPELINE_STAGES.map((stage) => {
              const stageClients = getClientsByStage(stage.key);
              return (
                <div
                  key={stage.key}
                  className={`w-72 rounded-2xl border border-gray-100 dark:border-gray-800 border-t-4 ${stageColorClasses[stage.key]} ${stageBgClasses[stage.key]} flex flex-col`}
                >
                  {/* Column header */}
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {stage.label}
                      </h3>
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-0.5 rounded-full">
                        {stageClients.length}
                      </span>
                    </div>
                  </div>

                  {/* Cards */}
                  <div className="px-3 pb-3 space-y-2.5 flex-1 min-h-[100px]">
                    {stageClients.length === 0 ? (
                      <div className="flex items-center justify-center h-20">
                        <p className="text-xs text-gray-400 dark:text-gray-500">No clients</p>
                      </div>
                    ) : (
                      stageClients.map((client) => {
                        const ec = getEntityColor(client._id || client.name);
                        return (
                        <div
                          key={client._id}
                          className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-3.5 shadow-sm hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700 transition-all cursor-pointer"
                          style={{ borderLeftColor: ec.hex, borderLeftWidth: 3 }}
                        >
                          <div
                            onClick={() => navigate(`/clients/${client._id}`)}
                          >
                            <div className="flex items-center gap-2.5 mb-2">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                                style={{ backgroundColor: ec.lightBg, color: ec.hex }}>
                                {client.name?.charAt(0)?.toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                  {client.name}
                                </p>
                                {client.company && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {client.company}
                                  </p>
                                )}
                              </div>
                            </div>
                            {client.email && (
                              <p className="text-xs text-gray-400 dark:text-gray-500 truncate mb-1">
                                {client.email}
                              </p>
                            )}
                            {client.source && (
                              <span className="inline-flex items-center text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                                <Icon icon="lucide:link" className="w-3 h-3 mr-1" />
                                {client.source}
                              </span>
                            )}
                          </div>
                          {/* Stage change dropdown */}
                          <div className="mt-2.5 pt-2.5 border-t border-gray-50 dark:border-gray-800">
                            <select
                              value={client.pipelineStage || 'lead'}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleStageChange(client._id, e.target.value);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full text-xs rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5
                                text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300
                                outline-none focus:border-blue-500 transition-colors appearance-none cursor-pointer"
                            >
                              {PIPELINE_STAGES.map((s) => (
                                <option key={s.key} value={s.key}>{s.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* List View */
        <>
          {filtered.length === 0 ? (
            <EmptyState
              icon="lucide:users"
              title={search || stageFilter ? 'No matching clients' : 'No clients yet'}
              subtitle={search || stageFilter ? 'Try different filters' : 'Add your first client to get started'}
              actionLabel={!search && !stageFilter ? 'Add Client' : undefined}
              onAction={!search && !stageFilter ? () => navigate('/clients/new') : undefined}
            />
          ) : (
            <Card padding={false}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3">
                        Client
                      </th>
                      <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3">
                        Company
                      </th>
                      <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3">
                        Stage
                      </th>
                      <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3">
                        Source
                      </th>
                      <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3">
                        Phone
                      </th>
                      <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3">
                        Email
                      </th>
                      <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {filtered.map((client) => {
                      const stageInfo = PIPELINE_STAGES.find((s) => s.key === (client.pipelineStage || 'lead'));
                      const ec = getEntityColor(client._id || client.name);
                      return (
                        <tr
                          key={client._id}
                          onClick={() => navigate(`/clients/${client._id}`)}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                                style={{ backgroundColor: ec.lightBg, color: ec.hex }}>
                                {client.name?.charAt(0)?.toUpperCase()}
                              </div>
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[140px]">
                                {client.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {client.company || '--'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <Badge color={stageInfo?.color || 'gray'}>
                              {stageInfo?.label || 'Lead'}
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {client.source || '--'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {client.phone || '--'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-sm text-gray-600 dark:text-gray-400 truncate block max-w-[180px]">
                              {client.email || '--'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/clients/${client._id}`);
                              }}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            >
                              <Icon icon="lucide:eye" className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
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
