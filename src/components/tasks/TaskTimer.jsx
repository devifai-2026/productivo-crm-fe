import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import { taskAPI } from '../../services/api';
import Card from '../ui/Card';
import Button from '../ui/Button';

function msToHHMMSS(ms) {
  if (!ms || ms < 0) return '00:00:00';
  const total = Math.floor(ms / 1000);
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function msToHHMM(ms) {
  if (!ms || ms < 0) return '0h 0m';
  const m = Math.round(ms / 60000);
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export default function TaskTimer({ taskId, taskStatus, onComplete }) {
  const navigate = useNavigate();
  const [state, setState] = useState(null); // { running, startedAt, totalTimeMs, youAreRunning }
  const [logs, setLogs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);

  const load = async () => {
    try {
      const [s, l] = await Promise.all([
        taskAPI.getTimer(taskId),
        taskAPI.getTimeLogs(taskId),
      ]);
      setState(s.data?.data || null);
      setLogs(l.data?.data || []);
    } catch {
      // silent
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [taskId]);

  // Tick every second when timer is running
  useEffect(() => {
    if (!state?.running || !state?.youAreRunning) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [state?.running, state?.youAreRunning]);

  const liveElapsed =
    state?.running && state.startedAt
      ? Date.now() - new Date(state.startedAt).getTime()
      : 0;

  const handleStart = async () => {
    setBusy(true);
    try {
      await taskAPI.startTimer(taskId);
      toast.success('Timer started');
      load();
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.code === 'NOT_CLOCKED_IN') {
        toast.error('Clock in on the Attendance page first.');
        navigate('/attendance');
      } else {
        toast.error(errData?.error || 'Failed to start timer');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleStop = async () => {
    setBusy(true);
    try {
      await taskAPI.stopTimer(taskId);
      toast.success('Timer stopped');
      load();
      if (onComplete) onComplete();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to stop timer');
    } finally {
      setBusy(false);
    }
  };

  const running = !!state?.running;
  const youAreRunning = !!state?.youAreRunning;
  const isDone = taskStatus === 'done';
  const displayMs = (state?.totalTimeMs || 0) + (youAreRunning ? liveElapsed : 0);

  return (
    <Card>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5">
            <Icon icon="lucide:timer" className="w-3.5 h-3.5" />
            Time Tracking
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-50 font-mono tabular-nums">
            {youAreRunning ? msToHHMMSS(displayMs) : msToHHMM(displayMs)}
          </p>
          {running && !youAreRunning && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              Another team member has this timer running
            </p>
          )}
        </div>

        <div>
          {youAreRunning ? (
            <Button onClick={handleStop} loading={busy} variant="danger" icon="lucide:square">
              Stop
            </Button>
          ) : (
            <Button
              onClick={handleStart}
              loading={busy}
              disabled={running || isDone}
              icon="lucide:play"
            >
              {isDone ? 'Task done' : 'Start'}
            </Button>
          )}
        </div>
      </div>

      {/* Recent time logs */}
      {logs.length > 0 && (
        <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
            Recent sessions
          </p>
          <ul className="space-y-1.5 max-h-40 overflow-auto">
            {logs.slice(0, 8).map((log) => (
              <li key={log._id} className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1.5 min-w-0">
                  <span className="truncate">
                    {log.userId?.name || '—'} · {new Date(log.startedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}{' '}
                    {new Date(log.startedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    {log.endedAt ? (
                      <> → {new Date(log.endedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</>
                    ) : (
                      <span className="ml-1 text-emerald-600 dark:text-emerald-400">· running</span>
                    )}
                  </span>
                  {log.systemStopped && (
                    <span
                      title="Auto-stopped at midnight IST"
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 text-[9px] font-semibold text-amber-700 dark:text-amber-400 shrink-0"
                    >
                      <Icon icon="lucide:alert-triangle" className="w-2.5 h-2.5" />
                      Auto
                    </span>
                  )}
                </span>
                <span className="font-mono text-gray-900 dark:text-gray-100 shrink-0 ml-2">
                  {log.endedAt ? msToHHMM(log.durationMs) : '—'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
