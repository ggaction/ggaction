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
  "fontFamily"
]);

const THEME_DEFINITION_KEYS = Object.freeze(["base", "tokens"]);

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function own(value) {
  return Object.freeze({ ...value });
}

function validateKeys(value, allowed, label) {
  const supported = new Set(allowed);
  const unknown = Object.keys(value).find(key => !supported.has(key));
  if (unknown !== undefined) {
    throw new Error(`Unknown ${label} option "${unknown}".`);
  }
}

function validateNonEmptyString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  return value;
}

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

function validateThemeName(value, label) {
  if (!THEME_NAMES.includes(value)) {
    throw new Error(`Unsupported ${label} "${value}".`);
  }
  return value;
}

function normalizeThemeTokens(tokens) {
  if (!isPlainObject(tokens)) {
    throw new TypeError("applyTheme theme.tokens must be a plain object.");
  }
  validateKeys(tokens, THEME_TOKEN_KEYS, "applyTheme theme.tokens");
  const normalized = {};
  for (const [key, value] of Object.entries(tokens)) {
    validateNonEmptyString(value, `applyTheme theme.tokens.${key}`);
    normalized[key] = value;
  }
  return own(normalized);
}

export function normalizeThemeDefinition(definition) {
  if (typeof definition === "string") {
    return own({
      name: validateThemeName(definition, "theme"),
      tokens: own({})
    });
  }
  if (!isPlainObject(definition)) {
    throw new TypeError(
      "applyTheme theme must be a built-in name or a plain { base, tokens } object."
    );
  }
  validateKeys(definition, THEME_DEFINITION_KEYS, "applyTheme theme");
  if (!Object.hasOwn(definition, "base") ||
      !Object.hasOwn(definition, "tokens")) {
    throw new Error("applyTheme custom theme requires base and tokens.");
  }
  return own({
    name: validateThemeName(definition.base, "theme base"),
    tokens: normalizeThemeTokens(definition.tokens)
  });
}

export function resolveThemeTokens(definition = "light") {
  const normalized = normalizeThemeDefinition(definition);
  return own({
    ...THEME_TOKENS[normalized.name],
    ...normalized.tokens
  });
}
