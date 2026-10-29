import { validateFillPaint, isPatternPaint } from "../../grammar/paint.js";
import { validateGeneratedItemLimit } from "../../core/validation.js";
import { ownRecord, ownArray } from "../../core/ownData.js";
import { THEME_NAMES, THEME_TOKEN_KEYS, GUIDE_NUMERIC_THEME_TOKENS, THEME_TOKENS } from "../../theme/defaults.js";

const THEME_DEFINITION_KEYS = Object.freeze(["base", "tokens"]);

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

function validateThemeName(value, label) {
  if (!THEME_NAMES.includes(value)) {
    throw new Error(`Unsupported ${label} "${value}".`);
  }
  return value;
}

function normalizeThemeTokens(tokens) {
  ownRecord(tokens, "applyTheme theme.tokens");
  validateKeys(tokens, THEME_TOKEN_KEYS, "applyTheme theme.tokens");
  const normalized = {};
  for (const [key, value] of Object.entries(tokens)) {
    if (key === "palette" || key === "patternPalette") {
      ownArray(value, `applyTheme theme.tokens.${key}`);
      validateGeneratedItemLimit(value.length, "Theme palette length");
      if (!value.length) throw new RangeError("Theme palettes must not be empty.");
      normalized[key] = Object.freeze(value.map(item => {
        if (key === "palette") return validateNonEmptyString(item, "Theme palette color");
        if (!isPatternPaint(item)) throw new TypeError("Theme patternPalette requires pattern fills.");
        return validateFillPaint(item, "Theme patternPalette fill");
      }));
      continue;
    }
    if (GUIDE_NUMERIC_THEME_TOKENS.includes(key)) {
      if (!Number.isFinite(value) || value < 0) throw new RangeError(`applyTheme theme.tokens.${key} must be nonnegative and finite.`);
    } else if (key === "legendItemGap") {
      if (!Number.isFinite(value) || value <= 0) throw new RangeError("applyTheme theme.tokens.legendItemGap must be positive and finite.");
    } else if (key.endsWith("FontSize") || key === "fontSize") {
      if (!Number.isFinite(value) || value <= 0) throw new RangeError(`applyTheme theme.tokens.${key} must be positive and finite.`);
    } else if (key === "fontWeight") {
      if (!Number.isFinite(value) && !(typeof value === "string" && value.length > 0)) {
        throw new TypeError("applyTheme theme.tokens.fontWeight must be a non-empty string or finite number.");
      }
    } else validateNonEmptyString(value, `applyTheme theme.tokens.${key}`);
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
  ownRecord(definition, "applyTheme theme");
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
