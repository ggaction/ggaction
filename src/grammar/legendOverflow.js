import { validateOptionObject } from "../core/validation.js";

export function normalizeLegendOverflow(value, { summarySymbol = false } = {}) {
  if (value === undefined || value === false) return value;
  validateOptionObject(value, ["maxItems", "summary", "summarySymbol"], "Legend overflow");
  if (!Number.isInteger(value.maxItems) || value.maxItems < 1) {
    throw new RangeError("Legend overflow.maxItems must be a positive integer.");
  }
  if (value.summary !== undefined && value.summary !== "ellipsis-count") {
    throw new Error("Legend overflow.summary must be ellipsis-count.");
  }
  if (value.summarySymbol !== undefined && (!summarySymbol || value.summarySymbol !== "first-hidden")) {
    throw new Error("Legend overflow.summarySymbol requires first-hidden on categorical line samples.");
  }
  return { maxItems: value.maxItems, summary: "ellipsis-count",
    ...(value.summarySymbol === undefined ? {} : { summarySymbol: value.summarySymbol }) };
}

export function validateLegendOverflow(kind, config) {
  normalizeLegendOverflow(config.overflow, { summarySymbol: ["series", "color", "stroke"].includes(kind) });
  if (config.overflow?.summarySymbol !== undefined &&
      (!config.symbol?.layers?.length || config.symbol.layers.some(layer => layer.type !== "line"))) {
    throw new Error("Legend overflow.summarySymbol requires a categorical line-only sample recipe.");
  }
}

export function categoricalLegendView(config) {
  if (config.hiddenCount !== undefined || !config.overflow || config.domain.length <= config.overflow.maxItems) return config;
  return { ...config, domain: config.domain.slice(0, config.overflow.maxItems + (config.overflow.summarySymbol === "first-hidden" ? 1 : 0)),
    hiddenCount: config.domain.length - config.overflow.maxItems };
}
