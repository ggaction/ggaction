import { DEFAULT_FONT_FAMILY } from "../core/font.js";
export { DEFAULT_FONT_FAMILY };

export const DEFAULT_POINT_RADIUS = 3;
export const AXIS_LABEL_FONT_SIZES = Object.freeze({ cartesian: 12, polar: 11, parallel: 11 });
export const AXIS_TITLE_FONT_SIZE = 13;
export const AXIS_LABEL_FONT_WEIGHT = "normal";
export const AXIS_TITLE_FONT_WEIGHT = 600;
export const DEFAULT_VERTICAL_LEGEND_ITEM_GAP = 18;

export function nativeLegendItemGap(kind, { direction, position = "right", titlePosition = "top" } = {}) {
  const side = !["top", "bottom"].includes(position);
  if (kind === "continuous") return titlePosition === "left" ? 20 : 28;
  if (kind === "opacity") return side ? DEFAULT_VERTICAL_LEGEND_ITEM_GAP : titlePosition === "left" ? 20 : 28;
  if (kind === "sampled") return side ? DEFAULT_VERTICAL_LEGEND_ITEM_GAP : 20;
  if ((direction ?? (side ? "vertical" : "horizontal")) === "vertical") return DEFAULT_VERTICAL_LEGEND_ITEM_GAP;
  if (["series", "color", "stroke"].includes(kind)) return position === "top" ? 24 : 20;
  if (["size", "colorSize"].includes(kind)) return 40;
  return kind === "strokeWidth" ? 32 : 28;
}

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
export const GUIDE_NUMERIC_THEME_TOKENS = Object.freeze(["axisStrokeWidth", "tickStrokeWidth", "tickSize", "gridStrokeWidth", "axisLabelGap", "axisTitleGap"]);

export const THEME_TOKEN_KEYS = Object.freeze([
  "background",
  "mark",
  "text",
  "strongText",
  "mutedText",
  "axis",
  "axisTitle",
  "grid",
  "border",
  "sizeSymbol",
  "regressionBand",
  "boxLine",
  "boxMedian",
  "referenceLine",
  "referenceBand",
  "gradientCenter",
  "highlight",
  "fontFamily", "axisLabel", "axisLabelFontFamily", "axisTitleFontFamily",
  "axisLabelFontSize", "axisTitleFontSize", "fontSize", "fontWeight", ...GUIDE_NUMERIC_THEME_TOKENS, "legendItemGap", "palette", "patternPalette"
]);

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
