import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { dailyLogAPI } from '../../services/api';
import Spinner from '../ui/Spinner';

function ymd(d) {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

// A day "has activity" if it has any journal text, todo, or note.
function hasActivity(log) {
  return !!(log && ((log.journal && log.journal.trim()) || (log.todos && log.todos.length) || (log.notes && log.notes.length)));
}

export default function CalendarStreak({ onPickDate }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const monthStart = useMemo(() => ymd(new Date(cursor.getFullYear(), cursor.getMonth(), 1)), [cursor]);
  const monthEnd = useMemo(() => ymd(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)), [cursor]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    // Pull a wide window so the streak is accurate, then filter the visible month.
    dailyLogAPI.listRange({ from: '2000-01-01', to: monthEnd })
      .then((res) => { if (alive) { setLogs(res.data?.data || []); setLoading(false); } })
      .catch(() => { if (alive) { setLogs([]); setLoading(false); } });
    return () => { alive = false; };
  }, [monthEnd]);

  const activeDates = useMemo(() => {
    const s = new Set();
    logs.forEach((l) => { if (hasActivity(l)) s.add(l.date); });
    return s;
  }, [logs]);

  // Current streak: consecutive days with activity ending today (or yesterday).
  const streak = useMemo(() => {
    let count = 0;
    const d = new Date();
    // allow streak to count from today or yesterday
    if (!activeDates.has(ymd(d))) d.setDate(d.getDate() - 1);
    while (activeDates.has(ymd(d))) { count++; d.setDate(d.getDate() - 1); }
    return count;
  }, [activeDates]);

  const today = ymd(new Date());
  const grid = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const lead = first.getDay(); // 0=Sun
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) cells.push(ymd(new Date(cursor.getFullYear(), cursor.getMonth(), day)));
    return cells;
  }, [cursor]);

  const monthLabel = cursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
          <Icon icon="lucide:chevron-left" className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="font-semibold text-gray-900 dark:text-gray-100">{monthLabel}</p>
          <p className="text-xs text-orange-500 flex items-center justify-center gap-1 mt-0.5">
            <Icon icon="lucide:flame" className="w-3.5 h-3.5" /> {streak}-day streak
          </p>
        </div>
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
          <Icon icon="lucide:chevron-right" className="w-5 h-5" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Spinner size="md" /></div>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} className="text-center text-[10px] font-medium text-gray-400 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {grid.map((date, i) => {
              if (!date) return <div key={i} />;
              const active = activeDates.has(date);
              const isToday = date === today;
              const isFuture = date > today;
              return (
                <button
                  key={date}
                  disabled={isFuture}
                  onClick={() => onPickDate?.(date)}
                  className={`aspect-square rounded-lg text-xs flex items-center justify-center transition-colors relative
                    ${isFuture ? 'text-gray-300 dark:text-gray-700 cursor-not-allowed' : 'hover:ring-2 hover:ring-emerald-400'}
                    ${active ? 'bg-emerald-500 text-white font-semibold' : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}
                    ${isToday ? 'ring-2 ring-blue-500' : ''}`}
                >
                  {Number(date.slice(-2))}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-gray-400 mt-3 flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> day with an entry · tap to open
          </p>
        </>
      )}
    </div>
  );
}
