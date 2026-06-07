import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, RadialBarChart, RadialBar, Legend,
} from 'recharts';
import { dailyLogAPI } from '../../services/api';
import Spinner from '../ui/Spinner';

function ymd(d) {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
function shortDay(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}
function shortMonth(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}
// ISO-ish week key: Monday-start week, labelled by its Monday date.
function weekStart(d) {
  const x = new Date(`${ymd(d)}T00:00:00`);
  const dow = (x.getDay() + 6) % 7; // 0 = Monday
  x.setDate(x.getDate() - dow);
  return x;
}

// Selectable ranges.
//  kind 'calendar' → the current calendar week / month (e.g. "This month" = Jun 1–30).
//  kind 'rolling'  → the last N days up to today.
//  kind 'lifetime' → from the earliest log to today.
// `bucket` controls chart granularity so long ranges stay legible.
const RANGES = [
  { id: 'week', label: 'This week', short: '7d', kind: 'rolling', days: 7, bucket: 'day' },
  { id: 'month', label: 'This month', short: '1M', kind: 'calendar', unit: 'month', bucket: 'day' },
  { id: '3m', label: 'Last 3 months', short: '3M', kind: 'rolling', days: 90, bucket: 'week' },
  { id: '6m', label: 'Last 6 months', short: '6M', kind: 'rolling', days: 180, bucket: 'week' },
  { id: 'year', label: 'Last year', short: '1Y', kind: 'rolling', days: 365, bucket: 'month' },
  { id: 'lifetime', label: 'Lifetime', short: '∞', kind: 'lifetime', bucket: 'month' },
];

// Resolve a range config to concrete [start, end] Date bounds (local, day-precision).
// `earliestLog` is used only for the lifetime range.
function resolveBounds(cfg, now, earliestLog) {
  const today = new Date(`${ymd(now)}T00:00:00`);
  if (cfg.kind === 'calendar' && cfg.unit === 'month') {
    return { start: new Date(today.getFullYear(), today.getMonth(), 1), end: new Date(today.getFullYear(), today.getMonth() + 1, 0) };
  }
  if (cfg.kind === 'calendar' && cfg.unit === 'week') {
    const start = weekStart(today); // Monday
    const end = new Date(start); end.setDate(start.getDate() + 6); // Sunday
    return { start, end };
  }
  if (cfg.kind === 'lifetime') {
    const start = earliestLog ? new Date(`${earliestLog}T00:00:00`) : today;
    return { start, end: today };
  }
  // rolling
  const start = new Date(today); start.setDate(today.getDate() - (cfg.days - 1));
  return { start, end: today };
}

// Mood chip values are stored as "emoji label" — map to a colour for charts.
const MOOD_COLORS = {
  Productive: '#6366f1', Great: '#10b981', Calm: '#06b6d4',
  Okay: '#f59e0b', Drained: '#f43f5e', Stressed: '#ef4444',
};
const FALLBACK_MOOD_COLOR = '#a78bfa';

const BUCKET_NOUN = { day: 'Daily', week: 'Weekly', month: 'Monthly' };

// Tooltip styled for both light/dark.
const tooltipStyle = {
  borderRadius: 10,
  fontSize: 12,
  border: '1px solid rgba(148,163,184,0.2)',
  background: 'rgba(17,24,39,0.92)',
  color: '#f9fafb',
  boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
};

export default function LogSummary({ onPickDate }) {
  const [range, setRange] = useState('week'); // 'week' | 'month'
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAllDays, setShowAllDays] = useState(false);

  const cfg = useMemo(() => RANGES.find((r) => r.id === range) || RANGES[0], [range]);

  const { from, to, label } = useMemo(() => {
    const now = new Date();
    const today = ymd(now);
    if (cfg.kind === 'lifetime') return { from: null, to: today, label: cfg.label };
    const { start } = resolveBounds(cfg, now, null);
    // For the calendar month, label with the actual month (e.g. "June 2026").
    const label = cfg.kind === 'calendar' && cfg.unit === 'month'
      ? new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
      : cfg.label;
    return { from: ymd(start), to: today, label };
  }, [cfg]);

  useEffect(() => {
    let alive = true;
    // Defer the loading flag to a microtask so it isn't a synchronous setState
    // in the effect body (avoids the cascading-render lint and a flash on mount).
    Promise.resolve().then(() => { if (alive) setLoading(true); });
    const params = { to };
    if (from) params.from = from; // lifetime omits `from` to fetch everything
    dailyLogAPI.listRange(params)
      .then((res) => { if (alive) { setLogs(res.data?.data || []); setShowAllDays(false); setLoading(false); } })
      .catch(() => { if (alive) { setLogs([]); setLoading(false); } });
    return () => { alive = false; };
  }, [from, to]);

  // Walk every day in the window (so charts have no gaps), accumulate stats at
  // DAILY granularity (streaks etc. must be per-day), then roll each day into a
  // day/week/month bucket for the trend charts so long ranges stay legible.
  const { series, stats, moodData, bucket } = useMemo(() => {
    const byDate = new Map(logs.map((l) => [l.date, l]));
    const now = new Date();

    // Resolve [start, end] for the selected range. Calendar month's end can be
    // in the future (e.g. Jun 30 when today is Jun 7) — we still render those
    // days as empty so the chart shows the whole month, but don't count them.
    const earliest = logs.length ? logs[logs.length - 1].date : ymd(now);
    const { start, end } = resolveBounds(cfg, now, earliest);
    const todayKey = ymd(now);
    const startKey = ymd(start);
    const span = Math.max(1, Math.round((new Date(`${ymd(end)}T00:00:00`) - new Date(`${startKey}T00:00:00`)) / 86400000) + 1);
    // Auto-upgrade granularity if a lifetime span got large.
    const bucket = cfg.kind === 'lifetime'
      ? (span > 400 ? 'month' : span > 70 ? 'week' : 'day')
      : cfg.bucket;

    const buckets = new Map(); // key -> aggregated row
    let todosTotal = 0, todosDone = 0, notes = 0, journalDays = 0, activeDays = 0;
    let curStreak = 0, bestStreak = 0, elapsedDays = 0;
    const moodCount = {};

    for (let i = 0; i < span; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = ymd(d);
      // Don't plot or count days that haven't happened yet (calendar month can
      // extend past today). The X-axis then ends at today, as expected.
      if (key > todayKey) continue;
      elapsedDays += 1;
      const l = byDate.get(key);
      const added = (l?.todos || []).length;
      const done = (l?.todos || []).filter((t) => t.done).length;
      const noteCount = (l?.notes || []).length;
      const hasJournal = !!(l?.journal && l.journal.trim());
      const active = added > 0 || noteCount > 0 || hasJournal || !!(l?.highlights && l.highlights.trim());

      todosTotal += added;
      todosDone += done;
      notes += noteCount;
      if (hasJournal) journalDays += 1;
      if (active) { activeDays += 1; curStreak += 1; bestStreak = Math.max(bestStreak, curStreak); }
      else curStreak = 0;

      if (l?.mood) {
        // stored as "emoji label" — take the label word(s) after the emoji
        const labelOnly = l.mood.replace(/^\S+\s*/, '').trim() || l.mood;
        moodCount[labelOnly] = (moodCount[labelOnly] || 0) + 1;
      }

      // Determine this day's bucket key + display label.
      let bKey, bLabel;
      if (bucket === 'month') { bKey = key.slice(0, 7); bLabel = shortMonth(`${bKey}-01`); }
      else if (bucket === 'week') { bKey = ymd(weekStart(d)); bLabel = shortDay(bKey); }
      else { bKey = key; bLabel = shortDay(key); }

      let row = buckets.get(bKey);
      if (!row) { row = { key: bKey, label: bLabel, added: 0, done: 0, open: 0, notes: 0, journal: 0, activity: 0 }; buckets.set(bKey, row); }
      row.added += added;
      row.done += done;
      row.open += Math.max(0, added - done);
      row.notes += noteCount;
      row.journal += hasJournal ? 1 : 0;
      row.activity += added + noteCount + (hasJournal ? 1 : 0);
    }

    const series = Array.from(buckets.values()); // already chronological (loop is oldest→newest)
    const completionPct = todosTotal ? Math.round((todosDone / todosTotal) * 100) : 0;
    const moodData = Object.entries(moodCount)
      .map(([name, value]) => ({ name, value, color: MOOD_COLORS[name] || FALLBACK_MOOD_COLOR }))
      .sort((a, b) => b.value - a.value);

    return {
      series,
      moodData,
      bucket,
      stats: { todosTotal, todosDone, notes, journalDays, activeDays, completionPct, bestStreak, curStreak, totalDays: elapsedDays },
    };
  }, [logs, cfg]);

  const completionRing = [{ name: 'done', value: stats.completionPct, fill: 'url(#ringGrad)' }];

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Range switcher — scrolls horizontally on narrow screens */}
      <div className="flex items-center justify-start sm:justify-center gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 py-0.5">
        {RANGES.map((r) => (
          <button key={r.id} onClick={() => setRange(r.id)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
              range === r.id
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}>
            {r.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="md" /></div>
      ) : (
        <>
          {/* Headline stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryStat icon="lucide:flame" tint="orange" value={`${stats.curStreak}d`} label="Current streak" sub={`Best ${stats.bestStreak}d`} />
            <SummaryStat icon="lucide:check-square" tint="emerald" value={`${stats.completionPct}%`} label="To-dos completed" sub={`${stats.todosDone}/${stats.todosTotal}`} />
            <SummaryStat icon="lucide:calendar-check" tint="indigo" value={`${stats.activeDays}`} label="Active days" sub={`of ${stats.totalDays}`} />
            <SummaryStat icon="lucide:book-open" tint="rose" value={stats.journalDays} label="Journal entries" sub={`${stats.notes} notes`} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* To-do trend — area chart (spans 2 cols) */}
            <ChartCard className="lg:col-span-2" title="To-dos over time" icon="lucide:trending-up" iconColor="text-emerald-500">
              {stats.todosTotal === 0 ? (
                <EmptyChart text="No to-dos in this range yet." />
              ) : (
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={series} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gDone" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gOpen" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.15} vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#9ca3af" interval="preserveStartEnd" minTickGap={16} />
                      <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" allowDecimals={false} width={32} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#94a3b8', strokeOpacity: 0.25 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Area type="monotone" dataKey="done" name="Completed" stroke="#10b981" strokeWidth={2} fill="url(#gDone)" />
                      <Area type="monotone" dataKey="open" name="Open" stroke="#f59e0b" strokeWidth={2} fill="url(#gOpen)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

            {/* Completion ring — radial gauge */}
            <ChartCard title="Completion rate" icon="lucide:target" iconColor="text-indigo-500">
              <div className="h-60 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart innerRadius="68%" outerRadius="100%" data={completionRing} startAngle={90} endAngle={-270}>
                    <defs>
                      <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#22d3ee" />
                      </linearGradient>
                    </defs>
                    <RadialBar background={{ fill: 'rgba(148,163,184,0.15)' }} dataKey="value" cornerRadius={20} max={100} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">{stats.completionPct}%</span>
                  <span className="text-xs text-gray-400 mt-0.5">{stats.todosDone} of {stats.todosTotal} done</span>
                </div>
              </div>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Daily activity — bar chart (spans 2 cols) */}
            <ChartCard className="lg:col-span-2" title={`${BUCKET_NOUN[bucket]} activity`} icon="lucide:bar-chart-3" iconColor="text-blue-500">
              {stats.activeDays === 0 ? (
                <EmptyChart text="No activity logged in this range." />
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={series} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barCategoryGap="20%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.15} vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#9ca3af" interval="preserveStartEnd" minTickGap={16} />
                      <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" allowDecimals={false} width={32} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(148,163,184,0.1)' }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="done" stackId="a" name="To-dos done" fill="#10b981" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="open" stackId="a" name="To-dos open" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="notes" stackId="a" name="Notes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

            {/* Mood distribution — donut */}
            <ChartCard title="Mood mix" icon="lucide:smile" iconColor="text-amber-500">
              {moodData.length === 0 ? (
                <EmptyChart text="No moods tagged yet." />
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={moodData} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={3} stroke="none">
                        {moodData.map((m) => <Cell key={m.name} fill={m.color} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>
          </div>

          {/* Per-day breakdown — capped, with a show-all toggle for long ranges */}
          <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-100 dark:border-white/5 divide-y divide-gray-100 dark:divide-white/5 overflow-hidden">
            <div className="px-4 py-2.5 text-xs font-semibold text-gray-500 flex items-center gap-2">
              <Icon icon="lucide:list" className="w-3.5 h-3.5" /> {label}
              <span className="ml-auto font-normal text-gray-400">{logs.length} day{logs.length === 1 ? '' : 's'} with entries</span>
            </div>
            {logs.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">No entries in this range.</p>
            ) : (
              (showAllDays ? logs : logs.slice(0, DAY_LIST_CAP)).map((l) => {
                const done = (l.todos || []).filter((t) => t.done).length;
                const total = (l.todos || []).length;
                const pct = total ? Math.round((done / total) * 100) : 0;
                return (
                  <button key={l.date} onClick={() => onPickDate?.(l.date)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors">
                    <div className="w-14 shrink-0 text-center">
                      <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{new Date(`${l.date}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
                      <p className="text-[10px] text-gray-400">{new Date(`${l.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short' })}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      {l.highlights ? <p className="text-sm text-gray-700 dark:text-gray-200 truncate">✨ {l.highlights}</p>
                        : l.journal ? <p className="text-sm text-gray-600 dark:text-gray-300 truncate">{l.journal}</p>
                        : <p className="text-sm text-gray-400 italic">No journal</p>}
                      <div className="flex items-center gap-2 mt-1">
                        {total > 0 && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-16 h-1.5 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-emerald-400 to-green-500" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[11px] text-gray-400 tabular-nums">{done}/{total}</span>
                          </div>
                        )}
                        {(l.notes || []).length > 0 && <span className="text-[11px] text-gray-400">· {l.notes.length} notes</span>}
                        {l.mood && <span className="text-[11px] text-gray-400">· {l.mood}</span>}
                      </div>
                    </div>
                    <Icon icon="lucide:chevron-right" className="w-4 h-4 text-gray-300 shrink-0" />
                  </button>
                );
              })
            )}
            {logs.length > DAY_LIST_CAP && (
              <button onClick={() => setShowAllDays((v) => !v)}
                className="w-full px-4 py-2.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors flex items-center justify-center gap-1.5">
                <Icon icon={showAllDays ? 'lucide:chevron-up' : 'lucide:chevron-down'} className="w-3.5 h-3.5" />
                {showAllDays ? 'Show less' : `Show all ${logs.length} days`}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const DAY_LIST_CAP = 30;

// ── Small presentational pieces ──

const STAT_TINTS = {
  orange: 'text-orange-500 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 ring-orange-100 dark:ring-orange-500/20',
  emerald: 'text-emerald-500 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 ring-emerald-100 dark:ring-emerald-500/20',
  indigo: 'text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 ring-indigo-100 dark:ring-indigo-500/20',
  rose: 'text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 ring-rose-100 dark:ring-rose-500/20',
};
function SummaryStat({ icon, tint, value, label, sub }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-white/[0.03] p-3.5 flex items-center gap-3">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ring-1 ${STAT_TINTS[tint]}`}>
        <Icon icon={icon} className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold text-gray-900 dark:text-white leading-tight tracking-tight">{value}</p>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{label}{sub ? ` · ${sub}` : ''}</p>
      </div>
    </div>
  );
}

function ChartCard({ title, icon, iconColor, children, className = '' }) {
  return (
    <section className={`bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-100 dark:border-white/5 p-4 ${className}`}>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3">
        <Icon icon={icon} className={`w-4 h-4 ${iconColor}`} /> {title}
      </h3>
      {children}
    </section>
  );
}

function EmptyChart({ text }) {
  return (
    <div className="h-56 flex flex-col items-center justify-center text-center">
      <Icon icon="lucide:bar-chart" className="w-8 h-8 text-gray-200 dark:text-gray-700 mb-2" />
      <p className="text-xs text-gray-400">{text}</p>
    </div>
  );
}
