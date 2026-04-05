import chroma from 'chroma-js';

// Vibrant palette — enough variety that nearby IDs still look distinct
const PALETTE = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f97316', // orange
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#f59e0b', // amber
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#ef4444', // red
  '#84cc16', // lime
  '#a855f7', // purple
  '#0ea5e9', // sky
  '#f43f5e', // rose
  '#22c55e', // green
];

/**
 * Deterministic color derived from an entity's ID or name string.
 * Returns an object with bg, text, border, dot — all Tailwind-compatible inline styles.
 */
export function getEntityColor(idOrName = '') {
  // Hash the string to a stable index
  let hash = 0;
  for (let i = 0; i < idOrName.length; i++) {
    hash = (hash * 31 + idOrName.charCodeAt(i)) >>> 0;
  }
  const base = PALETTE[hash % PALETTE.length];

  const color = chroma(base);
  const lightBg = color.alpha(0.12).css();
  const darkBg = color.alpha(0.18).css();
  const borderColor = color.alpha(0.3).css();
  const textColor = color.darken(0.5).hex();

  return {
    hex: base,
    lightBg,
    darkBg,
    borderColor,
    textColor,
    // Convenience: Tailwind-style inline styles for use in style={{}}
    style: {
      backgroundColor: lightBg,
      borderColor,
      color: textColor,
    },
    dotStyle: {
      backgroundColor: base,
    },
  };
}

/**
 * Returns a CSS gradient string for use as background.
 */
export function getEntityGradient(idOrName = '') {
  const { hex } = getEntityColor(idOrName);
  const c = chroma(hex);
  return `linear-gradient(135deg, ${c.brighten(0.5).hex()}, ${c.darken(0.5).hex()})`;
}
