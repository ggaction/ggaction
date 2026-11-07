import { cloneAndFreeze, isOwned } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { encodeValue } from "../../core/valueEncoding.js";
import { getErrorDetails } from "../../core/diagnostics.js";
import { DEFAULT_FONT_FAMILY, textMetricKey, textMetricFontWeight } from "../../core/font.js";
import { fontMetricBinding, textBoundsFitCanvas } from "../../core/textMetrics.js";
import { normalizeFontMetricProfile } from "../../core/textMetricProfile.js";
import { rejectUnknownProperties, validateGeneratedItemLimit, validateUnitInterval, validateWorkLimit } from "../../core/validation.js";
import { normalizeResponsiveLabels } from "../../grammar/responsiveLabels.js";
import { normalizeResponsiveCanvas } from "../../grammar/responsiveCanvas.js";
import { cartesianPosition, normalizeCartesianPosition, resolveCartesianPosition, prepareCartesianPosition, sampleCartesianPosition } from "../../grammar/animation/cartesianPosition.js";
import { interpolateNumber } from "../../grammar/animation/values.js";
import { textGraphemeSegments, textHardLines } from "../../layout/text.js";
import { axisLabelTexts } from "../axisLabelText.js";
import { createAxisLabelQueryCollector } from "../axisLabelQueries.js";
import { resolveAxisLabelCandidates } from "../axisLabelCandidates.js";
import { normalizeAxisAnimationConfig, prepareAxisAnimationConfig } from "./axisLabelState.js";
import { normalizeGuideMetrics, prepareGuideMetrics } from "./guideMetrics.js";

const normalized = new WeakMap(), resolved = new WeakMap();
const same = (a, b) => JSON.stringify(encodeValue(a)) === JSON.stringify(encodeValue(b));
const fade = reason => Object.freeze({ kind: "crossfade", reason });
function record(value, keys, label) {
  ownRecord(value, label); rejectUnknownProperties(value, keys, label);
  if (keys.some(key => !Object.hasOwn(value, key))) throw new TypeError(`${label} requires every field.`);
}
function dimensions(value, keys, label, positive = []) {
  record(value, keys, label);
  for (const key of keys) if (!Number.isFinite(value[key]) || positive.includes(key) && value[key] < 0) {
    throw new RangeError(`${label} requires finite, nonnegative dimensions.`);
  }
  return value;
}
function configMeaning(input, channel) {
  record(input, ["base", "maxWidth", "wrap", "lineHeight", "responsive"], "Axis reflow policy");
  const base = normalizeAxisAnimationConfig(input.base, channel);
  if (input.maxWidth !== null && (!Number.isFinite(input.maxWidth) || input.maxWidth <= 0) ||
      !["word", "character"].includes(input.wrap) ||
      input.lineHeight !== null && (!Number.isFinite(input.lineHeight) || input.lineHeight < base.fontSize)) {
    throw new TypeError("Axis reflow requires a native wrap policy.");
  }
  let responsive = null;
  if (input.responsive !== null) {
    record(input.responsive, ["sequence", "maxLines", "skipStride", "rotationCandidates"], "Axis reflow responsive policy");
    responsive = normalizeResponsiveLabels(input.responsive);
    if (!same(responsive, input.responsive)) throw new TypeError("Axis reflow requires a canonical responsive policy.");
  }
  if (input.maxWidth === null && input.lineHeight !== null) throw new TypeError("Axis reflow lineHeight requires maxWidth.");
  return { ...input, base, responsive };
}
function nativeConfig(config) {
  return { ...Object.fromEntries(Object.entries(config.base).filter(([, v]) => v !== null)),
    ...(config.maxWidth === null ? {} : { maxWidth: config.maxWidth, wrap: config.wrap }),
    ...(config.lineHeight === null ? {} : { lineHeight: config.lineHeight }),
    ...(config.responsive === null ? {} : { responsive: config.responsive }) };
}
function constraintsMeaning(input) {
  record(input, ["minPlotSize", "margin", "titleBounds"], "Axis reflow constraints");
  dimensions(input.margin, ["top", "right", "bottom", "left"], "Axis reflow margins", ["top", "right", "bottom", "left"]);
  if (input.minPlotSize !== null) {
    record(input.minPlotSize, ["width", "height"], "Axis reflow minimum plot");
    normalizeResponsiveCanvas({ minPlotSize: input.minPlotSize });
  }
  if (input.titleBounds !== null) {
    dimensions(input.titleBounds, ["left", "right", "top", "bottom"], "Axis reflow title bounds");
    if (input.titleBounds.left > input.titleBounds.right || input.titleBounds.top > input.titleBounds.bottom) throw new RangeError("Axis reflow title bounds are reversed.");
  }
  return input;
}
function style(config) {
  const { fontFamily, fontSize, fontWeight } = config.base;
  return { fontFamily, fontSize, fontWeight, fontStyle: "normal" };
}
function texts(layout) {
  return axisLabelTexts(layout.values, resolveCartesianPosition(layout.mapping).resolvedScale, nativeConfig(layout.config));
}
function queryClosure(layout, accountWork) {
  const collector = createAxisLabelQueryCollector(accountWork);
  collector.wrap(texts(layout), style(layout.config), layout.config.wrap);
  return collector.values();
}
function workBudget(accountWork) {
  let work = 0;
  return count => { validateWorkLimit(work += count, "Axis reflow work"); accountWork?.(count); };
}
// This upper bound includes raw values hidden by the current skip decision. It
// is independent of endpoint node counts and is checked before native wrapping.
function preparationBounds(layout, spend) {
  let nodes = 0, work = layout.values.length;
  for (const text of texts(layout)) {
    if (text === "") continue;
    spend(text.length + 1);
    for (const line of textHardLines(text)) {
      const count = [...textGraphemeSegments(line)].length;
      nodes += Math.max(1, count);
      work += (line.length + 1) ** 2;
      validateGeneratedItemLimit(nodes, "Axis reflow potential lines");
      validateWorkLimit(work, "Axis reflow preparation work");
    }
  }
  return { nodes, work };
}
function layoutResult(layout, spend) {
  const budget = preparationBounds(layout, spend), config = nativeConfig(layout.config);
  const value = resolveAxisLabelCandidates({ values: layout.values,
    scale: resolveCartesianPosition(layout.mapping).resolvedScale, config, channel: layout.channel,
    bounds: layout.frame, canvas: layout.canvas, profile: layout.metrics, edgeAligned: layout.edgeAligned,
    responsive: layout.constraints.minPlotSize === null ? undefined : { minPlotSize: layout.constraints.minPlotSize },
    margin: layout.constraints.margin, titleBounds: layout.constraints.titleBounds ?? undefined,
    measuring: layout.constraints.minPlotSize !== null,
    accountPreparation: () => spend(budget.work), accountWork: spend });
  if (!value.labelBounds.every(bounds => textBoundsFitCanvas(bounds, layout.canvas))) throw new RangeError("Axis reflow labels do not fit the current Canvas.");
  const lines = new Map(), rotation = value.responsiveResult?.rotation ?? config.rotation;
  const entries = value.text.map((text, index) => {
    const group = value.groups[index], line = lines.get(group) ?? 0;
    lines.set(group, line + 1);
    return { value: value.values[group], line, type: "text", properties: {
      text, x: Array.isArray(value.x) ? value.x[index] : value.x, y: Array.isArray(value.y) ? value.y[index] : value.y,
      textAlign: value.textAlign, textBaseline: value.textBaseline,
      ...(rotation === 0 ? {} : { rotation })
    } };
  });
  return cloneAndFreeze({ entries, labelBounds: value.labelBounds, requiredBounds: value.requiredBounds ?? null,
    decision: value.responsiveResult ?? null, maxNodes: budget.nodes });
}
export function normalizeAxisLabelReflow(input, accountWork) {
  if (normalized.has(input) && accountWork === undefined) return normalized.get(input);
  record(input, ["channel", "frame", "canvas", "values", "mapping", "config", "metrics", "edgeAligned", "constraints"], "Axis reflow layout");
  if (!["x", "y"].includes(input.channel) || typeof input.edgeAligned !== "boolean") throw new TypeError("Axis reflow requires a Cartesian channel.");
  dimensions(input.frame, ["x", "y", "width", "height"], "Axis reflow frame", ["width", "height"]);
  dimensions(input.canvas, ["width", "height"], "Axis reflow Canvas", ["width", "height"]);
  if (input.canvas.width === 0 || input.canvas.height === 0) throw new RangeError("Axis reflow Canvas must be positive.");
  ownArray(input.values, "Axis reflow raw values"); validateGeneratedItemLimit(input.values.length, "Axis reflow value count");
  const seen = new Set(), spend = workBudget(accountWork);
  for (const value of input.values) {
    if (!["string", "boolean"].includes(typeof value) && !Number.isFinite(value)) throw new TypeError("Axis reflow requires exact raw values.");
    spend(1 + (typeof value === "string" ? value.length : 0));
    const key = JSON.stringify(encodeValue(value));
    if (seen.has(key)) throw new TypeError("Axis reflow raw values must be unique.");
    seen.add(key);
  }
  const mapping = normalizeCartesianPosition(input.mapping);
  if (Object.hasOwn(mapping, "offset") || mapping.scale.type === "ordinal-offset" ||
      !Object.is(mapping.value, input.values.length ? input.values[0] : mapping.scale.domain[0])) throw new TypeError("Axis reflow mapping must retain its first raw value.");
  const discrete = ["ordinal", "band", "point"].includes(mapping.scale.type), domain = mapping.scale.domain;
  const members = new Set(domain), low = Math.min(...(discrete ? [0] : domain)), high = Math.max(...(discrete ? [0] : domain));
  if (input.values.some(value => discrete ? !members.has(value) : typeof value !== "number" || value < low || value > high)) throw new RangeError("Axis reflow values must remain inside the native domain.");
  const config = configMeaning(input.config, input.channel), constraints = constraintsMeaning(input.constraints);
  const metrics = normalizeGuideMetrics(input.metrics), result = cloneAndFreeze({ ...input, mapping, config, constraints, metrics });
  const expected = queryClosure(result, spend).map(textMetricKey).sort();
  if (!same(expected, metrics.measurements.map(textMetricKey).sort())) throw new TypeError("Axis reflow requires its exact query closure.");
  if (metrics.schemaVersion === 2) fontMetricBinding(metrics, style(config));
  const geometry = layoutResult(result, spend);
  normalized.set(result, result); resolved.set(result, geometry);
  if (isOwned(input)) normalized.set(input, result);
  return result;
}
export function prepareAxisLabelReflow({ values, scale, config, channel, frame, canvas, profile, edgeAligned = false,
  responsive, margin, titleBounds }) {
  const canonical = { base: prepareAxisAnimationConfig(config), maxWidth: config.maxWidth ?? null,
    wrap: config.wrap ?? "word", lineHeight: config.lineHeight ?? null, responsive: config.responsive ?? null };
  const initial = { channel, frame, canvas, values, mapping: cartesianPosition(values.length ? values[0] : scale.domain[0], scale),
    config: canonical, edgeAligned, constraints: { minPlotSize: responsive?.minPlotSize ?? null,
      margin: margin ?? { top: 0, right: 0, bottom: 0, left: 0 }, titleBounds: titleBounds ?? null } };
  const queries = queryClosure(initial);
  const metrics = !queries.length && profile?.schemaVersion === 2
    ? normalizeFontMetricProfile({ schemaVersion: 2, id: "animation-axis-reflow", fonts: [fontMetricBinding(profile, style(canonical))], measurements: [] })
    : prepareGuideMetrics(queries, profile, "animation-axis-reflow");
  return normalizeAxisLabelReflow({ ...initial, metrics });
}
export function resolveAxisLabelReflow(input, accountWork) {
  const layout = normalizeAxisLabelReflow(input, accountWork);
  return resolved.get(layout);
}
export function axisLabelReflowMatchesNodes(input, nodes) {
  const layout = normalizeAxisLabelReflow(input), entries = resolved.get(layout).entries, config = layout.config.base;
  return nodes.length === entries.length && entries.every((entry, index) => {
    const node = nodes[index], properties = node.properties;
    return node.type === "text" && Object.entries(entry.properties).every(([key, value]) => same(value, properties[key])) &&
      (properties.rotation ?? 0) === (entry.properties.rotation ?? 0) &&
      (properties.fontFamily ?? DEFAULT_FONT_FAMILY) === config.fontFamily && properties.fontSize === config.fontSize &&
      textMetricFontWeight(properties.fontWeight) === config.fontWeight && (properties.fontStyle ?? "normal") === "normal" &&
      !Object.hasOwn(properties, "lines");
  });
}
function contentStable(a, b) {
  if (!same(texts(a), texts(b))) return false;
  // Native automatic time formatting depends on the entire domain. Only an
  // unchanged domain or an explicit label for every value proves the closure.
  return a.mapping.scale.type !== "time" || a.config.base.format !== "auto" ||
    same(a.mapping.scale.domain, b.mapping.scale.domain) ||
    a.values.every(value => a.config.base.labelMap.some(entry => Object.is(entry.value, value)));
}
export function prepareAxisLabelReflowPair(from, to) {
  const a = normalizeAxisLabelReflow(from), b = normalizeAxisLabelReflow(to);
  const policy = value => ({ channel: value.channel, values: value.values, edgeAligned: value.edgeAligned,
    config: { ...value.config, base: { ...value.config.base, offset: 0, alongOffset: 0 } }, metrics: value.metrics,
    minPlotSize: value.constraints.minPlotSize, titleBounds: value.constraints.titleBounds });
  if (!same(policy(a), policy(b)) || !contentStable(a, b)) return fade("guide-layout");
  const mapping = prepareCartesianPosition(a.mapping, b.mapping);
  return mapping.kind === "crossfade" ? mapping : cloneAndFreeze({ kind: "axis-label-reflow", from: a, to: b });
}
export function sampleAxisLabelReflow(from, to, progress, accountWork) {
  validateUnitInterval(progress, "Axis reflow progress");
  const pair = prepareAxisLabelReflowPair(from, to);
  if (pair.kind === "crossfade") return pair;
  const { from: a, to: b } = pair;
  if (progress === 0 || progress === 1) return cloneAndFreeze({ kind: "axis-label-reflow", layout: progress === 0 ? a : b });
  const mapping = sampleCartesianPosition(prepareCartesianPosition(a.mapping, b.mapping), progress);
  if (mapping.kind === "crossfade") return mapping;
  const numbers = (x, y) => Object.fromEntries(Object.keys(x).map(key => [key, interpolateNumber(x[key], y[key], progress)]));
  try {
    const layout = normalizeAxisLabelReflow({ ...a, mapping: { value: mapping.value, scale: mapping.scale },
      frame: numbers(a.frame, b.frame), canvas: numbers(a.canvas, b.canvas),
      config: { ...a.config, base: { ...a.config.base,
        offset: interpolateNumber(a.config.base.offset, b.config.base.offset, progress),
        alongOffset: interpolateNumber(a.config.base.alongOffset, b.config.base.alongOffset, progress) } },
      constraints: { ...a.constraints, margin: numbers(a.constraints.margin, b.constraints.margin) } }, accountWork);
    return cloneAndFreeze({ kind: "axis-label-reflow", layout });
  } catch (error) {
    if (["canvas-overflow", "label-overlap", "layout-unsatisfied"].includes(getErrorDetails(error)?.reason) ||
        /Axis reflow labels do not fit|cannot flush inside the scale span|labels overlap the axis title/u.test(error.message)) return fade("guide-layout");
    throw error;
  }
}
