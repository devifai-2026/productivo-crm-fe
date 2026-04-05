import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import useAuthStore from '../store/authStore';
import useTaskStore from '../store/taskStore';
import useMeetingStore from '../store/meetingStore';
import { dashboardAPI } from '../services/api';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import MiniCalendar from '../components/ui/MiniCalendar';

const formatINR = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);

function StatCard({ icon, label, value, sub, color, onClick }) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
    yellow: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
  };
  return (
    <Card hover onClick={onClick}>
      <div className="flex items-center gap-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${colorMap[color]}`}>
          <Icon icon={icon} className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-50 truncate">{value}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
        </div>
      </div>
    </Card>
  );
}

function MiniBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const colors = {
    blue: 'bg-blue-500',
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
  };
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 dark:text-gray-400 w-24 shrink-0 truncate">{label}</span>
      <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2">
        <div className={`h-2 rounded-full transition-all duration-500 ${colors[color] || 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-8 text-right">{value}</span>
    </div>
  );
}

function formatDueDate(dateStr) {
  if (!dateStr) return null;
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d');
  } catch { return null; }
}

export default function Dashboard({ onMenuClick }) {
  const { user } = useAuthStore();
  const { tasks, fetchTasks } = useTaskStore();
  const { meetings, fetchMeetings } = useMeetingStore();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchTasks();
    fetchMeetings();
    dashboardAPI.getStats().then((res) => {
      setStats(res.data?.data || null);
    }).catch(() => {});
  }, []);

  const totalTasks = stats?.tasks?.total ?? tasks.length;
  const pendingTasks = stats?.tasks?.pending ?? tasks.filter((t) => t.status === 'todo' || t.status === 'in_progress').length;
  const doneTasks = stats?.tasks?.done ?? tasks.filter((t) => t.status === 'done' || t.status === 'completed').length;
  const overdueTasks = stats?.tasks?.overdue ?? tasks.filter((t) => {
    if (t.status === 'done' || t.status === 'completed') return false;
    if (!t.dueDate) return false;
    try { return isPast(typeof t.dueDate === 'string' ? parseISO(t.dueDate) : new Date(t.dueDate)); } catch { return false; }
  }).length;

  const recentTasks = tasks.slice(0, 5);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const quickActions = [
    { label: 'New Task', icon: 'lucide:plus-circle', path: '/tasks/new', color: 'text-blue-600 dark:text-blue-400' },
    { label: 'New Project', icon: 'lucide:folder-plus', path: '/projects/new', color: 'text-purple-600 dark:text-purple-400' },
    { label: 'New Meeting', icon: 'lucide:calendar-plus', path: '/meetings/new', color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'New Invoice', icon: 'lucide:receipt', path: '/invoices/new', color: 'text-amber-600 dark:text-amber-400' },
    { label: 'New Client', icon: 'lucide:user-plus', path: '/clients/new', color: 'text-indigo-600 dark:text-indigo-400' },
  ];

  const pipelineStages = [
    { key: 'lead', label: 'Lead', color: 'gray' },
    { key: 'contacted', label: 'Contacted', color: 'blue' },
    { key: 'quotation_sent', label: 'Quotation', color: 'yellow' },
    { key: 'converted', label: 'Converted', color: 'green' },
    { key: 'lost', label: 'Lost', color: 'red' },
  ];

  const totalClients = stats?.clients?.total || 0;

  return (
    <div className="space-y-8">
      <Header
        title={`${getGreeting()}, ${user?.name?.split(' ')[0] || 'there'}`}
        subtitle={format(new Date(), 'EEEE, MMMM d, yyyy')}
        onMenuClick={onMenuClick}
      />

      {/* Invoice Revenue Cards */}
      {stats?.invoices && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Revenue Overview
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon="lucide:indian-rupee"
              label="Total Revenue"
              value={formatINR(stats.invoices.totalRevenue)}
              sub="All time collected"
              color="green"
              onClick={() => navigate('/invoices')}
            />
            <StatCard
              icon="lucide:clock"
              label="Outstanding"
              value={formatINR(stats.invoices.totalDue)}
              sub="Pending collection"
              color="red"
              onClick={() => navigate('/invoices?status=sent')}
            />
            <StatCard
              icon="lucide:calendar"
              label="This Month"
              value={formatINR(stats.invoices.thisMonthRevenue)}
              sub={`Billed: ${formatINR(stats.invoices.thisMonthBilled)}`}
              color="blue"
              onClick={() => navigate('/invoices')}
            />
            <StatCard
              icon="lucide:receipt"
              label="Invoices"
              value={stats.invoices.total}
              sub={`${stats.invoices.paid} paid · ${stats.invoices.partial} partial · ${stats.invoices.unpaid} unpaid`}
              color="purple"
              onClick={() => navigate('/invoices')}
            />
          </div>
        </div>
      )}

      {/* Task Stats */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          Tasks
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon="lucide:list-checks" label="Total Tasks" value={totalTasks} color="blue" onClick={() => navigate('/tasks')} />
          <StatCard icon="lucide:clock" label="Pending" value={pendingTasks} color="yellow" onClick={() => navigate('/tasks')} />
          <StatCard icon="lucide:check-circle-2" label="Completed" value={doneTasks} color="green" onClick={() => navigate('/tasks')} />
          <StatCard icon="lucide:alert-circle" label="Overdue" value={overdueTasks} color="red" onClick={() => navigate('/tasks')} />
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              className="flex items-center gap-3 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-sm transition-all duration-150"
            >
              <Icon icon={action.icon} className={`w-5 h-5 ${action.color}`} />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card>
          <MiniCalendar meetings={meetings} onMeetingClick={(id) => navigate(`/meetings/${id}`)} />
        </Card>

        {/* Upcoming Meetings */}
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Upcoming Meetings</h3>
            <button onClick={() => navigate('/meetings')} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">View all</button>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {meetings.filter((m) => { try { return !isPast(new Date(m.scheduledAt || m.date)) && m.status !== 'cancelled'; } catch { return false; } }).length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Icon icon="lucide:calendar" className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-400 dark:text-gray-500">No upcoming meetings</p>
              </div>
            ) : (
              meetings
                .filter((m) => { try { return !isPast(new Date(m.scheduledAt || m.date)) && m.status !== 'cancelled'; } catch { return false; } })
                .sort((a, b) => new Date(a.scheduledAt || a.date) - new Date(b.scheduledAt || b.date))
                .slice(0, 5)
                .map((meeting) => (
                  <div key={meeting._id} onClick={() => navigate(`/meetings/${meeting._id}`)} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${meeting.meetingType === 'client' ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-purple-50 dark:bg-purple-900/20'}`}>
                      <Icon icon={meeting.meetingType === 'client' ? 'lucide:briefcase' : 'lucide:video'} className={`w-4 h-4 ${meeting.meetingType === 'client' ? 'text-amber-600 dark:text-amber-400' : 'text-purple-600 dark:text-purple-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{meeting.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {(() => { try { return format(new Date(meeting.scheduledAt || meeting.date), 'MMM d, h:mm a'); } catch { return ''; } })()}
                        {meeting.meetLink && ' · Meet'}
                      </p>
                    </div>
                    {meeting.meetLink && (
                      <a href={meeting.meetLink} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                        Join
                      </a>
                    )}
                  </div>
                ))
            )}
          </div>
        </Card>

        {/* Recent Tasks */}
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Recent Tasks</h3>
            <button onClick={() => navigate('/tasks')} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">View all</button>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {recentTasks.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Icon icon="lucide:check-circle" className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-400 dark:text-gray-500">No tasks yet</p>
              </div>
            ) : (
              recentTasks.map((task) => (
                <div key={task._id} onClick={() => navigate(`/tasks/${task._id}`)} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge status={task.status} />
                      {task.dueDate && <span className="text-xs text-gray-400 dark:text-gray-500">{formatDueDate(task.dueDate)}</span>}
                    </div>
                  </div>
                  {task.priority && <Badge status={task.priority} />}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Second row: pipeline + invoice payment breakdown */}
      {stats && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Client Pipeline */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Client Pipeline</h3>
              <button onClick={() => navigate('/clients')} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">View all</button>
            </div>
            <div className="space-y-3">
              {pipelineStages.map((s) => (
                <MiniBar
                  key={s.key}
                  label={s.label}
                  value={stats.clients.byStage?.[s.key] || 0}
                  max={totalClients || 1}
                  color={s.color === 'green' ? 'green' : s.color === 'red' ? 'red' : s.color === 'yellow' ? 'amber' : 'blue'}
                />
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Total Clients</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{totalClients}</span>
            </div>
          </Card>

          {/* Invoice Payment Status */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Invoice Status</h3>
              <button onClick={() => navigate('/invoices')} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">View all</button>
            </div>
            <div className="space-y-3">
              <MiniBar label="Paid" value={stats.invoices.paid} max={stats.invoices.total || 1} color="green" />
              <MiniBar label="Partial" value={stats.invoices.partial} max={stats.invoices.total || 1} color="amber" />
              <MiniBar label="Unpaid" value={stats.invoices.unpaid} max={stats.invoices.total || 1} color="red" />
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Collected</p>
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">{formatINR(stats.invoices.totalRevenue)}</p>
              </div>
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20">
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">Outstanding</p>
                <p className="text-sm font-bold text-red-700 dark:text-red-300 mt-0.5">{formatINR(stats.invoices.totalDue)}</p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
