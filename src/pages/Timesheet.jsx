import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import { attendanceAPI } from '../services/api';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Spinner from '../components/ui/Spinner';

function msToHHMM(ms) {
  if (!ms || ms < 0) return '0h 0m';
  const m = Math.round(ms / 60000);
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function fmtTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function Timesheet({ onMenuClick }) {
  const [members, setMembers] = useState([]);
  const [userId, setUserId] = useState('');
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [m, e] = await Promise.all([
        attendanceAPI.listMembers(),
        attendanceAPI.adminList({ from, to, userId: userId || undefined }),
      ]);
      setMembers(m.data?.data || []);
      setEntries(e.data?.data || []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load timesheet');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, [userId, from, to]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await attendanceAPI.exportExcel({ from, to, userId: userId || undefined });
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `timesheet_${from}_to_${to}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Excel downloaded');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to export');
    } finally {
      setDownloading(false);
    }
  };

  // Aggregate totals (skip weekends from "work days" count but still show the rows)
  const totalMs = entries.reduce((s, e) => s + (e.totalDurationMs || 0), 0);
  const totalTaskMs = entries.reduce((s, e) => s + (e.taskTotalMs || 0), 0);
  const workDays = entries.filter((e) => !e.weekend && e.totalDurationMs > 0).length;

  return (
    <div>
      <Header
        title="Timesheet"
        subtitle="Attendance + task time across your team"
        onMenuClick={onMenuClick}
      />

      {/* Filters */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Team Member</label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-blue-500"
            >
              <option value="">All members</option>
              {members.map((m) => (
                <option key={m._id} value={m._id}>{m.name} · {m.role}</option>
              ))}
            </select>
          </div>
          <Input
            label="From"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <Input
            label="To"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <div className="flex items-end">
            <Button
              onClick={handleDownload}
              loading={downloading}
              icon="lucide:download"
              className="w-full"
            >
              Download Excel
            </Button>
          </div>
        </div>
      </Card>

      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rows</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{entries.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Work Days</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{workDays}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Attendance Time</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-50 font-mono">{msToHHMM(totalMs)}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Task Time Logged</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-50 font-mono">{msToHHMM(totalTaskMs)}</p>
        </Card>
      </div>

      {/* Rows */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-16"><Spinner size="md" /></div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-10">No records for this filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Day</th>
                  <th className="pb-2">Member</th>
                  <th className="pb-2">First In</th>
                  <th className="pb-2">Last Out</th>
                  <th className="pb-2 text-right">Work</th>
                  <th className="pb-2 text-right">Task Time</th>
                  <th className="pb-2 text-right">Task Logs</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => {
                  const first = e.sessions?.[0]?.startAt;
                  const last = e.sessions?.[e.sessions.length - 1]?.endAt || e.loginAt;
                  const hasAutoCheckout = e.sessions?.some((s) => s.systemCheckout);
                  return (
                    <tr key={e._id} className={`border-b border-gray-100 dark:border-gray-800 ${e.weekend ? 'bg-gray-50 dark:bg-gray-900/40' : ''}`}>
                      <td className="py-2.5 text-gray-700 dark:text-gray-300">
                        {e.date}
                        {hasAutoCheckout && (
                          <span title="Auto-closed at midnight IST" className="ml-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 text-[9px] font-semibold text-amber-700 dark:text-amber-400">
                            <Icon icon="lucide:alert-triangle" className="w-2.5 h-2.5" />
                            Auto
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 text-gray-600 dark:text-gray-400">
                        {e.dayOfWeek}
                        {e.weekend && <span className="ml-1 text-[10px] text-gray-400">(off)</span>}
                      </td>
                      <td className="py-2.5">
                        <div>
                          <p className="text-gray-900 dark:text-gray-100">{e.userId?.name || '—'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{e.userId?.email || ''}</p>
                        </div>
                      </td>
                      <td className="py-2.5 text-gray-600 dark:text-gray-400">{fmtTime(first)}</td>
                      <td className="py-2.5 text-gray-600 dark:text-gray-400">
                        {e.loginAt ? <span className="text-emerald-600 dark:text-emerald-400">Active</span> : fmtTime(last)}
                      </td>
                      <td className="py-2.5 text-right font-mono font-medium text-gray-900 dark:text-gray-100">{msToHHMM(e.totalDurationMs)}</td>
                      <td className="py-2.5 text-right font-mono text-gray-700 dark:text-gray-300">{msToHHMM(e.taskTotalMs)}</td>
                      <td className="py-2.5 text-right text-gray-500 dark:text-gray-400">{e.taskLogCount || 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
