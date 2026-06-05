import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { dailyLogAPI } from '../../services/api';
import Spinner from '../ui/Spinner';

function ymd(d) {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

export default function LogSummary({ onPickDate }) {
  const [range, setRange] = useState('week'); // 'week' | 'month'
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const { from, to, label } = useMemo(() => {
    const now = new Date();
    const to = ymd(now);
    const start = new Date(now);
    if (range === 'week') start.setDate(now.getDate() - 6);
    else start.setDate(now.getDate() - 29);
    return { from: ymd(start), to, label: range === 'week' ? 'Last 7 days' : 'Last 30 days' };
  }, [range]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    dailyLogAPI.listRange({ from, to })
      .then((res) => { if (alive) { setLogs(res.data?.data || []); setLoading(false); } })
      .catch(() => { if (alive) { setLogs([]); setLoading(false); } });
    return () => { alive = false; };
  }, [from, to]);

  const stats = useMemo(() => {
    let todosTotal = 0, todosDone = 0, notes = 0, journalDays = 0;
    logs.forEach((l) => {
      todosTotal += (l.todos || []).length;
      todosDone += (l.todos || []).filter((t) => t.done).length;
      notes += (l.notes || []).length;
      if (l.journal && l.journal.trim()) journalDays += 1;
    });
    return { todosTotal, todosDone, notes, journalDays, daysLogged: logs.length };
  }, [logs]);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-center gap-2">
        {['week', 'month'].map((r) => (
          <button key={r} onClick={() => setRange(r)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium ${range === r ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>
            {r === 'week' ? 'This week' : 'This month'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Spinner size="md" /></div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Days logged', value: stats.daysLogged, icon: 'lucide:calendar-check', color: 'text-emerald-500' },
              { label: 'To-dos done', value: `${stats.todosDone}/${stats.todosTotal}`, icon: 'lucide:check-square', color: 'text-blue-500' },
              { label: 'Notes', value: stats.notes, icon: 'lucide:sticky-note', color: 'text-amber-500' },
              { label: 'Journal entries', value: stats.journalDays, icon: 'lucide:book-open', color: 'text-rose-500' },
            ].map((s) => (
              <div key={s.label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 text-center">
                <Icon icon={s.icon} className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{s.value}</p>
                <p className="text-[11px] text-gray-400">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Per-day breakdown */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
            <div className="px-4 py-2.5 text-xs font-semibold text-gray-500">{label}</div>
            {logs.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">No entries in this range.</p>
            ) : (
              logs.map((l) => {
                const done = (l.todos || []).filter((t) => t.done).length;
                return (
                  <button key={l.date} onClick={() => onPickDate?.(l.date)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <div className="w-14 shrink-0 text-center">
                      <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{new Date(`${l.date}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
                      <p className="text-[10px] text-gray-400">{new Date(`${l.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short' })}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      {l.highlights ? <p className="text-sm text-gray-700 dark:text-gray-200 truncate">✨ {l.highlights}</p>
                        : l.journal ? <p className="text-sm text-gray-600 dark:text-gray-300 truncate">{l.journal}</p>
                        : <p className="text-sm text-gray-400 italic">No journal</p>}
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {(l.todos || []).length > 0 && `✓ ${done}/${l.todos.length} todos`}
                        {(l.notes || []).length > 0 && `  ·  ${l.notes.length} notes`}
                      </p>
                    </div>
                    <Icon icon="lucide:chevron-right" className="w-4 h-4 text-gray-300 shrink-0" />
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
