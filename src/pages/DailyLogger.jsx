import { useEffect, useRef, useState, useCallback } from 'react';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import { dailyLogAPI } from '../services/api';
import Spinner from '../components/ui/Spinner';
import CalendarStreak from '../components/dailylog/CalendarStreak';
import LogSummary from '../components/dailylog/LogSummary';

// Local YYYY-MM-DD (avoids UTC off-by-one from toISOString)
function ymd(d) {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
function prettyDate(date) {
  const d = new Date(`${date}T00:00:00`);
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function addDays(date, n) {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + n);
  return ymd(d);
}
function msToH(ms) {
  if (!ms) return '0h';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h ? `${h}h ${m}m` : `${m}m`;
}

const TASK_STATUS_COLOR = {
  todo: 'text-gray-500', in_progress: 'text-blue-500', in_review: 'text-amber-500', done: 'text-emerald-500',
};

// Mood quick-pick chips (stored as "emoji label" for back-compat with the free-text field).
const MOODS = [
  { emoji: '🚀', label: 'Productive' },
  { emoji: '😊', label: 'Great' },
  { emoji: '😌', label: 'Calm' },
  { emoji: '😐', label: 'Okay' },
  { emoji: '😫', label: 'Drained' },
  { emoji: '😤', label: 'Stressed' },
];

export default function DailyLogger({ onMenuClick }) {
  const today = ymd(new Date());
  const [date, setDate] = useState(today);
  const [view, setView] = useState('day'); // 'day' | 'calendar' | 'summary'
  const [loading, setLoading] = useState(true);
  const [log, setLog] = useState(null);
  const [agg, setAgg] = useState(null);

  const [journal, setJournal] = useState('');
  const [highlights, setHighlights] = useState('');
  const [mood, setMood] = useState('');
  const [todoText, setTodoText] = useState('');
  const [noteText, setNoteText] = useState('');
  const [savingJournal, setSavingJournal] = useState(false);
  const journalTimer = useRef(null);

  const load = useCallback(async (d) => {
    setLoading(true);
    try {
      const res = await dailyLogAPI.getByDate(d);
      const data = res.data?.data;
      setLog(data.log);
      setAgg(data.aggregate);
      setJournal(data.log?.journal || '');
      setHighlights(data.log?.highlights || '');
      setMood(data.log?.mood || '');
    } catch {
      toast.error('Failed to load daily log');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(date); }, [date, load]);

  // Debounced journal/highlights/mood autosave
  const scheduleSave = (patch) => {
    if (journalTimer.current) clearTimeout(journalTimer.current);
    setSavingJournal(true);
    journalTimer.current = setTimeout(async () => {
      try {
        await dailyLogAPI.update(date, patch);
      } catch { toast.error('Save failed'); }
      finally { setSavingJournal(false); }
    }, 700);
  };

  const onJournal = (v) => { setJournal(v); scheduleSave({ journal: v, highlights, mood }); };
  const onHighlights = (v) => { setHighlights(v); scheduleSave({ journal, highlights: v, mood }); };
  // Tap a chip to set; tap the active one again to clear.
  const onMood = (v) => { const next = v === mood ? '' : v; setMood(next); scheduleSave({ journal, highlights, mood: next }); };

  const addTodo = async () => {
    const t = todoText.trim();
    if (!t) return;
    setTodoText('');
    const res = await dailyLogAPI.addTodo(date, t);
    if (res.data?.data) setLog(res.data.data);
  };
  const toggleTodo = async (id) => {
    const res = await dailyLogAPI.toggleTodo(date, id);
    if (res.data?.data) setLog(res.data.data);
  };
  const deleteTodo = async (id) => {
    const res = await dailyLogAPI.deleteTodo(date, id);
    if (res.data?.data) setLog(res.data.data);
  };
  const addNote = async () => {
    const t = noteText.trim();
    if (!t) return;
    setNoteText('');
    const res = await dailyLogAPI.addNote(date, t);
    if (res.data?.data) setLog(res.data.data);
  };
  const deleteNote = async (id) => {
    const res = await dailyLogAPI.deleteNote(date, id);
    if (res.data?.data) setLog(res.data.data);
  };

  // Priority order: carried-over & not done first, then other pending, then done.
  const rank = (t) => (t.done ? 2 : t.carriedOver ? 0 : 1);
  const todos = [...(log?.todos || [])].sort((a, b) => rank(a) - rank(b));
  const notes = log?.notes || [];
  const doneCount = todos.filter((t) => t.done).length;
  const carriedCount = todos.filter((t) => t.carriedOver && !t.done).length;
  const todoPct = todos.length ? Math.round((doneCount / todos.length) * 100) : 0;

  const dObj = new Date(`${date}T00:00:00`);
  const isToday = date === today;

  return (
    <div className="flex flex-col h-screen overflow-hidden -mt-6 lg:-mt-8 -mx-4 lg:-mx-8 -mb-6 lg:-mb-8">
      {/* Header row: title + view switcher on the same level */}
      <div className="px-4 md:px-6 pt-4 pb-3 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800 shrink-0">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {onMenuClick && (
              <button onClick={onMenuClick} className="lg:hidden p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <Icon icon="lucide:menu" className="w-5 h-5" />
              </button>
            )}
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-gray-50 tracking-tight">Daily Logger</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {view === 'day' ? prettyDate(date) : view === 'calendar' ? 'Calendar & streak' : 'Summary'}
              </p>
            </div>
          </div>

          {/* View switcher — segmented pill, on the title level */}
          <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-gray-100 dark:bg-gray-900">
            {[
              { id: 'day', label: 'Day', icon: 'lucide:notebook-pen' },
              { id: 'calendar', label: 'Calendar', icon: 'lucide:calendar-days' },
              { id: 'summary', label: 'Summary', icon: 'lucide:bar-chart-3' },
            ].map((t) => (
              <button key={t.id} onClick={() => setView(t.id)}
                className={`px-3.5 py-1.5 text-sm font-medium rounded-xl transition-all ${
                  view === t.id
                    ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}>
                <span className="inline-flex items-center gap-1.5"><Icon icon={t.icon} className="w-4 h-4" />{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Date hero (day view only) */}
      {view === 'day' && (
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-900 to-indigo-700 text-white px-4 md:px-6 py-5 shrink-0">
        {/* Soft glow accents */}
        <div className="pointer-events-none absolute -top-16 -right-10 w-56 h-56 rounded-full bg-indigo-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/4 w-56 h-56 rounded-full bg-blue-400/20 blur-3xl" />

        <div className="relative max-w-5xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            {/* Date tile with progress ring */}
            <div className="relative w-16 h-16 shrink-0">
              <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2.5" />
                <circle cx="18" cy="18" r="16" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"
                  strokeDasharray={`${(todoPct / 100) * 100.5} 100.5`} className="transition-all duration-500" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                <span className="text-[9px] uppercase tracking-wider text-white/70">{dObj.toLocaleDateString('en-IN', { month: 'short' })}</span>
                <span className="text-xl font-bold">{dObj.getDate()}</span>
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold leading-tight tracking-tight">{dObj.toLocaleDateString('en-IN', { weekday: 'long' })}</h2>
              <p className="text-sm text-white/70 flex items-center gap-2 mt-0.5">
                {dObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                {isToday && <span className="text-[10px] font-semibold uppercase bg-white/15 ring-1 ring-white/20 px-2 py-0.5 rounded-full">Today</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-white/60 flex items-center gap-1 mr-1">
              <Icon icon={savingJournal ? 'lucide:loader-2' : 'lucide:cloud-check'} className={`w-3.5 h-3.5 ${savingJournal ? 'animate-spin' : 'text-emerald-300'}`} />
              {savingJournal ? 'Saving' : 'Saved'}
            </span>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/10 ring-1 ring-white/10 backdrop-blur-sm">
              <button onClick={() => setDate(addDays(date, -1))} className="p-1.5 rounded-lg hover:bg-white/15 transition-colors">
                <Icon icon="lucide:chevron-left" className="w-4 h-4" />
              </button>
              <input
                type="date"
                value={date}
                max={today}
                onChange={(e) => e.target.value && setDate(e.target.value)}
                className="px-2 py-1 text-sm bg-transparent rounded-lg outline-none text-white [color-scheme:dark]"
              />
              <button onClick={() => setDate(addDays(date, 1))} disabled={date >= today}
                className="p-1.5 rounded-lg hover:bg-white/15 transition-colors disabled:opacity-30">
                <Icon icon="lucide:chevron-right" className="w-4 h-4" />
              </button>
            </div>
            {!isToday && (
              <button onClick={() => setDate(today)} className="px-3 py-2 text-xs font-medium rounded-xl bg-white text-indigo-700 hover:bg-white/90 transition-colors shadow-sm">
                Today
              </button>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Calendar view */}
      {view === 'calendar' && (
        <div className="flex-1 overflow-auto no-scrollbar bg-gray-50 dark:bg-gray-950 p-4 md:p-6">
          <CalendarStreak onPickDate={(d) => { setDate(d); setView('day'); }} />
        </div>
      )}

      {/* Summary view */}
      {view === 'summary' && (
        <div className="flex-1 overflow-auto no-scrollbar bg-gray-50 dark:bg-gray-950 p-4 md:p-6">
          <LogSummary onPickDate={(d) => { setDate(d); setView('day'); }} />
        </div>
      )}

      {view === 'day' && (loading ? (
        <div className="flex-1 flex items-center justify-center"><Spinner size="lg" /></div>
      ) : (
        <div className="flex-1 overflow-auto no-scrollbar bg-gray-50 dark:bg-[#0a0a0f] p-4 md:p-6">
          <div className="max-w-5xl mx-auto space-y-4">

          {/* Day at a glance */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon="lucide:clock" tint="indigo" value={msToH(agg?.attendance?.durationMs)} label="Time logged" />
            <StatCard icon="lucide:check-square" tint="emerald" value={`${doneCount}/${todos.length}`} sub={todos.length ? `${todoPct}% done` : 'none yet'} label="To-dos" />
            <StatCard icon="lucide:list-todo" tint="blue" value={agg?.tasksDue?.length || 0} label="Tasks due" />
            <StatCard icon="lucide:video" tint="rose" value={agg?.meetings?.length || 0} label="Meetings" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* ── Left column: Journal + Todos + Notes ── */}
            <div className="lg:col-span-2 space-y-4">
              {/* Journal */}
              <section className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden">
                {/* Highlight — featured amber banner */}
                <div className="px-4 pt-4 pb-1 bg-gradient-to-b from-amber-50/70 dark:from-amber-500/[0.06] to-transparent">
                  <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400/90 mb-2">
                    <Icon icon="lucide:sparkles" className="w-4 h-4" /> Highlight of the day
                  </label>
                  <input
                    value={highlights}
                    onChange={(e) => onHighlights(e.target.value)}
                    placeholder="What's the one win worth remembering?"
                    className="w-full px-3.5 py-3 text-base font-medium bg-white dark:bg-white/[0.04] border border-amber-100 dark:border-amber-500/20 rounded-xl outline-none focus:ring-2 focus:ring-amber-400/60 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
                <div className="p-4 pt-3">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    <Icon icon="lucide:book-open" className="w-4 h-4 text-indigo-500 dark:text-indigo-400" /> Journal
                  </label>
                  <textarea
                    value={journal}
                    onChange={(e) => onJournal(e.target.value)}
                    placeholder="How did the day go? Write freely…"
                    rows={9}
                    className="w-full px-4 py-3 text-sm leading-7 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/50 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 resize-none"
                  />
                  {/* Mood chips */}
                  <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                    <span className="text-xs text-gray-400 mr-1">Mood:</span>
                    {MOODS.map((m) => {
                      const val = `${m.emoji} ${m.label}`;
                      const active = mood === val;
                      return (
                        <button
                          key={m.label}
                          onClick={() => onMood(val)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs transition-all ${
                            active
                              ? 'bg-indigo-500 text-white shadow-sm ring-1 ring-indigo-400'
                              : 'bg-gray-100 dark:bg-white/[0.05] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/[0.1] ring-1 ring-transparent dark:ring-white/5'
                          }`}
                        >
                          <span>{m.emoji}</span><span>{m.label}</span>
                        </button>
                      );
                    })}
                    {mood && !MOODS.some((m) => `${m.emoji} ${m.label}` === mood) && (
                      <span className="px-3 py-1.5 rounded-full text-xs bg-indigo-500 text-white">{mood}</span>
                    )}
                  </div>
                </div>
              </section>

              {/* Todos */}
              <section className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-100 dark:border-white/5 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Icon icon="lucide:check-square" className="w-4 h-4 text-emerald-500" /> Quick To-dos
                  </h3>
                  {todos.length > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-400 to-green-500 transition-all duration-500" style={{ width: `${todoPct}%` }} />
                      </div>
                      <span className="text-xs text-gray-400 tabular-nums">{doneCount}/{todos.length}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mb-3">
                  <input
                    value={todoText}
                    onChange={(e) => setTodoText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTodo()}
                    placeholder="Add a to-do and press Enter…"
                    className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/50 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600"
                  />
                  <button onClick={addTodo} className="px-3 py-2 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 hover:shadow-lg hover:shadow-emerald-500/20 text-white transition-all active:scale-95">
                    <Icon icon="lucide:plus" className="w-4 h-4" />
                  </button>
                </div>
                {todos.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-3">No to-dos yet.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {todos.map((t) => (
                      <li key={t._id} className={`flex items-center gap-2 group ${t.carriedOver && !t.done ? 'bg-orange-50/70 dark:bg-orange-900/10 -mx-2 px-2 py-1 rounded-lg' : ''}`}>
                        <button onClick={() => toggleTodo(t._id)} className="shrink-0">
                          <Icon icon={t.done ? 'lucide:check-circle-2' : 'lucide:circle'} className={`w-5 h-5 ${t.done ? 'text-emerald-500' : t.carriedOver ? 'text-orange-400' : 'text-gray-300 dark:text-gray-600'}`} />
                        </button>
                        <span className={`flex-1 text-sm ${t.done ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-200'}`}>{t.text}</span>
                        {t.carriedOver && !t.done && (
                          <span title={`Carried over from ${t.carriedFrom || 'a previous day'}`} className="shrink-0 inline-flex items-center gap-1 text-[10px] font-medium text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-1.5 py-0.5 rounded">
                            <Icon icon="lucide:flame" className="w-3 h-3" /> Priority
                          </span>
                        )}
                        <button onClick={() => deleteTodo(t._id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500">
                          <Icon icon="lucide:trash-2" className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Notes */}
              <section className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-100 dark:border-white/5 p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3">
                  <Icon icon="lucide:sticky-note" className="w-4 h-4 text-amber-500" /> Notes
                </h3>
                <div className="flex gap-2 mb-3">
                  <input
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addNote()}
                    placeholder="Jot a note and press Enter…"
                    className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-amber-500/50 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600"
                  />
                  <button onClick={addNote} className="px-3 py-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 hover:shadow-lg hover:shadow-amber-500/20 text-white transition-all active:scale-95">
                    <Icon icon="lucide:plus" className="w-4 h-4" />
                  </button>
                </div>
                {notes.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-3">No notes yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {notes.map((n) => (
                      <li key={n._id} className="flex items-start gap-2 group bg-amber-50/60 dark:bg-amber-900/10 rounded-lg p-2.5">
                        <Icon icon="lucide:dot" className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span className="flex-1 text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{n.text}</span>
                        <button onClick={() => deleteNote(n._id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500">
                          <Icon icon="lucide:x" className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            {/* ── Right column: Day aggregate (read-only) ── */}
            <div className="space-y-4">
              {/* Attendance */}
              <section className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-100 dark:border-white/5 p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-2">
                  <Icon icon="lucide:clock" className="w-4 h-4 text-indigo-500" /> Time logged
                </h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{msToH(agg?.attendance?.durationMs)}</p>
                {agg?.attendance?.loginAt && (
                  <p className="text-xs text-gray-400 mt-1">First login {new Date(agg.attendance.loginAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                )}
              </section>

              {/* Tasks due */}
              <section className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-100 dark:border-white/5 p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3">
                  <Icon icon="lucide:list-todo" className="w-4 h-4 text-blue-500" /> Tasks due ({agg?.tasksDue?.length || 0})
                </h3>
                {!agg?.tasksDue?.length ? (
                  <p className="text-xs text-gray-400">No tasks from the Tasks board are due this day.</p>
                ) : (
                  <ul className="space-y-2">
                    {agg.tasksDue.map((t) => (
                      <li key={t._id} className="flex items-start gap-2.5 text-sm p-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5">
                        <Icon icon="lucide:circle-dot" className={`w-3.5 h-3.5 mt-1 shrink-0 ${TASK_STATUS_COLOR[t.status] || 'text-gray-400'}`} />
                        <div className="min-w-0">
                          <p className="text-gray-800 dark:text-gray-100 font-medium truncate">{t.title}</p>
                          <p className="text-[11px] text-gray-400 capitalize">{t.projectId?.name || '—'} · {String(t.status).replace('_', ' ')}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Meetings */}
              <section className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-100 dark:border-white/5 p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3">
                  <Icon icon="lucide:video" className="w-4 h-4 text-rose-500" /> Meetings ({agg?.meetings?.length || 0})
                </h3>
                {!agg?.meetings?.length ? (
                  <p className="text-xs text-gray-400">No meetings this day.</p>
                ) : (
                  <ul className="space-y-2">
                    {agg.meetings.map((m) => {
                      const cancelled = m.status === 'cancelled';
                      return (
                      <li key={m._id} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5">
                        {/* Time badge */}
                        <div className="flex flex-col items-center justify-center shrink-0 w-12 leading-none">
                          <span className={`text-sm font-bold ${cancelled ? 'text-gray-400' : 'text-rose-500 dark:text-rose-400'}`}>
                            {new Date(m.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}
                          </span>
                          <span className="text-[9px] uppercase tracking-wide text-gray-400 mt-0.5">
                            {new Date(m.scheduledAt).toLocaleTimeString('en-IN', { hour12: true }).slice(-2)}
                          </span>
                        </div>
                        <span className="w-px self-stretch bg-gray-200 dark:bg-white/10" />
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium truncate ${cancelled ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-100'}`}>{m.title}</p>
                          {cancelled
                            ? <span className="text-[11px] text-red-500">Cancelled</span>
                            : m.meetLink && (
                              <a href={m.meetLink} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 mt-0.5 text-[11px] font-medium text-blue-500 hover:text-blue-400">
                                <Icon icon="lucide:video" className="w-3 h-3" /> Join meeting
                              </a>
                            )}
                        </div>
                      </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              {/* Priority — carried-over todos, at a glance */}
              <section className="rounded-2xl border border-orange-200 dark:border-orange-500/20 bg-gradient-to-br from-orange-50 to-white dark:from-orange-500/[0.07] dark:to-white/[0.02] p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3">
                  <Icon icon="lucide:flame" className="w-4 h-4 text-orange-500" /> Priority — carried over ({carriedCount})
                </h3>
                {carriedCount === 0 ? (
                  <p className="text-xs text-gray-400">Nothing carried over. You're on top of it! 🎉</p>
                ) : (
                  <ul className="space-y-1.5">
                    {todos.filter((t) => t.carriedOver && !t.done).map((t) => (
                      <li key={t._id} className="flex items-center gap-2 group">
                        <button onClick={() => toggleTodo(t._id)} className="shrink-0">
                          <Icon icon="lucide:circle" className="w-5 h-5 text-orange-400" />
                        </button>
                        <span className="flex-1 text-sm text-gray-700 dark:text-gray-200">{t.text}</span>
                        {t.carriedFrom && <span className="text-[10px] text-gray-400 shrink-0">from {t.carriedFrom.slice(5)}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Compact "day at a glance" stat card — glassy with a tinted icon and top accent.
const STAT_TINTS = {
  indigo: { icon: 'text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 ring-indigo-100 dark:ring-indigo-500/20', glow: 'before:from-indigo-500/10' },
  emerald: { icon: 'text-emerald-500 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 ring-emerald-100 dark:ring-emerald-500/20', glow: 'before:from-emerald-500/10' },
  blue: { icon: 'text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 ring-blue-100 dark:ring-blue-500/20', glow: 'before:from-blue-500/10' },
  rose: { icon: 'text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 ring-rose-100 dark:ring-rose-500/20', glow: 'before:from-rose-500/10' },
};
function StatCard({ icon, tint, label, value, sub }) {
  const t = STAT_TINTS[tint];
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-white/[0.03] p-3.5 flex items-center gap-3 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r ${t.glow} before:to-transparent`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ring-1 ${t.icon}`}>
        <Icon icon={icon} className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold text-gray-900 dark:text-white leading-tight tracking-tight">{value}</p>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{sub || label}</p>
      </div>
    </div>
  );
}
