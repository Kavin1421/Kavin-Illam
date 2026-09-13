/**
 * Design token helpers for JS (charts, inline styles).
 * CSS remains the source of truth — see globals.css + UI_REDESIGN.md.
 */
export const kiColors = {
  navy: "#101828",
  midnight: "#172033",
  ivory: "#F8F6F1",
  white: "#FFFFFF",
  stone: "#E9E5DC",
  champagne: "#C9A86A",
  gold: "#B89455",
  charcoal: "#252A34",
  muted: "#667085",
  success: "#168A63",
  warning: "#C98522",
  danger: "#C94B4B",
  info: "#3E6FA8",
} as const;

export const kiChartPalette = [
  kiColors.navy,
  kiColors.champagne,
  kiColors.info,
  kiColors.success,
  kiColors.muted,
] as const;

export const kiMotion = {
  fastMs: 160,
  normalMs: 200,
  slowMs: 400,
  easeOut: "cubic-bezier(0.16, 1, 0.3, 1)",
} as const;

export const kiLayout = {
  sidebarWidthPx: 264,
  sidebarCollapsedPx: 72,
  headerHeightPx: 72,
  contentMaxPx: 1440,
} as const;
