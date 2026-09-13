/**
 * Design token helpers for JS (charts, inline styles).
 * CSS remains the source of truth — see globals.css + UI_REDESIGN.md.
 */
export const kiColors = {
  bg: "#063F3A",
  tealDeep: "#064E49",
  tealDark: "#053532",
  surface: "#062D2A",
  emerald: "#047857",
  emeraldBright: "#00C875",
  cta: "#00D084",
  mint: "#5EEAD4",
  mintLight: "#A7F3D0",
  cyan: "#22D3EE",
  blue: "#3B82F6",
  purple: "#8B5CF6",
  pink: "#EC4899",
  white: "#FFFFFF",
  offWhite: "#F1F5F9",
  mutedWhite: "#B8D6D1",
  muted: "#86A8A3",
  amber: "#F59E0B",
  warning: "#F59E0B",
  danger: "#EF4444",
  /** @deprecated Prefer kiColors.tealDark — kept for temporary call sites */
  navy: "#053532",
  midnight: "#062D2A",
  ivory: "#063F3A",
  champagne: "#00C875",
  gold: "#00D084",
  charcoal: "#F1F5F9",
  success: "#00C875",
  info: "#22D3EE",
  stone: "#064E49",
} as const;

/** Chart accents — emerald dominant, supporting cyan/blue/purple/pink/amber */
export const kiChartPalette = [
  kiColors.emeraldBright,
  kiColors.cyan,
  kiColors.blue,
  kiColors.purple,
  kiColors.mint,
  kiColors.amber,
] as const;

export const kiMetricAccents = {
  budget: kiColors.cyan,
  spent: kiColors.emeraldBright,
  advances: kiColors.purple,
  commitments: kiColors.amber,
} as const;

export const kiMotion = {
  fastMs: 160,
  normalMs: 200,
  slowMs: 400,
  easeOut: "cubic-bezier(0.16, 1, 0.3, 1)",
} as const;

export const kiLayout = {
  sidebarWidthPx: 250,
  sidebarCollapsedPx: 72,
  headerHeightPx: 68,
  contentMaxPx: 1500,
} as const;
