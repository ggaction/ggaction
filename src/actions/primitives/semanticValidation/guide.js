import { normalizeLegendOrder } from "../../../grammar/categoryOrder.js";
import { validateUserId } from "../../../core/identifiers.js";
import { CATEGORICAL_LEGEND_CHANNELS } from "../../../core/vocabulary.js";
import { validateNonEmptySemanticString } from "./shared.js";

function validateLegend(property, value) {
  if (property === "title") {
    validateNonEmptySemanticString(value, "Legend title");
    return;
  }
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError(`Legend ${property} must be a non-empty array.`);
  }
  if (new Set(value).size !== value.length) {
    throw new Error(`Legend ${property} must not contain duplicates.`);
  }
  if (property === "channels") {
    if (!value.every(channel => CATEGORICAL_LEGEND_CHANNELS.includes(channel))) {
      throw new Error("Legend channels support only color, strokeDash, and shape.");
    }
    return;
  }
  for (const id of value) validateUserId(id, "Legend scale id");
}

export function validateGuideSemanticValue(_program, parsed, value) {
  const property = parsed.path.at(-1);
  if (["legend.series", "legend.color"].includes(parsed.id) && property === "order") {
    normalizeLegendOrder(value);
    return;
  }
  if (parsed.id === "legend.series") {
    validateLegend(property, value);
    return;
  }
  if (!parsed.id.startsWith("grid.") && !parsed.id.startsWith("axis.")) return;
  if (parsed.id === "axis.parallel" && property === "scales") {
    if (!Array.isArray(value) || value.length < 2) {
      throw new TypeError("Parallel axis scales must contain at least two ids.");
    }
    value.forEach(id => validateUserId(id, "Parallel axis scale id"));
  } else if (property === "title") {
    validateNonEmptySemanticString(value, "Axis title");
  } else {
    const guideKind = parsed.id.startsWith("grid.") ? "Grid" : "Axis";
    validateUserId(value, `${guideKind} ${property} id`);
  }
}
