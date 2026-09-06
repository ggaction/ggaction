export const DEFAULT_FONT_FAMILY = "sans-serif";

export const DEFAULT_POINT_RADIUS = 3;

export const DEFAULT_COLORS = Object.freeze({
  mark: "#4c78a8",
  text: "#334155",
  strongText: "#0f172a",
  mutedText: "#64748b",
  axis: "#475569",
  axisTitle: "#1e293b",
  grid: "#e2e8f0",
  border: "#cbd5e1",
  sizeSymbol: "#94a3b8",
  regressionBand: "#111111",
  boxLine: "#111111",
  boxMedian: "#1f2937",
  referenceLine: "#64748b",
  referenceBand: "#94a3b8",
  gradientCenter: "#0f172a",
  highlight: "#dc2626"
});

export const THEME_NAMES = Object.freeze(["light", "dark"]);

export const THEME_TOKENS = Object.freeze({
  light: Object.freeze({
    background: "white",
    ...DEFAULT_COLORS,
    fontFamily: DEFAULT_FONT_FAMILY
  }),
  dark: Object.freeze({
    background: "#0f172a",
    mark: "#60a5fa",
    text: "#e2e8f0",
    strongText: "#f8fafc",
    mutedText: "#94a3b8",
    axis: "#cbd5e1",
    axisTitle: "#f1f5f9",
    grid: "#334155",
    border: "#475569",
    sizeSymbol: "#94a3b8",
    regressionBand: "#f8fafc",
    boxLine: "#f8fafc",
    boxMedian: "#f8fafc",
    referenceLine: "#94a3b8",
    referenceBand: "#94a3b8",
    gradientCenter: "#f8fafc",
    highlight: DEFAULT_COLORS.highlight,
    fontFamily: DEFAULT_FONT_FAMILY
  })
});

export function themeTokens(name = "light") {
  return THEME_TOKENS[name];
}
