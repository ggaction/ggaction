import { cloneAndFreeze, isOwned } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateWorkLimit, validateUnitInterval } from "../../core/validation.js";
import { getErrorDetails } from "../../core/diagnostics.js";
import { DEFAULT_FONT_FAMILY, textMetricFontWeight, textMetricKey } from "../../core/font.js";
import { measureTextWidth, fontMetricBinding, resolveTextBounds, unionBounds } from "../../core/textMetrics.js";
import { normalizeTextMetricProfile, normalizeFontMetricProfile } from "../../core/textMetricProfile.js";
import { normalizeLegendSampling } from "../../grammar/legendSampling.js";
import { validateValueFormat } from "../../grammar/valueFormat.js";
import { cartesianPosition, normalizeCartesianPosition, prepareCartesianPosition, sampleCartesianPosition } from "../../grammar/animation/cartesianPosition.js";
import { interpolateNumber } from "../../grammar/animation/values.js";
import { normalizeGuideIdentity, guideAnimationKey, ANIMATION_GUIDE_VERSION } from "../../grammar/animation/guideState.js";
import { resolveGradientLayoutValues, gradientStripGeometry, GRADIENT_STRIP_COUNT } from "../guides/legendGradient.js";
import { resolveLegendTitleText } from "../../layout/legendText.js";
import { resolveSingleSideLegendPlacement, resolveSingleHorizontalLegendPlacement } from "../../layout/legendLane.js";
import { encodeValue } from "../../core/valueEncoding.js";

const same = (a, b) => JSON.stringify(encodeValue(a)) === JSON.stringify(encodeValue(b));
const layouts = new WeakMap(), geometries = new WeakMap(), sampledLayouts = new WeakMap();
const fade = reason => Object.freeze({ kind: "crossfade", reason });
const configKeys = ["position", "align", "offset", "title", "titleVisible", "titlePosition", "gradientDirection", "gradient", "sampling", "fieldType", "labels", "titleStyle", "blockGap", "titlePadding"];
const fontKeys = ["fontFamily", "fontSize", "fontWeight", "fontStyle", "align"];
function record(value, keys, label) {
  ownRecord(value, label);
  rejectUnknownProperties(value, keys, label);
  if (keys.some(key => !Object.hasOwn(value, key))) throw new TypeError(`${label} requires every field.`);
}
function finite(value, positive = false) {
  if (!Number.isFinite(value) || value < 0 || positive && value === 0) throw new RangeError("Legend dimensions must be finite and nonnegative.");
}
function style(input, labels) {
  record(input, labels ? [...fontKeys, "offset", "format"] : fontKeys, "Prepared legend text style");
  if (typeof input.fontFamily !== "string" || !input.fontFamily.length || !["normal", "italic"].includes(input.fontStyle) ||
      !Number.isInteger(input.fontWeight) || input.fontWeight < 100 || input.fontWeight > 900 || input.fontWeight % 100 !== 0 ||
      ![null, "left", "center", "right"].includes(input.align)) throw new TypeError("Prepared legend requires exact text style.");
  finite(input.fontSize, true);
  if (labels) { finite(input.offset); validateValueFormat(input.format, "Prepared legend format"); }
  return input;
}
function nativeConfig(config) {
  const withoutNull = object => Object.fromEntries(Object.entries(object).filter(([, value]) => value !== null));
  return { ...withoutNull(config), border: false, count: config.sampling.count,
    labels: withoutNull(config.labels), titleStyle: withoutNull(config.titleStyle) };
}
function normalizeConfig(input) {
  record(input, configKeys, "Prepared gradient legend config");
  if (!["left", "right", "top", "bottom"].includes(input.position) || !["left", "center", "right"].includes(input.align) ||
      !["top", "bottom"].includes(input.titlePosition) || ![null, "horizontal", "vertical"].includes(input.gradientDirection) ||
      typeof input.title !== "string" || typeof input.titleVisible !== "boolean" || !["quantitative", "temporal"].includes(input.fieldType)) {
    throw new TypeError("Prepared gradient legend requires native layout policy.");
  }
  validateWorkLimit(input.title.length, "Prepared legend text work");
  finite(input.offset); finite(input.blockGap);
  if (input.titlePadding !== null) finite(input.titlePadding);
  record(input.gradient, ["length", "thickness"], "Prepared gradient dimensions");
  finite(input.gradient.length, true); finite(input.gradient.thickness, true);
  record(input.sampling, ["mode", "values", "count"], "Prepared gradient samples");
  ownArray(input.sampling.values, "Prepared gradient samples");
  if (input.sampling.mode !== "values") throw new TypeError("Prepared gradient requires exact raw sample values.");
  const sampling = normalizeLegendSampling({ values: input.sampling.values }, { previous: { count: input.sampling.count } });
  style(input.labels, true); style(input.titleStyle, false);
  return { ...input, sampling };
}
function queries(config, texts) {
  const result = new Map();
  const append = (text, style) => {
    for (const line of text.split(/\r\n|\r|\n/u)) {
      const query = { text: line, fontFamily: style.fontFamily, fontSize: style.fontSize, fontWeight: style.fontWeight, fontStyle: style.fontStyle };
      result.set(textMetricKey(query), query);
    }
  };
  texts.forEach(text => append(text, config.labels));
  if (config.titleVisible) append(config.title, config.titleStyle);
  return [...result.values()];
}
function profileFor(config, texts, source) {
  const measurements = queries(config, texts).map(query => ({ ...query, width: measureTextWidth(query.text, query, source) }));
  if (source?.schemaVersion !== 2) return normalizeTextMetricProfile({ schemaVersion: 1, id: "animation-legend", measurements });
  const fonts = new Map();
  for (const query of measurements) {
    const binding = fontMetricBinding(source, query);
    fonts.set(binding.resource.id, binding);
  }
  return normalizeFontMetricProfile({ schemaVersion: 2, id: "animation-legend", fonts: [...fonts.values()], measurements });
}
function normalizeProfile(profile) {
  ownRecord(profile, "Prepared legend metrics");
  if (!["schemaVersion", "id", "measurements"].every(key => Object.hasOwn(profile, key))) throw new TypeError("Prepared legend metrics require every field.");
  if (profile.schemaVersion === 2 && !Object.hasOwn(profile, "fonts")) throw new TypeError("Prepared legend metrics require font bindings.");
  ownArray(profile.measurements, "Prepared legend measurements");
  let work = 0;
  for (const query of profile.measurements) {
    ownRecord(query, "Prepared legend measurement");
    validateWorkLimit(work += 1 + (typeof query.text === "string" ? query.text.length : 0), "Prepared legend text work");
  }
  return profile.schemaVersion === 2 ? normalizeFontMetricProfile(profile) : normalizeTextMetricProfile(profile);
}
function normalizeLayout(input) {
  if (layouts.has(input)) return layouts.get(input);
  record(input, ["frame", "config", "mapping", "metrics", "stripStrokeWidth"], "Prepared legend layout");
  record(input.frame, ["plot", "canvas"], "Prepared legend frame");
  record(input.frame.plot, ["x", "y", "width", "height"], "Prepared legend plot");
  record(input.frame.canvas, ["width", "height"], "Prepared legend canvas");
  Object.values(input.frame.plot).forEach(value => finite(value));
  Object.values(input.frame.canvas).forEach(value => finite(value, true));
  finite(input.stripStrokeWidth);
  record(input.mapping, ["value", "scale"], "Prepared legend mapping");
  ownRecord(input.mapping.scale, "Prepared legend scale");
  if (!["type", "domain", "range", "clamp"].every(key => Object.hasOwn(input.mapping.scale, key))) throw new TypeError("Prepared legend scale requires its own mapping fields.");
  const config = normalizeConfig(input.config), mapping = normalizeCartesianPosition(input.mapping);
  if (!["linear", "log", "pow", "sqrt", "symlog", "time"].includes(mapping.scale.type) ||
      !same(mapping.scale.range, [0, 1]) || !Object.is(mapping.value, config.sampling.values[0])) {
    throw new TypeError("Prepared legend mapping requires its native first sample and unit range.");
  }
  const metrics = normalizeProfile(input.metrics);
  const result = { ...input, config, mapping, metrics };
  const layout = intrinsic(result);
  const expected = queries(config, layout.texts).map(textMetricKey).sort();
  if (!same(expected, metrics.measurements.map(textMetricKey).sort())) throw new TypeError("Prepared legend metrics must contain the exact required query closure.");
  const normalized = cloneAndFreeze(result);
  layouts.set(normalized, normalized);
  if (isOwned(input)) layouts.set(input, normalized);
  return normalized;
}
function intrinsic(layout) {
  return resolveGradientLayoutValues({ ...layout.frame, config: nativeConfig(layout.config), scale: layout.mapping.scale,
    profile: layout.metrics, stripStrokeWidth: layout.stripStrokeWidth });
}
function textGeometry(text, point, style, metrics, side) {
  const lines = resolveLegendTitleText(text, style, metrics).lines;
  return { x: point.x, y: point.y - (side ? style.fontSize / 2 : 0), text,
    textAlign: point.align, textBaseline: side ? "top" : "middle", ...(lines === undefined ? {} : { lines }) };
}
function geometryList(input) {
  if (geometries.has(input)) return geometries.get(input);
  const { config, frame, metrics, stripStrokeWidth } = input;
  const layout = intrinsic(input), side = ["left", "right"].includes(config.position);
  const entries = Array.from({ length: GRADIENT_STRIP_COUNT }, (_, index) => ({
    component: "legend-strip", sample: ["segment", index, GRADIENT_STRIP_COUNT], type: "rect", properties: gradientStripGeometry(layout, index)
  }));
  layout.ticks.forEach((properties, index) => entries.push({ component: "legend-tick", sample: ["value", layout.values[index]], type: "line", properties }));
  layout.labels.forEach((point, index) => entries.push({ component: "legend-label", sample: ["value", layout.values[index]], type: "text",
    properties: textGeometry(layout.texts[index], point, config.labels, metrics, side) }));
  if (config.titleVisible) entries.push({ component: "legend-title", sample: ["title"], type: "text",
    properties: textGeometry(config.title, layout.title, config.titleStyle, metrics, side) });
  const bounds = unionBounds(entries.map(entry => {
    const p = entry.properties;
    if (entry.type === "text") return resolveTextBounds({ ...p, ...(entry.component === "legend-title" ? config.titleStyle : config.labels) }, metrics);
    const extent = (entry.type === "line" ? 1 : stripStrokeWidth) / 2;
    return entry.type === "line" ? { left: Math.min(p.x1, p.x2) - extent, right: Math.max(p.x1, p.x2) + extent,
      top: Math.min(p.y1, p.y2) - extent, bottom: Math.max(p.y1, p.y2) + extent } :
      { left: p.x - extent, right: p.x + p.width + extent, top: p.y - extent, bottom: p.y + p.height + extent };
  }));
  const move = side ? { dx: 0, ...resolveSingleSideLegendPlacement({ side: config.position, ...frame, bounds }) }
    : resolveSingleHorizontalLegendPlacement({ ...frame, config, bounds });
  const result = entries.map(entry => ({ ...entry, properties: Object.fromEntries(Object.entries(entry.properties).map(([key, value]) =>
    [key, ["x", "x1", "x2"].includes(key) ? value + move.dx : ["y", "y1", "y2"].includes(key) ? value + move.dy : value])) }));
  const frozen = cloneAndFreeze(result);
  if (isOwned(input)) geometries.set(input, frozen);
  return frozen;
}
export function prepareGradientLegendLayout({ config, scale, frame, profile, stripStrokeWidth = 0 }) {
  const font = input => ({ fontFamily: input.fontFamily ?? DEFAULT_FONT_FAMILY, fontSize: input.fontSize,
    fontWeight: textMetricFontWeight(input.fontWeight), fontStyle: input.fontStyle ?? "normal", align: input.align ?? null });
  const canonical = {
    position: config.position, align: config.align, offset: config.offset, title: config.title, titleVisible: config.titleVisible !== false,
    titlePosition: config.titlePosition, gradientDirection: config.gradientDirection ?? null,
    gradient: { length: config.gradient.length, thickness: config.gradient.thickness }, sampling: config.sampling,
    fieldType: config.fieldType, labels: { ...font(config.labels), offset: config.labels.offset, format: config.labels.format ?? "auto" },
    titleStyle: font(config.titleStyle), blockGap: config.blockGap ?? 12, titlePadding: config.titlePadding ?? null
  };
  normalizeConfig(canonical);
  const mapping = cartesianPosition(canonical.sampling.values[0], { ...scale, type: scale.type === "sequential" ? "linear" : scale.type, range: [0, 1] });
  const initial = { frame, config: canonical, mapping, metrics: profile, stripStrokeWidth };
  const texts = intrinsic(initial).texts;
  return normalizeLayout({ ...initial, metrics: profileFor(canonical, texts, profile) });
}
export function normalizeLegendAnimationState(input) {
  record(input, ["identity", "kind", "layout"], "Legend animation state");
  const identity = normalizeGuideIdentity(input.identity);
  if (input.kind !== "legend" || !identity.component.startsWith("legend-")) throw new TypeError("Legend animation requires a native legend identity.");
  const layout = normalizeLayout(input.layout);
  if (!geometryList(layout).some(entry => entry.component === identity.component && same(entry.sample, identity.value[1]))) {
    throw new TypeError("Legend identity does not name a prepared native component.");
  }
  return cloneAndFreeze({ identity, kind: "legend", layout });
}
export function resolveLegendAnimationGeometry(state) {
  const prepared = normalizeLegendAnimationState(state);
  const entry = geometryList(prepared.layout).find(entry => entry.component === prepared.identity.component && same(entry.sample, prepared.identity.value[1]));
  return cloneAndFreeze({ type: entry.type, properties: entry.properties });
}
export function legendAnimationMatchesNode(state, node) {
  const geometry = resolveLegendAnimationGeometry(state);
  return node.type === geometry.type && Object.entries(geometry.properties).every(([key, value]) => same(value, node.properties[key]));
}
export function prepareLegendInterpolation(fromInput, toInput) {
  const from = normalizeLegendAnimationState(fromInput), to = normalizeLegendAnimationState(toInput);
  if (guideAnimationKey(from.identity) !== guideAnimationKey(to.identity)) return fade("guide-policy");
  const { layout: a } = from, { layout: b } = to;
  const policy = layout => ({ ...layout.config, offset: 0, blockGap: 0, titlePadding: layout.config.titlePadding === null ? null : 0,
    gradient: { length: 0, thickness: 0 }, labels: { ...layout.config.labels, offset: 0 } });
  if (!same(policy(a), policy(b)) || !same(a.metrics, b.metrics) || a.stripStrokeWidth !== b.stripStrokeWidth) return fade("guide-layout");
  const position = prepareCartesianPosition(a.mapping, b.mapping);
  if (position.kind === "crossfade") return fade(position.reason);
  return cloneAndFreeze({ kind: "guide", version: ANIMATION_GUIDE_VERSION, from, to });
}
export function sampleLegendInterpolation(plan, progress) {
  validateUnitInterval(progress, "Legend animation progress");
  record(plan, ["kind", "version", "from", "to"], "Prepared legend interpolation");
  if (plan.kind !== "guide" || plan.version !== ANIMATION_GUIDE_VERSION) throw new TypeError("Invalid prepared legend interpolation.");
  const prepared = prepareLegendInterpolation(plan.from, plan.to);
  if (prepared.kind !== "guide") throw new TypeError("Invalid prepared legend interpolation.");
  const a = prepared.from.layout, b = prepared.to.layout;
  const cached = sampledLayouts.get(a)?.get(b);
  if (cached?.progress === progress) {
    const state = normalizeLegendAnimationState({ ...prepared.from, layout: cached.layout });
    return cloneAndFreeze({ kind: "guide", state, ...resolveLegendAnimationGeometry(state) });
  }
  const numbers = (from, to) => Object.fromEntries(Object.keys(from).map(key => [key, interpolateNumber(from[key], to[key], progress)]));
  const mapped = sampleCartesianPosition(prepareCartesianPosition(a.mapping, b.mapping), progress);
  if (mapped.kind === "crossfade") return fade(mapped.reason);
  const state = { ...prepared.from, layout: { ...a, frame: { plot: numbers(a.frame.plot, b.frame.plot), canvas: numbers(a.frame.canvas, b.frame.canvas) },
    mapping: { value: mapped.value, scale: mapped.scale }, config: { ...a.config, gradient: numbers(a.config.gradient, b.config.gradient),
      offset: interpolateNumber(a.config.offset, b.config.offset, progress), blockGap: interpolateNumber(a.config.blockGap, b.config.blockGap, progress),
      titlePadding: a.config.titlePadding === null ? null : interpolateNumber(a.config.titlePadding, b.config.titlePadding, progress),
      labels: { ...a.config.labels, offset: interpolateNumber(a.config.labels.offset, b.config.labels.offset, progress) } } } };
  try {
    const normalized = normalizeLegendAnimationState(state);
    if (!sampledLayouts.has(a)) sampledLayouts.set(a, new WeakMap());
    sampledLayouts.get(a).set(b, { progress, layout: normalized.layout });
    return cloneAndFreeze({ kind: "guide", state: normalized, ...resolveLegendAnimationGeometry(normalized) });
  } catch (error) {
    if (!(error instanceof RangeError) && getErrorDetails(error)?.reason !== "canvas-overflow") throw error;
    return fade("guide-layout");
  }
}
