import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { format, parseISO, isPast, isToday, isTomorrow } from 'date-fns';
import useTaskStore from '../store/taskStore';
import useOrganizationStore from '../store/organizationStore';
import useAuthStore from '../store/authStore';
import { taskAPI, organizationAPI } from '../services/api';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import SearchBar from '../components/ui/SearchBar';
import EmptyState from '../components/ui/EmptyState';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';

/* ─── constants ─────────────────────────────────────────────────── */
const STATUSES = [
  { value: 'backlog',     label: 'Backlog',      color: '#818cf8', bg: 'bg-indigo-50 dark:bg-indigo-900/20',   text: 'text-indigo-600 dark:text-indigo-400' },
  { value: 'todo',        label: 'To Do',         color: '#94a3b8', bg: 'bg-slate-50 dark:bg-slate-900/20',     text: 'text-slate-600 dark:text-slate-400' },
  { value: 'in_progress', label: 'In Progress',   color: '#60a5fa', bg: 'bg-blue-50 dark:bg-blue-900/20',       text: 'text-blue-600 dark:text-blue-400' },
  { value: 'in_review',   label: 'In Review',     color: '#c084fc', bg: 'bg-purple-50 dark:bg-purple-900/20',   text: 'text-purple-600 dark:text-purple-400' },
  { value: 'done',        label: 'Done',          color: '#34d399', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400' },
];

const PRIORITY_META = {
  low:    { icon: 'lucide:arrow-down',  color: 'text-slate-400' },
  medium: { icon: 'lucide:minus',       color: 'text-amber-500' },
  high:   { icon: 'lucide:arrow-up',    color: 'text-orange-500' },
  urgent: { icon: 'lucide:flame',       color: 'text-red-500' },
};

const PAGE_SIZE = 15;

/* ─── helpers ───────────────────────────────────────────────────── */
function formatDue(dateStr) {
  if (!dateStr) return null;
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
    if (isToday(d)) return 'Today';
    if (isTomorrow(d)) return 'Tomorrow';
    return format(d, 'MMM d');
  } catch { return null; }
}

function isOverdue(dateStr, status) {
  if (!dateStr || status === 'done') return false;
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
    return isPast(d) && !isToday(d);
  } catch { return false; }
}

/* ─── TaskCard (list view) ──────────────────────────────────────── */
function TaskListCard({ task, onClick }) {
  const pm = PRIORITY_META[task.priority] || PRIORITY_META.medium;
  const due = formatDue(task.dueDate);
  const overdue = isOverdue(task.dueDate, task.status);

  return (
    <Card hover onClick={onClick} className="!p-0 overflow-hidden group">
      <div className="flex items-center gap-3 px-4 py-3">
        {/* priority indicator */}
        <div className={`shrink-0 ${pm.color}`}>
          <Icon icon={pm.icon} className="w-4 h-4" />
        </div>

        {/* main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-semibold text-gray-900 dark:text-gray-100 truncate ${task.status === 'done' ? 'line-through opacity-50' : ''}`}>
              {task.title}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <Badge status={task.status} />
            {task.projectId?.name && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Icon icon="lucide:folder" className="w-3 h-3" />
                {task.projectId.name}
              </span>
            )}
            {task.categories?.map((c) => (
              <span key={c._id} className="text-xs px-1.5 py-0.5 rounded-md bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-medium">
                {c.name}
              </span>
            ))}
            {due && (
              <span className={`text-xs flex items-center gap-1 ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
                <Icon icon="lucide:calendar" className="w-3 h-3" />
                {due}
              </span>
            )}
          </div>
        </div>

        {/* assignees */}
        {task.assignees?.length > 0 && (
          <div className="flex -space-x-1.5 shrink-0">
            {task.assignees.slice(0, 3).map((a, i) => (
              <Avatar key={a._id || i} name={a.name} size="xs" className="ring-2 ring-white dark:ring-gray-900" />
            ))}
            {task.assignees.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-semibold text-gray-600 dark:text-gray-300 ring-2 ring-white dark:ring-gray-900">
                +{task.assignees.length - 3}
              </div>
            )}
          </div>
        )}

        <Icon icon="lucide:chevron-right" className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0" />
      </div>
    </Card>
  );
}

/* ─── KanbanCard ────────────────────────────────────────────────── */
function KanbanCard({ task, onClick, onDrop, onDragStart }) {
  const pm = PRIORITY_META[task.priority] || PRIORITY_META.medium;
  const due = formatDue(task.dueDate);
  const overdue = isOverdue(task.dueDate, task.status);

  return (
    <div
      draggable
      onDragStart={() => onDragStart(task)}
      onClick={onClick}
      className="bg-white dark:bg-gray-900 rounded-xl p-3 mb-2 shadow-sm hover:shadow-md cursor-pointer border border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800 transition-all group"
    >
      {/* top row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className={`text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug ${task.status === 'done' ? 'line-through opacity-50' : ''}`}>
          {task.title}
        </p>
        <Icon icon={pm.icon} className={`w-4 h-4 shrink-0 mt-0.5 ${pm.color}`} />
      </div>

      {/* project + categories */}
      <div className="flex flex-wrap gap-1 mb-2">
        {task.projectId?.name && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <Icon icon="lucide:folder" className="w-2.5 h-2.5" />
            {task.projectId.name}
          </span>
        )}
        {task.categories?.map((c) => (
          <span key={c._id} className="text-[10px] px-1.5 py-0.5 rounded-md bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-medium">
            {c.name}
          </span>
        ))}
      </div>

      {/* bottom row */}
      <div className="flex items-center justify-between">
        {due ? (
          <span className={`text-[11px] flex items-center gap-1 ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
            <Icon icon="lucide:calendar" className="w-3 h-3" />
            {due}
          </span>
        ) : <span />}

        {task.assignees?.length > 0 && (
          <div className="flex -space-x-1.5">
            {task.assignees.slice(0, 3).map((a, i) => (
              <Avatar key={a._id || i} name={a.name} size="xs" className="ring-1 ring-white dark:ring-gray-900" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── KanbanColumn ──────────────────────────────────────────────── */
function KanbanColumn({ status, tasks, navigate, onDrop, onDragStart }) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      className={`flex-shrink-0 w-72 rounded-2xl flex flex-col transition-colors ${dragOver ? 'ring-2 ring-blue-400 dark:ring-blue-600' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={() => { setDragOver(false); onDrop(status.value); }}
    >
      {/* column header */}
      <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl mb-2 ${status.bg}`}>
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: status.color }} />
        <span className={`text-xs font-semibold uppercase tracking-wider ${status.text}`}>{status.label}</span>
        <span className="ml-auto text-xs font-bold text-gray-400 dark:text-gray-500">{tasks.length}</span>
      </div>

      {/* cards */}
      <div className="flex-1 min-h-[120px] px-0.5">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800 text-gray-300 dark:text-gray-700">
            <Icon icon="lucide:inbox" className="w-6 h-6 mb-1" />
            <span className="text-xs">Drop here</span>
          </div>
        ) : (
          tasks.map((task) => (
            <KanbanCard
              key={task._id}
              task={task}
              onClick={() => navigate(`/tasks/${task._id}`)}
              onDragStart={onDragStart}
              onDrop={onDrop}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ─── main component ────────────────────────────────────────────── */
export default function Tasks({ onMenuClick }) {
  const { tasks, isLoading, fetchTasks, updateTask } = useTaskStore();
  const { organizations, fetchOrganizations } = useOrganizationStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const isSuperAdmin = user?.role === 'superadmin';

  // view mode
  const [view, setView] = useState('list'); // 'list' | 'board'

  // filters
  const [search, setSearch]           = useState('');
  const [debouncedSearch, setDbSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [orgTab, setOrgTab]           = useState('all'); // 'all' | orgId

  // pagination (list only)
  const [page, setPage] = useState(1);

  // assignee list built from tasks
  const [members, setMembers] = useState([]);

  // drag-and-drop
  const dragTask = useRef(null);

  const debounceRef = useRef(null);

  /* fetch orgs once */
  useEffect(() => { fetchOrganizations(); }, []);

  /* debounce search */
  const handleSearch = useCallback((val) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setDbSearch(val); setPage(1); }, 350);
  }, []);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  /* fetch tasks when filters change */
  useEffect(() => {
    const params = {};
    if (debouncedSearch) params.search = debouncedSearch;
    if (statusFilter)    params.status   = statusFilter;
    if (priorityFilter)  params.priority = priorityFilter;
    if (assigneeFilter)  params.assignee = assigneeFilter;
    if (orgTab !== 'all') params.organizationId = orgTab;
    fetchTasks(params);
  }, [debouncedSearch, statusFilter, priorityFilter, assigneeFilter, orgTab]);

  /* build unique assignee list from loaded tasks */
  useEffect(() => {
    const map = new Map();
    tasks.forEach((t) => t.assignees?.forEach((a) => { if (a._id) map.set(a._id, a); }));
    setMembers(Array.from(map.values()));
  }, [tasks]);

  /* org-wise filter — server handles it via organizationId param; keep client-side as fallback */
  const orgFilteredTasks = useMemo(() => {
    if (orgTab === 'all') return tasks;
    return tasks.filter((t) => {
      const tOrgId = t.organizationId?._id || t.organizationId;
      return tOrgId === orgTab;
    });
  }, [tasks, orgTab]);

  /* pagination for list view */
  const totalCount  = orgFilteredTasks.length;
  const totalPages  = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const pagedTasks  = orgFilteredTasks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* kanban grouping */
  const boardColumns = useMemo(() =>
    STATUSES.map((s) => ({ ...s, tasks: orgFilteredTasks.filter((t) => t.status === s.value) })),
  [orgFilteredTasks]);

  /* drag-and-drop handlers */
  const handleDragStart = useCallback((task) => { dragTask.current = task; }, []);
  const handleDrop = useCallback(async (newStatus) => {
    if (!dragTask.current || dragTask.current.status === newStatus) return;
    await updateTask(dragTask.current._id, { status: newStatus });
    dragTask.current = null;
  }, [updateTask]);

  const resetFilters = () => {
    setSearch(''); setDbSearch('');
    setStatusFilter(''); setPriorityFilter('');
    setAssigneeFilter(''); setPage(1);
  };

  const hasFilters = debouncedSearch || statusFilter || priorityFilter || assigneeFilter;

  return (
    <div>
      <Header
        title="Tasks"
        subtitle={`${totalCount} tasks`}
        actionLabel="New Task"
        actionIcon="lucide:plus"
        onAction={() => navigate('/tasks/new')}
        onMenuClick={onMenuClick}
      />

      {/* ── Org tabs ── */}
      {(isSuperAdmin || organizations.length > 1) && organizations.length > 0 && (
        <div className="flex gap-1 mb-5 bg-gray-100 dark:bg-gray-900 rounded-xl p-1 overflow-x-auto max-w-full">
          <button
            onClick={() => { setOrgTab('all'); setPage(1); }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap
              ${orgTab === 'all' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
          >
            All Orgs
          </button>
          {organizations.map((org) => (
            <button
              key={org._id}
              onClick={() => { setOrgTab(org._id); setPage(1); }}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap
                ${orgTab === org._id ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
            >
              {org.name}
            </button>
          ))}
        </div>
      )}

      {/* ── Toolbar row 1: search + view toggle ── */}
      <div className="flex gap-3 mb-3">
        <SearchBar value={search} onChange={handleSearch} placeholder="Search tasks..." className="flex-1 min-w-0" />

        {/* view toggle */}
        <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shrink-0">
          <button
            onClick={() => setView('list')}
            className={`px-3 py-2 text-sm flex items-center gap-1.5 transition-colors
              ${view === 'list' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          >
            <Icon icon="lucide:list" className="w-4 h-4" />
            <span className="hidden sm:inline">List</span>
          </button>
          <button
            onClick={() => setView('board')}
            className={`px-3 py-2 text-sm flex items-center gap-1.5 transition-colors border-l border-gray-200 dark:border-gray-700
              ${view === 'board' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          >
            <Icon icon="lucide:layout-dashboard" className="w-4 h-4" />
            <span className="hidden sm:inline">Board</span>
          </button>
        </div>
      </div>

      {/* ── Toolbar row 2: assignee + priority ── */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* assignee filter */}
        {members.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 flex-1 min-w-0">
            <span className="text-xs text-gray-400 shrink-0">Assignee:</span>
            <button
              onClick={() => setAssigneeFilter('')}
              className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors
                ${!assigneeFilter ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-blue-300'}`}
            >
              All
            </button>
            {members.map((m) => (
              <button
                key={m._id}
                onClick={() => setAssigneeFilter(assigneeFilter === m._id ? '' : m._id)}
                className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors
                  ${assigneeFilter === m._id ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-blue-300'}`}
              >
                <Avatar name={m.name} size="xs" />
                <span className="max-w-[80px] truncate">{m.name?.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        )}

        {/* priority filter */}
        <select
          value={priorityFilter}
          onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
          className="shrink-0 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">All Priorities</option>
          {['low','medium','high','urgent'].map((p) => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* ── Status tabs (list view only) ── */}
      {view === 'list' && (
        <div className="flex gap-1 mb-5 bg-gray-100 dark:bg-gray-900 rounded-xl p-1 overflow-x-auto max-w-full">
          <button
            onClick={() => { setStatusFilter(''); setPage(1); }}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all
              ${!statusFilter ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
          >
            All
          </button>
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => { setStatusFilter(s.value); setPage(1); }}
              className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all
                ${statusFilter === s.value ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* ── active filters badge ── */}
      {hasFilters && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-gray-500">Active filters:</span>
          {debouncedSearch && <span className="text-xs px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">"{debouncedSearch}"</span>}
          {statusFilter && <span className="text-xs px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">{STATUSES.find(s=>s.value===statusFilter)?.label}</span>}
          {priorityFilter && <span className="text-xs px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">{priorityFilter}</span>}
          {assigneeFilter && <span className="text-xs px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">{members.find(m=>m._id===assigneeFilter)?.name?.split(' ')[0]}</span>}
          <button onClick={resetFilters} className="text-xs text-red-500 hover:text-red-600 underline">Clear all</button>
        </div>
      )}

      {/* ── content ── */}
      {isLoading && tasks.length === 0 ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : orgFilteredTasks.length === 0 ? (
        <EmptyState
          icon="lucide:check-circle"
          title={hasFilters ? 'No matching tasks' : 'No tasks yet'}
          subtitle={hasFilters ? 'Try adjusting your filters' : 'Create your first task to get started'}
          actionLabel={!hasFilters ? 'Create Task' : undefined}
          onAction={!hasFilters ? () => navigate('/tasks/new') : undefined}
        />
      ) : view === 'list' ? (
        /* ── LIST VIEW ── */
        <div className="relative">
          {isLoading && (
            <div className="absolute inset-0 bg-white/50 dark:bg-gray-950/50 flex items-center justify-center z-10 rounded-xl">
              <Spinner size="md" />
            </div>
          )}
          <div className="space-y-2">
            {pagedTasks.map((task) => (
              <TaskListCard key={task._id} task={task} onClick={() => navigate(`/tasks/${task._id}`)} />
            ))}
          </div>

          {/* pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Page {page} of {totalPages} &middot; {totalCount} tasks
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Icon icon="lucide:chevron-left" className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p;
                  if (totalPages <= 5) p = i + 1;
                  else if (page <= 3) p = i + 1;
                  else if (page >= totalPages - 2) p = totalPages - 4 + i;
                  else p = page - 2 + i;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                        ${page === p ? 'bg-blue-600 text-white' : 'border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Icon icon="lucide:chevron-right" className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── KANBAN BOARD ── */
        <div className="overflow-x-auto pb-4 -mx-1">
          <div className="flex gap-4 px-1" style={{ minWidth: `${STATUSES.length * 304}px` }}>
            {boardColumns.map((col) => (
              <KanbanColumn
                key={col.value}
                status={col}
                tasks={col.tasks}
                navigate={navigate}
                onDragStart={handleDragStart}
                onDrop={handleDrop}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
