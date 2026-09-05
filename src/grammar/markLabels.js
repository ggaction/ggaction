import { aggregateRows } from "./aggregate.js";
import { BAR_GRAINS, resolveBarChannels, resolveBarGrain } from "./bars/policy.js";
import { stableFiniteSum } from "./numeric.js";

const CONTENTS = new Set(["category", "value", "share"]);
const NORMALIZATIONS = new Set(["source", "category"]);

export function validateMarkLabelContent(content) {
  if (!CONTENTS.has(content)) throw new Error(`Unsupported text content "${content}".`);
  return content;
}

export function validateMarkLabelNormalization(normalizeBy) {
  if (!NORMALIZATIONS.has(normalizeBy)) throw new Error(`Unsupported text normalizeBy "${normalizeBy}".`);
  return normalizeBy;
}

export function normalizeMarkLabelContent(source, { content, normalizeBy }) {
  validateMarkLabelContent(content);
  if (!["bar", "arc"].includes(source?.mark?.type)) {
    throw new Error("Semantic text content requires a Bar or Arc source; use field or value for other marks.");
  }
  if (content !== "share" && normalizeBy !== undefined) {
    throw new Error("Text normalizeBy is only supported with share content.");
  }
  const normalization = content === "share" ? normalizeBy ?? "source" : undefined;
  if (normalization !== undefined) validateMarkLabelNormalization(normalization);
  if (normalization === "category" && source.mark.type !== "bar") {
    throw new Error("Category share normalization requires a Bar source.");
  }
  if (source.mark.type === "bar") {
    const grain = resolveBarGrain(source);
    if (grain === BAR_GRAINS.ranged) {
      throw new Error("Ranged Bar text requires an explicit field or value.");
    }
    if (content === "category" && grain === BAR_GRAINS.histogram) {
      throw new Error("Histogram categories are intervals; use an explicit text field or value.");
    }
  } else if (content === "category" && source.encoding?.theta?.fieldType === "quantitative") {
    throw new Error("Category text requires categorical Arc theta.");
  }
  return { content, ...(normalization === undefined ? {} : { normalizeBy: normalization }) };
}

function itemValue(source, item) {
  if (source.mark.type === "bar") {
    if (resolveBarGrain(source) === BAR_GRAINS.histogram) return item.members.length;
    const measure = source.encoding[resolveBarChannels(source).measure];
    return measure.aggregate === "count" ? item.members.length
      : aggregateRows(item.members, measure.field, measure.aggregate);
  }
  if (source.encoding?.radius !== undefined) return item.channels.radius;
  const theta = source.encoding.theta;
  if (theta.fieldType === "quantitative") return item.channels.theta;
  return theta.aggregate === "count" ? item.members.length
    : aggregateRows(item.members, theta.weight, "sum");
}

function categoryValue(source, item) {
  return item.channels[source.mark.type === "arc" ? "theta" : resolveBarChannels(source).category];
}

function categoryKey(source, item) {
  return JSON.stringify(resolveBarGrain(source) === BAR_GRAINS.histogram
    ? [item.channels.x, item.channels.x2]
    : [categoryValue(source, item)]);
}

export function resolveMarkLabelValues(source, items, options) {
  const config = normalizeMarkLabelContent(source, options);
  if (config.content === "category") return items.map(item => categoryValue(source, item));
  const values = items.map(item => itemValue(source, item));
  if (config.content === "value" || items.length === 0) return values;
  if (values.some(value => !Number.isFinite(value) || value < 0)) {
    throw new Error("Share labels require finite non-negative source values.");
  }
  const groups = new Map();
  items.forEach((item, index) => {
    const key = config.normalizeBy === "source" ? "source" : categoryKey(source, item);
    const group = groups.get(key) ?? [];
    group.push(index);
    groups.set(key, group);
  });
  const shares = [];
  for (const indices of groups.values()) {
    const maximum = indices.reduce((max, index) => Math.max(max, values[index]), 0);
    if (maximum === 0) throw new Error("Share label denominator must be positive.");
    // Ratios remain defined even when the unscaled sum would overflow.
    const total = stableFiniteSum(indices.map(index => values[index] / maximum), "Share label denominator");
    for (const index of indices) shares[index] = (values[index] / maximum) / total;
  }
  return shares;
}
