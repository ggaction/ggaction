import {validateNonNegativeFinite} from "../core/validation.js";

export const LEGEND_SPACING_KEYS = Object.freeze(["rowPadding", "titlePadding"]);

export function normalizeLegendSpacing(options) {
  const result = {};
  for (const key of LEGEND_SPACING_KEYS) {
    if (options[key] === undefined) continue;
    validateNonNegativeFinite(options[key], `Legend ${key}`);
    result[key] = options[key];
  }
  return result;
}

// Reset removes an intent; an omitted/undefined edit preserves it. Normalizers
// consume only numeric stored values, never the authoring-only reset token.
export function patchLegendSpacing(config, options) {
  const result = {...config};
  for (const key of LEGEND_SPACING_KEYS) {
    if (options[key] === undefined) continue;
    if (options[key] === "auto") delete result[key];
    else {
      validateNonNegativeFinite(options[key], `Legend ${key}`);
      result[key] = options[key];
    }
  }
  return result;
}

export function prepareLegendSpacingEdit(config, options) {
  const args = {...options};
  for (const key of LEGEND_SPACING_KEYS) delete args[key];
  return {previous:patchLegendSpacing(config, options), args};
}

export function validateLegendSpacing(kind, config) {
  normalizeLegendSpacing(config);
  if (LEGEND_SPACING_KEYS.some(key => config[key] !== undefined) && config.layout === "legacy-bottom") {
    throw new Error('Legend rowPadding and titlePadding require layout "edge".');
  }
  if (config.rowPadding !== undefined && ["gradient", "strokeGradient"].includes(kind) &&
      config.representation !== "symbols") {
    throw new Error("Legend rowPadding requires an item-based legend.");
  }
}
