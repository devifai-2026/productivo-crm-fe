import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import { attendanceAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

function msToHHMM(ms) {
  if (!ms || ms < 0) return '0h 0m';
  const m = Math.round(ms / 60000);
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function fmtTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function isWeekend(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.getDay() === 0 || d.getDay() === 6;
}

export default function Attendance({ onMenuClick }) {
  const { user } = useAuthStore();
  const [today, setToday] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [liveMs, setLiveMs] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const [t, h] = await Promise.all([
        attendanceAPI.myToday(),
        attendanceAPI.myHistory(),
      ]);
      setToday(t.data?.data || null);
      setHistory(h.data?.data || []);
    } catch {
      toast.error('Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Live ticker for the "currently clocked in" duration
  useEffect(() => {
    if (!today?.loginAt) { setLiveMs(0); return; }
    const start = new Date(today.loginAt).getTime();
    setLiveMs(Date.now() - start);
    const id = setInterval(() => setLiveMs(Date.now() - start), 1000);
    return () => clearInterval(id);
  }, [today?.loginAt]);

  const handleClockIn = async () => {
    setBusy(true);
    try {
      const res = await attendanceAPI.clockIn();
      setToday(res.data?.data);
      toast.success('Clocked in');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to clock in');
    } finally {
      setBusy(false);
    }
  };

  const handleClockOut = async () => {
    setBusy(true);
    try {
      const res = await attendanceAPI.clockOut();
      setToday(res.data?.data);
      toast.success('Clocked out');
      load(); // refresh history to reflect the closed session
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to clock out');
    } finally {
      setBusy(false);
    }
  };

  const running = !!today?.loginAt;
  const totalTodayMs = (today?.totalDurationMs || 0) + (running ? liveMs : 0);

  return (
    <div>
      <Header
        title="Attendance"
        subtitle={`${user?.name || 'You'} · ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}`}
        onMenuClick={onMenuClick}
      />

      {/* Today card */}
      <Card className="mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full ${running ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300 dark:bg-gray-600'}`} />
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {running ? 'Currently clocked in' : today ? 'Not clocked in' : 'No session today'}
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-50 font-mono">
              {msToHHMM(totalTodayMs)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {today?.sessions?.length || 0} completed session{(today?.sessions?.length || 0) === 1 ? '' : 's'} today
            </p>
          </div>

          <div className="flex flex-col gap-2 items-end">
            {running ? (
              <Button onClick={handleClockOut} loading={busy} icon="lucide:log-out" variant="danger">
                Clock Out
              </Button>
            ) : (
              <Button onClick={handleClockIn} loading={busy} icon="lucide:log-in">
                Clock In
              </Button>
            )}
            {running && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Started at {fmtTime(today.loginAt)}
              </p>
            )}
          </div>
        </div>

        {/* Today's sessions */}
        {(today?.sessions?.length > 0 || running) && (
          <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">Today's sessions</p>
            <div className="space-y-2">
              {today?.sessions?.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <Icon icon="lucide:clock" className="w-3.5 h-3.5 text-gray-400" />
                    {fmtTime(s.startAt)} → {fmtTime(s.endAt)}
                    {s.systemCheckout && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-900/20 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                        <Icon icon="lucide:alert-triangle" className="w-2.5 h-2.5" />
                        Auto-checkout
                      </span>
                    )}
                  </span>
                  <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
                    {msToHHMM(s.durationMs)}
                  </span>
                </div>
              ))}
              {running && (
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <Icon icon="lucide:play" className="w-3.5 h-3.5" />
                    {fmtTime(today.loginAt)} → (running)
                  </span>
                  <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                    {msToHHMM(liveMs)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* History */}
      <Card>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">This month</h3>
        {loading ? (
          <p className="text-sm text-gray-500 py-6 text-center">Loading…</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">No sessions yet this month.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Day</th>
                  <th className="pb-2">First In</th>
                  <th className="pb-2">Last Out</th>
                  <th className="pb-2">Sessions</th>
                  <th className="pb-2 text-right">Work Duration</th>
                </tr>
              </thead>
              <tbody>
                {history.map((e) => {
                  const d = new Date(e.date + 'T00:00:00');
                  const weekend = isWeekend(e.date);
                  const first = e.sessions?.[0]?.startAt;
                  const last = e.sessions?.[e.sessions.length - 1]?.endAt || e.loginAt;
                  const hasAutoCheckout = e.sessions?.some((s) => s.systemCheckout);
                  return (
                    <tr key={e._id} className={`border-b border-gray-100 dark:border-gray-800 ${weekend ? 'bg-gray-50 dark:bg-gray-900/40' : ''}`}>
                      <td className="py-2.5 text-gray-700 dark:text-gray-300">
                        {e.date}
                        {hasAutoCheckout && (
                          <span title="Auto-closed at midnight IST" className="ml-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 text-[9px] font-semibold text-amber-700 dark:text-amber-400">
                            <Icon icon="lucide:alert-triangle" className="w-2.5 h-2.5" />
                            Auto
                          </span>
                        )}
                      </td>
                      <td className="py-2.5">
                        <span className={weekend ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}>
                          {d.toLocaleDateString('en-IN', { weekday: 'short' })}
                          {weekend && <span className="ml-1 text-[10px]">(off)</span>}
                        </span>
                      </td>
                      <td className="py-2.5 text-gray-600 dark:text-gray-400">{fmtTime(first)}</td>
                      <td className="py-2.5 text-gray-600 dark:text-gray-400">{last ? fmtTime(last) : (e.loginAt ? 'Active' : '—')}</td>
                      <td className="py-2.5 text-gray-600 dark:text-gray-400">{e.sessions?.length || 0}</td>
                      <td className="py-2.5 text-right font-mono font-medium text-gray-900 dark:text-gray-100">
                        {msToHHMM(e.totalDurationMs)}
                      </td>
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
