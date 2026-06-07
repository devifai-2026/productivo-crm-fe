import { Icon } from '@iconify/react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { NEON, SERIES_COLORS, grafanaTooltip } from './grafanaTheme';

// ── Grafana / "hacker console" component kit ────────────────────────────────
// A dark, dense, monospace-leaning panel system with neon accents. Design
// tokens (NEON, SERIES_COLORS, grafanaTooltip) live in ./grafanaTheme.

// Outer shell that flips the whole admin view to the dark console aesthetic.
export function GrafanaShell({ children, className = '' }) {
  return (
    <div className={`gf-shell rounded-2xl bg-[#0b1020] ring-1 ring-cyan-500/10 p-3 sm:p-4 ${className}`}
      style={{
        backgroundImage:
          'radial-gradient(circle at 1px 1px, rgba(148,163,184,0.07) 1px, transparent 0)',
        backgroundSize: '22px 22px',
      }}>
      {children}
    </div>
  );
}

// A panel = a titled dark card. `accent` tints the title bar + top border.
export function GrafanaPanel({ title, icon, accent = 'cyan', right, children, className = '', dense = false }) {
  const accents = {
    cyan: 'text-cyan-300 border-cyan-500/30 shadow-cyan-500/5',
    green: 'text-emerald-300 border-emerald-500/30 shadow-emerald-500/5',
    violet: 'text-violet-300 border-violet-500/30 shadow-violet-500/5',
    amber: 'text-amber-300 border-amber-500/30 shadow-amber-500/5',
    red: 'text-rose-300 border-rose-500/30 shadow-rose-500/5',
    blue: 'text-blue-300 border-blue-500/30 shadow-blue-500/5',
  };
  const a = accents[accent] || accents.cyan;
  return (
    <section className={`rounded-xl bg-[#0e1426]/90 border ${a} shadow-lg backdrop-blur-sm overflow-hidden ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-2 px-3.5 py-2 border-b border-white/5 bg-white/[0.02]">
          <h3 className={`flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] font-mono ${a.split(' ')[0]}`}>
            {icon && <Icon icon={icon} className="w-3.5 h-3.5" />} {title}
          </h3>
          {right}
        </div>
      )}
      <div className={dense ? '' : 'p-3.5'}>{children}</div>
    </section>
  );
}

// Big stat readout — monospace value, neon accent, optional sparkline + delta.
export function GrafanaStat({ label, value, unit, icon, accent = 'cyan', spark, sub }) {
  const color = NEON[accent] || NEON.cyan;
  return (
    <div className="relative rounded-xl bg-[#0e1426]/90 border border-white/5 p-3 overflow-hidden group hover:border-white/10 transition-colors">
      <span className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono truncate">{label}</span>
        {icon && <Icon icon={icon} className="w-3.5 h-3.5 shrink-0" style={{ color }} />}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-bold font-mono tabular-nums" style={{ color, textShadow: `0 0 18px ${color}55` }}>
          {value}
        </span>
        {unit && <span className="text-xs text-slate-500 font-mono">{unit}</span>}
      </div>
      {sub && <p className="text-[10px] text-slate-500 mt-0.5 font-mono truncate">{sub}</p>}
      {spark && spark.length > 1 && (
        <div className="h-8 -mx-3 -mb-3 mt-1.5 opacity-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spark.map((v, i) => ({ i, v }))} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`sp-${accent}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#sp-${accent})`} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// Horizontal bar chart — good for "top N by size/count".
export function GrafanaBar({ data, dataKey, nameKey = 'name', height = 300, unit = '' }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="#94a3b8" strokeOpacity={0.1} horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'monospace' }} stroke="#334155" />
          <YAxis type="category" dataKey={nameKey} width={120} tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'monospace' }} stroke="#334155" />
          <Tooltip contentStyle={grafanaTooltip} cursor={{ fill: 'rgba(148,163,184,0.06)' }} formatter={(v) => [`${Number(v).toLocaleString()}${unit}`, dataKey]} />
          <Bar dataKey={dataKey} radius={[0, 4, 4, 0]}>
            {data.map((_, i) => <Cell key={i} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Donut for proportional breakdowns (document counts, status mix, …).
export function GrafanaDonut({ data, height = 260 }) {
  const total = data.reduce((s, d) => s + (d.value || 0), 0);
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="85%" paddingAngle={2} stroke="none" isAnimationActive={false}>
            {data.map((d, i) => <Cell key={i} fill={d.color || SERIES_COLORS[i % SERIES_COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={grafanaTooltip} formatter={(v, n) => [`${Number(v).toLocaleString()}`, n]} />
          <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'monospace' }} iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 top-[-2rem] flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl font-bold font-mono text-slate-100 tabular-nums">{total.toLocaleString()}</span>
        <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">total</span>
      </div>
    </div>
  );
}

// Multi-series time/category bars (e.g. monthly api/email/whatsapp).
export function GrafanaMultiBar({ data, series, xKey = 'month', height = 280 }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="#94a3b8" strokeOpacity={0.1} vertical={false} />
          <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'monospace' }} stroke="#334155" />
          <YAxis tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'monospace' }} stroke="#334155" width={40} />
          <Tooltip contentStyle={grafanaTooltip} cursor={{ fill: 'rgba(148,163,184,0.06)' }} />
          <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
          {series.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[3, 3, 0, 0]} stackId={s.stack} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// "LIVE" pulse pill — shows socket connection state.
export function LiveDot({ live }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider">
      <span className={`relative flex h-2 w-2`}>
        {live && <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${live ? 'bg-emerald-400' : 'bg-slate-600'}`} />
      </span>
      <span className={live ? 'text-emerald-400' : 'text-slate-500'}>{live ? 'live' : 'offline'}</span>
    </span>
  );
}
