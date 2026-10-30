import { cloneAndFreeze, isOwned } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateWorkLimit, validateGeneratedItemLimit, validateUnitInterval } from "../../core/validation.js";
import { DEFAULT_FONT_FAMILY, textMetricFontWeight, textMetricKey } from "../../core/font.js";
import { textBoundsFitCanvas, textBoundsIntersect } from "../../core/textMetrics.js";
import { encodeValue } from "../../core/valueEncoding.js";
import { validateAxisFormat } from "../../grammar/axisFormat.js";
import { normalizeDisplayLabelMap } from "../../grammar/displayLabels.js";
import { cartesianPosition, normalizeCartesianPosition, resolveCartesianPosition, prepareCartesianPosition, sampleCartesianPosition } from "../../grammar/animation/cartesianPosition.js";
import { interpolateNumber } from "../../grammar/animation/values.js";
import { normalizeGuideIdentity, guideAnimationKey, ANIMATION_GUIDE_VERSION } from "../../grammar/animation/guideState.js";
import { prepareAxisLabelLayout, resolvePreparedAxisLabelLayout } from "../axisLabelLayout.js";
import { prepareGuideMetrics, normalizeGuideMetrics } from "./guideMetrics.js";

const same = (a, b) => JSON.stringify(encodeValue(a)) === JSON.stringify(encodeValue(b));
const layouts = new WeakMap(), geometries = new WeakMap(), entries = new WeakMap(), sampledLayouts = new WeakMap();
const entryKey = (value, line) => JSON.stringify(encodeValue([value, line]));
const fade = reason => Object.freeze({ kind: "crossfade", reason });
const keys = ["position", "offset", "alongOffset", "fontFamily", "fontSize", "fontWeight", "rotation", "flush", "flushThreshold", "align", "format", "labelMap", "overlap"];
function record(value, keys, label) {
  ownRecord(value, label); rejectUnknownProperties(value, keys, label);
  if (keys.some(key => !Object.hasOwn(value, key))) throw new TypeError(`${label} requires every field.`);
}
function finite(value, positive = false) {
  if (!Number.isFinite(value) || positive && value <= 0) throw new RangeError("Prepared axis layout requires finite dimensions.");
}
function normalizeConfig(config, channel) {
  record(config, keys, "Prepared axis label policy");
  if (!(channel === "x" ? ["top", "bottom"] : ["left", "right"]).includes(config.position) ||
      typeof config.fontFamily !== "string" || !config.fontFamily.length ||
      !Number.isInteger(config.fontWeight) || config.fontWeight < 100 || config.fontWeight > 900 || config.fontWeight % 100 !== 0 ||
      typeof config.flush !== "boolean" || config.flush && config.rotation !== 0 ||
      ![null, "left", "center", "right"].includes(config.align) || !["error", "allow"].includes(config.overlap)) {
    throw new TypeError("Prepared axis labels require an exact native policy.");
  }
  finite(config.fontSize, true); finite(config.rotation); finite(config.alongOffset); finite(config.offset);
  if (config.offset < 0) throw new RangeError("Prepared axis offset must be nonnegative.");
  if (config.flushThreshold !== null) { finite(config.flushThreshold); if (config.flushThreshold < 0) throw new RangeError("Prepared flush threshold must be nonnegative."); }
  if (config.format !== null && typeof config.format === "object") record(config.format, ["decimals"], "Prepared axis decimal format");
  validateAxisFormat(config.format);
  ownArray(config.labelMap, "Prepared axis label map");
  validateWorkLimit(config.labelMap.length ** 2, "Prepared axis label map work");
  let work = 0;
  for (const item of config.labelMap) {
    ownRecord(item, "Prepared axis label map item");
    validateWorkLimit(work += 1 + (typeof item.label === "string" ? item.label.length : 0), "Prepared axis label text work");
  }
  return { ...config, labelMap: normalizeDisplayLabelMap(config.labelMap) };
}
function nativeInput(layout) {
  const config = Object.fromEntries(Object.entries(layout.config).filter(([, value]) => value !== null));
  const scale = resolveCartesianPosition(layout.mapping).resolvedScale;
  return prepareAxisLabelLayout({ values: layout.values, scale, config, channel: layout.channel,
    bounds: layout.frame, profile: layout.metrics, edgeAligned: layout.edgeAligned });
}
function queries(layout) {
  const { prepared } = nativeInput(layout), style = layout.config;
  return [...new Set(prepared.lines?.flat() ?? prepared.text)].map(text => ({ text, fontFamily: style.fontFamily,
    fontSize: style.fontSize, fontWeight: style.fontWeight, fontStyle: "normal" }));
}
function normalizeLayout(input) {
  if (layouts.has(input)) return layouts.get(input);
  record(input, ["channel", "frame", "canvas", "values", "mapping", "config", "metrics", "edgeAligned"], "Prepared axis label layout");
  if (!["x", "y"].includes(input.channel) || typeof input.edgeAligned !== "boolean") throw new TypeError("Prepared labels require a Cartesian axis.");
  record(input.frame, ["x", "y", "width", "height"], "Prepared axis frame");
  record(input.canvas, ["width", "height"], "Prepared axis canvas");
  Object.values(input.frame).forEach(value => finite(value)); Object.values(input.canvas).forEach(value => finite(value, true));
  if (input.frame.width < 0 || input.frame.height < 0) throw new RangeError("Prepared axis frame dimensions must be nonnegative.");
  ownArray(input.values, "Prepared axis values"); validateGeneratedItemLimit(input.values.length, "Prepared axis value count");
  if (input.values.length === 0 || input.values.some(value => !["string", "boolean"].includes(typeof value) && !Number.isFinite(value))) throw new TypeError("Prepared labels require exact raw values.");
  validateWorkLimit(input.values.reduce((sum, value) => sum + 1 + (typeof value === "string" ? value.length : 0), 0), "Prepared axis values work");
  record(input.mapping, ["value", "scale"], "Prepared axis mapping");
  ownRecord(input.mapping.scale, "Prepared axis scale");
  if (!["type", "domain", "range"].every(key => Object.hasOwn(input.mapping.scale, key))) throw new TypeError("Prepared axis scale requires its own fields.");
  const mapping = normalizeCartesianPosition(input.mapping), config = normalizeConfig(input.config, input.channel);
  if (!Object.is(mapping.value, input.values[0]) || mapping.scale.type === "ordinal-offset") throw new TypeError("Prepared axis mapping requires its native first value.");
  const discrete = ["ordinal", "band", "point"].includes(mapping.scale.type), domain = mapping.scale.domain;
  if (input.values.some(value => discrete ? !domain.includes(value) : typeof value !== "number" || value < Math.min(...domain) || value > Math.max(...domain))) {
    throw new RangeError("Prepared label values must remain inside the native scale domain.");
  }
  const metrics = normalizeGuideMetrics(input.metrics), normalized = cloneAndFreeze({ ...input, mapping, config, metrics });
  if (!same(queries(normalized).map(textMetricKey).sort(), metrics.measurements.map(textMetricKey).sort())) throw new TypeError("Prepared axis metrics require the exact query closure.");
  geometryList(normalized);
  layouts.set(normalized, normalized); if (isOwned(input)) layouts.set(input, normalized);
  return normalized;
}
function geometryList(layout) {
  if (geometries.has(layout)) return geometries.get(layout);
  const native = nativeInput(layout), result = resolvePreparedAxisLabelLayout(native);
  const { resolved, labelBounds, orderedBounds, rotatedOverlap } = result;
  if (!labelBounds.every(bounds => textBoundsFitCanvas(bounds, layout.canvas))) throw new RangeError("Prepared axis labels do not fit the Canvas.");
  if (layout.config.overlap === "error") {
    validateWorkLimit(rotatedOverlap ? orderedBounds.length ** 2 : orderedBounds.length, "Prepared axis collision work");
    if (orderedBounds.some((item, index) => rotatedOverlap ? orderedBounds.slice(0, index).some(previous => textBoundsIntersect(previous, item))
      : index > 0 && textBoundsIntersect(orderedBounds[index - 1], item))) throw new RangeError("Prepared axis labels overlap.");
  }
  const lines = new Map();
  const entries = resolved.text.map((text, index) => {
    const group = resolved.groups[index], line = lines.get(group) ?? 0;
    lines.set(group, line + 1);
    return { value: resolved.values[group], line, type: "text", properties: {
      x: Array.isArray(resolved.x) ? resolved.x[index] : resolved.x, y: Array.isArray(resolved.y) ? resolved.y[index] : resolved.y,
      text, textAlign: resolved.textAlign, textBaseline: resolved.textBaseline,
      ...(layout.config.rotation === 0 ? {} : { rotation: layout.config.rotation })
    } };
  });
  const frozen = cloneAndFreeze(entries); if (isOwned(layout)) geometries.set(layout, frozen);
  return frozen;
}
function findEntry(layout, identity) {
  if (!entries.has(layout)) entries.set(layout, new Map(geometryList(layout).map(entry => [entryKey(entry.value, entry.line), entry])));
  return entries.get(layout).get(entryKey(identity.value, identity.line));
}
export function prepareAxisAnimationLayout({ values, scale, config, channel, frame, canvas, profile, edgeAligned }) {
  const canonical = { position: config.position, offset: config.offset, alongOffset: config.alongOffset ?? 0,
    fontFamily: config.fontFamily ?? DEFAULT_FONT_FAMILY, fontSize: config.fontSize, fontWeight: textMetricFontWeight(config.fontWeight),
    rotation: config.rotation, flush: config.flush ?? false, flushThreshold: config.flushThreshold ?? null,
    align: config.align ?? null, format: config.format, labelMap: config.labelMap ?? [], overlap: config.overlap };
  const initial = { channel, frame, canvas, values, mapping: cartesianPosition(values[0], scale), config: canonical, metrics: profile, edgeAligned };
  return normalizeLayout({ ...initial, metrics: prepareGuideMetrics(queries(initial), profile, "animation-axis") });
}
export function normalizeAxisLabelAnimationState(input) {
  record(input, ["identity", "kind", "layout"], "Axis label animation state");
  const identity = normalizeGuideIdentity(input.identity);
  if (input.kind !== "label-layout" || identity.component !== "labels") throw new TypeError("Axis label layout requires a label identity.");
  const layout = normalizeLayout(input.layout);
  if (findEntry(layout, identity) === undefined) throw new TypeError("Axis label identity does not name a prepared line.");
  return cloneAndFreeze({ identity, kind: "label-layout", layout });
}
export function resolveAxisLabelAnimationGeometry(input) {
  const state = normalizeAxisLabelAnimationState(input);
  const entry = findEntry(state.layout, state.identity);
  return cloneAndFreeze({ type: entry.type, properties: entry.properties });
}
export function axisLabelAnimationMatchesNode(state, node) {
  const geometry = resolveAxisLabelAnimationGeometry(state);
  return node.type === geometry.type && Object.entries(geometry.properties).every(([key, value]) => same(value, node.properties[key])) &&
    (node.properties.rotation ?? 0) === state.layout.config.rotation;
}
export function prepareAxisLabelInterpolation(fromInput, toInput) {
  const from = normalizeAxisLabelAnimationState(fromInput), to = normalizeAxisLabelAnimationState(toInput);
  if (guideAnimationKey(from.identity) !== guideAnimationKey(to.identity)) return fade("guide-policy");
  const a = from.layout, b = to.layout;
  const policy = layout => ({ channel: layout.channel, edgeAligned: layout.edgeAligned, values: layout.values,
    config: { ...layout.config, offset: 0, alongOffset: 0 }, metrics: layout.metrics });
  if (!same(policy(a), policy(b))) return fade("guide-layout");
  const position = prepareCartesianPosition(a.mapping, b.mapping);
  if (position.kind === "crossfade") return fade(position.reason);
  return cloneAndFreeze({ kind: "guide", version: ANIMATION_GUIDE_VERSION, from, to });
}
export function sampleAxisLabelInterpolation(plan, progress) {
  validateUnitInterval(progress, "Axis label animation progress");
  record(plan, ["kind", "version", "from", "to"], "Prepared axis label interpolation");
  if (plan.kind !== "guide" || plan.version !== ANIMATION_GUIDE_VERSION) throw new TypeError("Invalid prepared axis label interpolation.");
  const prepared = prepareAxisLabelInterpolation(plan.from, plan.to);
  if (prepared.kind !== "guide") throw new TypeError("Invalid prepared axis label interpolation.");
  const a = prepared.from.layout, b = prepared.to.layout, cached = sampledLayouts.get(a)?.get(b);
  if (cached?.progress === progress) {
    const state = normalizeAxisLabelAnimationState({ ...prepared.from, layout: cached.layout });
    return cloneAndFreeze({ kind: "guide", state, ...resolveAxisLabelAnimationGeometry(state) });
  }
  const mapped = sampleCartesianPosition(prepareCartesianPosition(a.mapping, b.mapping), progress);
  if (mapped.kind === "crossfade") return fade(mapped.reason);
  const numbers = (x, y) => Object.fromEntries(Object.keys(x).map(key => [key, interpolateNumber(x[key], y[key], progress)]));
  try {
    const state = normalizeAxisLabelAnimationState({ ...prepared.from, layout: { ...a, mapping: { value: mapped.value, scale: mapped.scale },
      frame: numbers(a.frame, b.frame), canvas: numbers(a.canvas, b.canvas), config: { ...a.config,
        offset: interpolateNumber(a.config.offset, b.config.offset, progress), alongOffset: interpolateNumber(a.config.alongOffset, b.config.alongOffset, progress) } } });
    if (!sampledLayouts.has(a)) sampledLayouts.set(a, new WeakMap());
    sampledLayouts.get(a).set(b, { progress, layout: state.layout });
    return cloneAndFreeze({ kind: "guide", state, ...resolveAxisLabelAnimationGeometry(state) });
  } catch (error) {
    if (!(error instanceof RangeError) && !/cannot flush inside the scale span|exact query closure/u.test(error.message)) throw error;
    return fade("guide-layout");
  }
}
