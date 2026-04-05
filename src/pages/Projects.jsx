import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { format, parseISO } from 'date-fns';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from 'recharts';
import useProjectStore from '../store/projectStore';
import { getEntityColor } from '../utils/entityColor';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import SearchBar from '../components/ui/SearchBar';
import EmptyState from '../components/ui/EmptyState';
import Spinner from '../components/ui/Spinner';

const PAGE_SIZE = 12;

const statusTabs = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
];

const VIEW_MODES = [
  { value: 'grid', icon: 'lucide:layout-grid', label: 'Grid' },
  { value: 'client', icon: 'lucide:users', label: 'By Client' },
];

const STATUS_COLORS = {
  active: '#22c55e',
  on_hold: '#f59e0b',
  completed: '#6366f1',
  planning: '#94a3b8',
  cancelled: '#ef4444',
};

const STATUS_LABELS = {
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
  planning: 'Planning',
  cancelled: 'Cancelled',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getProgress(project) {
  if (project.status === 'completed') return 100;
  if (project.progress !== undefined) return project.progress;
  if (project.totalTasks && project.completedTasks) {
    return Math.round((project.completedTasks / project.totalTasks) * 100);
  }
  return 0;
}

function getClientName(project) {
  return project.client?.name || project.clientId?.name || null;
}

const tooltipStyle = {
  borderRadius: 10,
  border: 'none',
  fontSize: 12,
  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
};

// ── Stats / Charts Section ────────────────────────────────────────────────────

function StatsSection({ projects }) {
  const [showCharts, setShowCharts] = useState(false);

  // KPIs
  const completedCount = projects.filter((p) => p.status === 'completed').length;
  const activeCount = projects.filter((p) => p.status === 'active').length;
  const uniqueClients = new Set(projects.map(getClientName).filter(Boolean)).size;
  const avgProgress =
    projects.length > 0
      ? Math.round(projects.reduce((s, p) => s + getProgress(p), 0) / projects.length)
      : 0;

  // 1. Status donut
  const statusCounts = {};
  projects.forEach((p) => { statusCounts[p.status] = (statusCounts[p.status] || 0) + 1; });
  const pieData = Object.entries(statusCounts).map(([status, count]) => ({
    name: STATUS_LABELS[status] || status,
    value: count,
    color: STATUS_COLORS[status] || '#94a3b8',
  }));

  // 2. Projects per client (bar)
  const clientCounts = {};
  projects.forEach((p) => {
    const name = getClientName(p) || 'No Client';
    clientCounts[name] = (clientCounts[name] || 0) + 1;
  });
  const barData = Object.entries(clientCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([name, count]) => ({
      name: name.length > 12 ? name.slice(0, 11) + '…' : name,
      count,
    }));

  // 3. Line chart — cumulative projects created over time (by month)
  const monthMap = {};
  projects.forEach((p) => {
    const d = p.createdAt ? new Date(p.createdAt) : null;
    if (!d) return;
    const key = format(d, 'MMM yy');
    monthMap[key] = (monthMap[key] || 0) + 1;
  });
  // Sort by date, build cumulative
  const sortedMonths = Object.entries(monthMap).sort((a, b) => {
    const pa = new Date('01 ' + a[0]);
    const pb = new Date('01 ' + b[0]);
    return pa - pb;
  });
  let cumulative = 0;
  const lineData = sortedMonths.map(([month, count]) => {
    cumulative += count;
    return { month, new: count, total: cumulative };
  });

  // 4. Radar chart — per-client metrics (top 6 clients)
  const clientMetrics = {};
  projects.forEach((p) => {
    const name = getClientName(p) || 'No Client';
    if (!clientMetrics[name]) {
      clientMetrics[name] = { total: 0, active: 0, completed: 0, on_hold: 0, avgProgress: 0, progressSum: 0 };
    }
    const m = clientMetrics[name];
    m.total += 1;
    if (p.status === 'active') m.active += 1;
    if (p.status === 'completed') m.completed += 1;
    if (p.status === 'on_hold') m.on_hold += 1;
    m.progressSum += getProgress(p);
    m.avgProgress = Math.round(m.progressSum / m.total);
  });
  const topClients = Object.entries(clientMetrics)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 6)
    .map(([name]) => name);

  // Radar axes: each client is a subject, values are counts
  const radarData = ['Total', 'Active', 'Completed', 'On Hold', 'Avg %'].map((subject) => {
    const entry = { subject };
    topClients.forEach((client) => {
      const m = clientMetrics[client];
      if (subject === 'Total') entry[client] = m.total;
      else if (subject === 'Active') entry[client] = m.active;
      else if (subject === 'Completed') entry[client] = m.completed;
      else if (subject === 'On Hold') entry[client] = m.on_hold;
      else if (subject === 'Avg %') entry[client] = Math.round(m.avgProgress / 10); // scale to 0-10
    });
    return entry;
  });

  const radarColors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7'];

  return (
    <div className="mb-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Total Projects', value: projects.length, icon: 'lucide:folder', color: '#6366f1' },
          { label: 'Active', value: activeCount, icon: 'lucide:zap', color: '#22c55e' },
          { label: 'Completed', value: completedCount, icon: 'lucide:check-circle', color: '#22c55e' },
          { label: 'Clients', value: uniqueClients, icon: 'lucide:building-2', color: '#f59e0b' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-3"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: kpi.color + '18' }}
            >
              <Icon icon={kpi.icon} className="w-4 h-4" style={{ color: kpi.color }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-none">{kpi.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Avg progress */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-4 mb-4 flex items-center gap-4">
        <div className="flex-shrink-0">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Avg. Progress</p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{avgProgress}%</p>
        </div>
        <div className="flex-1 h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${avgProgress}%`,
              background: 'linear-gradient(90deg, #6366f1, #22c55e)',
            }}
          />
        </div>
        <button
          onClick={() => setShowCharts((s) => !s)}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1 flex-shrink-0"
        >
          <Icon icon={showCharts ? 'lucide:chevron-up' : 'lucide:bar-chart-2'} className="w-4 h-4" />
          {showCharts ? 'Hide charts' : 'Show charts'}
        </button>
      </div>

      {showCharts && (
        <>
          {/* Row 1: Status donut + Client bar */}
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            {/* Status donut */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                Status Breakdown
              </p>
              <div className="flex items-center gap-4">
                <div style={{ width: 130, height: 130 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        innerRadius={38}
                        outerRadius={58}
                        paddingAngle={3}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(v, n) => [v + ' projects', n]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  {pieData.map((d) => (
                    <div key={d.name} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-xs text-gray-600 dark:text-gray-400">{d.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Projects per client bar */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                Projects by Client
              </p>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={barData} barSize={18} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v + ' projects', 'Count']} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 2: Line chart + Radar chart */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Cumulative line chart */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                Projects Over Time
              </p>
              {lineData.length > 1 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={lineData} margin={{ top: 4, right: 8, left: -28, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line
                      type="monotone"
                      dataKey="total"
                      name="Total"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#6366f1' }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="new"
                      name="New"
                      stroke="#22c55e"
                      strokeWidth={2}
                      strokeDasharray="4 3"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-40 text-xs text-gray-400">
                  Not enough data for a trend
                </div>
              )}
            </div>

            {/* Radar chart — client comparison */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Client Comparison
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                Top clients · Avg % scaled ÷10
              </p>
              {topClients.length > 0 ? (
                <ResponsiveContainer width="100%" height={175}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    {topClients.map((client, i) => (
                      <Radar
                        key={client}
                        name={client.length > 14 ? client.slice(0, 13) + '…' : client}
                        dataKey={client}
                        stroke={radarColors[i % radarColors.length]}
                        fill={radarColors[i % radarColors.length]}
                        fillOpacity={0.12}
                        strokeWidth={2}
                      />
                    ))}
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-40 text-xs text-gray-400">
                  No client data available
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Project Card ──────────────────────────────────────────────────────────────

function ProjectCard({ project, onClick }) {
  const ec = getEntityColor(project._id || project.name);
  const isCompleted = project.status === 'completed';
  const progress = getProgress(project);
  const progressColor = isCompleted ? '#22c55e' : progress >= 60 ? ec.hex : '#f59e0b';

  return (
    <Card hover onClick={onClick}>
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: ec.lightBg, border: `1.5px solid ${ec.borderColor}` }}
        >
          <Icon icon="lucide:folder" className="w-5 h-5" style={{ color: ec.hex }} />
        </div>
        <Badge status={project.status} />
      </div>

      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1 truncate">
        {project.name}
      </h3>

      {getClientName(project) && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1 truncate">
          <Icon icon="lucide:building-2" className="w-3 h-3 flex-shrink-0" />
          {getClientName(project)}
        </p>
      )}

      {project.description && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 line-clamp-2">
          {project.description}
        </p>
      )}

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
          <span>Progress</span>
          <span className="font-semibold" style={{ color: isCompleted ? '#22c55e' : undefined }}>
            {progress}%
          </span>
        </div>
        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, backgroundColor: progressColor }}
          />
        </div>
      </div>

      {(project.startDate || project.endDate) && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 flex items-center gap-1">
          <Icon icon="lucide:calendar" className="w-3 h-3" />
          {project.startDate &&
            format(
              typeof project.startDate === 'string' ? parseISO(project.startDate) : new Date(project.startDate),
              'MMM d'
            )}
          {project.startDate && project.endDate && ' – '}
          {project.endDate &&
            format(
              typeof project.endDate === 'string' ? parseISO(project.endDate) : new Date(project.endDate),
              'MMM d, yyyy'
            )}
        </p>
      )}
    </Card>
  );
}

// ── Client Group ──────────────────────────────────────────────────────────────

function ClientGroup({ clientName, projects, navigate }) {
  const [open, setOpen] = useState(true);
  const completedCount = projects.filter((p) => p.status === 'completed').length;
  const activeCount = projects.filter((p) => p.status === 'active').length;

  return (
    <div className="mb-6">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 w-full text-left mb-3 group"
      >
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition-colors">
          <Icon
            icon="lucide:chevron-down"
            className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${open ? '' : '-rotate-90'}`}
          />
        </div>
        <Icon icon="lucide:building-2" className="w-4 h-4 text-gray-400" />
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{clientName}</span>
        <div className="flex gap-1.5 ml-1">
          <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">
            {projects.length}
          </span>
          {activeCount > 0 && (
            <span className="text-xs bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full">
              {activeCount} active
            </span>
          )}
          {completedCount > 0 && (
            <span className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">
              {completedCount} done
            </span>
          )}
        </div>
      </button>

      {open && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard
              key={project._id}
              project={project}
              onClick={() => navigate(`/projects/${project._id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Projects({ onMenuClick }) {
  const { projects, isLoading, fetchProjects } = useProjectStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [page, setPage] = useState(1);
  const loaderRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => { fetchProjects(); }, []);

  useEffect(() => { setPage(1); }, [search, statusFilter, viewMode]);

  const filtered = projects.filter((project) => {
    const clientName = getClientName(project) || '';
    const matchesSearch =
      !search ||
      project.name?.toLowerCase().includes(search.toLowerCase()) ||
      clientName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const paginated = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = paginated.length < filtered.length;

  const handleObserver = useCallback(
    (entries) => {
      if (entries[0].isIntersecting && hasMore && !isLoading) setPage((p) => p + 1);
    },
    [hasMore, isLoading]
  );

  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleObserver]);

  const groupedByClient = (() => {
    const map = {};
    filtered.forEach((p) => {
      const key = getClientName(p) || '__no_client__';
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    return Object.entries(map).sort(([a], [b]) => {
      if (a === '__no_client__') return 1;
      if (b === '__no_client__') return -1;
      return a.localeCompare(b);
    });
  })();

  return (
    <div>
      <Header
        title="Projects"
        subtitle={`${projects.length} project${projects.length !== 1 ? 's' : ''}`}
        actionLabel="New Project"
        actionIcon="lucide:plus"
        onAction={() => navigate('/projects/new')}
        onMenuClick={onMenuClick}
      />

      {/* Stats + Charts — always visible when not filtering */}
      {projects.length > 0 && !search && !statusFilter && (
        <StatsSection projects={projects} />
      )}

      {/* Search + View toggle */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search projects or clients..."
          className="flex-1"
        />
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-900 rounded-xl p-1 self-start">
          {VIEW_MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => setViewMode(m.value)}
              title={m.label}
              className={`px-3 py-1.5 rounded-lg transition-all duration-150 flex items-center gap-1.5 text-sm font-medium
                ${viewMode === m.value
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
            >
              <Icon icon={m.icon} className="w-4 h-4" />
              <span className="hidden sm:inline">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-900 rounded-xl p-1 w-fit overflow-x-auto">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 whitespace-nowrap
              ${statusFilter === tab.value
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs opacity-50">
              {tab.value === '' ? projects.length : projects.filter((p) => p.status === tab.value).length}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading && projects.length === 0 ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="lucide:folder"
          title={search || statusFilter ? 'No matching projects' : 'No projects yet'}
          subtitle={search || statusFilter ? 'Try adjusting your filters' : 'Create your first project to get organized'}
          actionLabel={!search && !statusFilter ? 'Create Project' : undefined}
          onAction={!search && !statusFilter ? () => navigate('/projects/new') : undefined}
        />
      ) : viewMode === 'client' ? (
        <div>
          {groupedByClient.map(([clientKey, clientProjects]) => (
            <ClientGroup
              key={clientKey}
              clientName={clientKey === '__no_client__' ? 'No Client' : clientKey}
              projects={clientProjects}
              navigate={navigate}
            />
          ))}
        </div>
      ) : (
        <div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginated.map((project) => (
              <ProjectCard
                key={project._id}
                project={project}
                onClick={() => navigate(`/projects/${project._id}`)}
              />
            ))}
          </div>

          {/* Scroll sentinel */}
          <div ref={loaderRef} className="flex justify-center py-8">
            {isLoading && <Spinner size="sm" />}
            {!isLoading && hasMore && (
              <p className="text-xs text-gray-400 dark:text-gray-600 flex items-center gap-1">
                <Icon icon="lucide:arrow-down" className="w-3 h-3" />
                Showing {paginated.length} of {filtered.length}
              </p>
            )}
            {!hasMore && filtered.length > PAGE_SIZE && (
              <p className="text-xs text-gray-400 dark:text-gray-600">
                All {filtered.length} projects shown
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
