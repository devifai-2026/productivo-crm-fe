// Grafana / "hacker console" design tokens — kept in a non-component module so
// Fast Refresh stays happy (GrafanaKit.jsx only exports components).

export const NEON = {
  green: '#22c55e', cyan: '#22d3ee', blue: '#3b82f6', violet: '#8b5cf6',
  amber: '#f59e0b', red: '#ef4444', pink: '#ec4899', lime: '#84cc16',
};

// A stable categorical palette for charts (cycled by index).
export const SERIES_COLORS = ['#22d3ee', '#8b5cf6', '#22c55e', '#f59e0b', '#ec4899', '#3b82f6', '#84cc16', '#ef4444', '#14b8a6', '#a78bfa'];

export const grafanaTooltip = {
  borderRadius: 8,
  fontSize: 12,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  border: '1px solid rgba(34,211,238,0.25)',
  background: 'rgba(2,6,23,0.95)',
  color: '#e2e8f0',
  boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
};

export const BUCKET_NOUN = { day: 'Daily', week: 'Weekly', month: 'Monthly' };
