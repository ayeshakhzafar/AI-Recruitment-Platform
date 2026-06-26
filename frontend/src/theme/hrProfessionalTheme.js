/**
 * Recruto HR — forest green / mint professional dashboard tokens
 * (aligned with glassy card UI: soft shadows, rounded surfaces, green accents)
 */
export const HR_THEME = {
  fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif',

  // Landing-page style: slate / navy + blue accents
  bgPage: "#f1f5f9",
  bgPageAlt: "#f8fafc",
  bgCard: "#ffffff",
  bgMuted: "#f1f5f9",
  bgDarkPanel: "linear-gradient(145deg, #030712 0%, #0b1220 48%, #111827 100%)",

  borderSubtle: "1px solid rgba(37, 99, 235, 0.12)",
  borderLight: "1px solid rgba(148, 163, 184, 0.35)",
  divider: "1px solid rgba(37, 99, 235, 0.10)",

  primary: "#3b82f6",
  primaryStrong: "#2563eb",
  primarySoft: "#93c5fd",
  mint: "#93c5fd",
  sage: "#bfdbfe",
  emerald: "#60a5fa",
  forest: "#0b1220",

  text: "#0f172a",
  textHeading: "#0f172a",
  textSecondary: "#475569",
  textMuted: "#64748b",

  white: "#ffffff",
  onPrimary: "#ffffff",

  sidebar: {
    bg: "linear-gradient(180deg, #030712 0%, #0b1220 42%, #111827 100%)",
    border: "1px solid rgba(147, 197, 253, 0.14)",
    shadow: "4px 0 36px rgba(2, 6, 23, 0.45)",
  },

  navActive: {
    bg: "linear-gradient(135deg, rgba(59, 130, 246, 0.28) 0%, rgba(147, 197, 253, 0.12) 100%)",
    border: "1px solid rgba(147, 197, 253, 0.45)",
    accentBar: "#93c5fd",
    icon: "#93c5fd",
  },

  brandMark: {
    bg: "linear-gradient(135deg, #93c5fd 0%, #3b82f6 52%, #2563eb 100%)",
    shadow: "0 4px 16px rgba(37, 99, 235, 0.35)",
  },

  header: {
    bg: "rgba(255, 255, 255, 0.88)",
    backdrop: "blur(14px)",
    borderBottom: "1px solid rgba(37, 99, 235, 0.10)",
    shadow: "0 4px 24px rgba(2, 6, 23, 0.06)",
  },

  search: {
    bg: "#f1f5f9",
    border: "1px solid rgba(37, 99, 235, 0.16)",
    borderFocus: "1px solid rgba(59, 130, 246, 0.45)",
  },

  shadowCard: "0 10px 40px rgba(2, 6, 23, 0.08)",
  shadowCardHover: "0 14px 44px rgba(2, 6, 23, 0.12)",
  radiusXl: 22,
  radiusLg: 18,
  radiusMd: 14,
  radiusSm: 10,
  radiusPill: 9999,

  badgeMint: { bg: "rgba(59, 130, 246, 0.18)", color: "#bfdbfe" },
  badgeViolet: { bg: "rgba(147, 197, 253, 0.14)", color: "#dbeafe" },
  badgeBlue: { bg: "rgba(37, 99, 235, 0.16)", color: "#bfdbfe" },

  buttonPrimary: {
    background: "linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)",
    color: "#fff",
    border: "none",
    boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
  },
  buttonSecondary: {
    background: "#fff",
    color: "#0f172a",
    border: "1px solid rgba(37, 99, 235, 0.22)",
  },

  /** Tighter HR dashboard — more tables / charts per viewport */
  density: {
    sidebarWidth: 236,
    sidebarPadding: "18px 12px",
    brandMarkSize: 36,
    navItemPadding: "8px 10px",
    navFontSize: 12,
    snapshotPadding: 14,
    snapshotRowGap: 8,
    headerPadding: "10px 20px",
    headerGap: 14,
    headerIconBox: 36,
    mainPadding: "14px 20px 28px",
    moduleHeaderMb: 14,
    moduleHeaderPb: 12,
    moduleTitleSize: 21,
    moduleDescSize: 13,
  },

  overviewDensity: {
    cardPadding: 14,
    cardRadius: 14,
    kpiMin: 148,
    kpiGap: 10,
    kpiRowMb: 12,
    chartMin: 260,
    chartMinLg: 300,
    chartGap: 12,
    chartRowMb: 12,
    chartHBar: 200,
    chartHStd: 190,
    chartHFunnel: 200,
  },
};

export const HR_CHART = {
  forest: "#1e3a8a",
  deep: "#1d4ed8",
  mid: "#3b82f6",
  mint: "#93c5fd",
  sage: "#bfdbfe",
  muted: "#94a3b8",
  grid: "#e2e8f0",
  funnel: ["#1e3a8a", "#1d4ed8", "#2563eb", "#3b82f6", "#93c5fd"],
};
