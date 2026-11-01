import { cloneAndFreeze, isOwned } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateWorkLimit, validateUnitInterval } from "../../core/validation.js";
import { DEFAULT_FONT_FAMILY, textMetricFontWeight, textMetricKey } from "../../core/font.js";
import { getErrorDetails } from "../../core/diagnostics.js";
import { unionBounds, resolveTextBounds } from "../../core/textMetrics.js";
import { encodeValue } from "../../core/valueEncoding.js";
import { normalizeLegendSampling } from "../../grammar/legendSampling.js";
import { normalizeNumericDisplayLabelMap } from "../../grammar/displayLabels.js";
import { normalizeSizeScaleDefinition } from "../../grammar/scales/size.js";
import { cartesianPosition, normalizeCartesianPosition, prepareCartesianPosition, sampleCartesianPosition } from "../../grammar/animation/cartesianPosition.js";
import { interpolateNumber } from "../../grammar/animation/values.js";
import { normalizeGuideIdentity, guideAnimationKey, ANIMATION_GUIDE_VERSION } from "../../grammar/animation/guideState.js";
import { resolveSizeLegendLayoutValues } from "../guides/legendSamples.js";
import { resolveSingleSideLegendPlacement, resolveSingleHorizontalLegendPlacement } from "../../layout/legendLane.js";
import { prepareGuideMetrics, normalizeGuideMetrics } from "./guideMetrics.js";
import { normalizeLegendTextStyle, legendTextQueries, legendTextGeometry } from "./legendState.js";

const same = (a, b) => JSON.stringify(encodeValue(a)) === JSON.stringify(encodeValue(b));
const layouts = new WeakMap(), geometries = new WeakMap(), samples = new WeakMap();
const intrinsicLayouts = new WeakMap(), intrinsicGeometries = new WeakMap(), intrinsicSamples = new WeakMap();
const cornerLayouts = new WeakMap(), cornerGeometries = new WeakMap(), cornerSamples = new WeakMap();
const fade = reason => Object.freeze({ kind: "crossfade", reason });
const configKeys = ["position", "align", "offset", "title", "titleVisible", "titlePosition", "direction", "columns", "itemGap", "rowPadding", "titlePadding", "sampling", "labelMap", "labels", "titleStyle"];
function record(value, keys, label) {
  ownRecord(value, label); rejectUnknownProperties(value, keys, label);
  if (keys.some(key => !Object.hasOwn(value, key))) throw new TypeError(`${label} requires every field.`);
}
function finite(value, positive = false) {
  if (!Number.isFinite(value) || value < 0 || positive && value === 0) throw new RangeError("Size legend dimensions must be finite and nonnegative.");
}
const withoutNull = object => Object.fromEntries(Object.entries(object).filter(([, value]) => value !== null));
function nativeConfig(config, strokeWidth) {
  return { ...withoutNull(config), layout: "edge", border: false,
    labels: withoutNull(config.labels), titleStyle: withoutNull(config.titleStyle), blockSymbol: { strokeWidth } };
}
function normalizeConfig(input) {
  record(input, configKeys, "Prepared size legend config");
  if (!["left", "right", "top", "bottom"].includes(input.position) || !["left", "center", "right"].includes(input.align) ||
      !["top", "left"].includes(input.titlePosition) || !["horizontal", "vertical"].includes(input.direction) ||
      typeof input.title !== "string" || typeof input.titleVisible !== "boolean" ||
      input.columns !== null && (!Number.isSafeInteger(input.columns) || input.columns < 1)) throw new TypeError("Prepared size legend requires native layout policy.");
  validateWorkLimit(input.title.length, "Prepared size legend text work");
  for (const key of ["offset", "itemGap"]) finite(input[key]);
  for (const key of ["rowPadding", "titlePadding"]) if (input[key] !== null) finite(input[key]);
  record(input.sampling, ["mode", "values", "count"], "Prepared size samples"); ownArray(input.sampling.values, "Prepared size samples");
  if (input.sampling.mode !== "values") throw new TypeError("Prepared size legend requires exact values.");
  const sampling = normalizeLegendSampling({ values: input.sampling.values }, { previous: { count: input.sampling.count } });
  ownArray(input.labelMap, "Prepared size label map");
  validateWorkLimit(input.labelMap.length ** 2, "Prepared size label map work");
  let textWork = 0;
  input.labelMap.forEach(entry => { ownRecord(entry, "Prepared size label entry"); validateWorkLimit(textWork += typeof entry.label === "string" ? entry.label.length : 0, "Prepared size label text"); });
  const labelMap = normalizeNumericDisplayLabelMap(input.labelMap);
  normalizeLegendTextStyle(input.labels, true); normalizeLegendTextStyle(input.titleStyle, false);
  return { ...input, sampling, labelMap };
}
function intrinsic(layout, intrinsicMode = false) {
  return resolveSizeLegendLayoutValues({ ...layout.frame, config: { ...nativeConfig(layout.config, layout.symbolStrokeWidth), ...(intrinsicMode ? { groupIntrinsic: true, ...(intrinsicMode === "corner" ? { groupCorner: true } : {}) } : {}) },
    scale: layout.mapping.scale, profile: layout.metrics });
}
function normalizeLayout(input, intrinsicMode = false) {
  const cache = intrinsicMode === "corner" ? cornerLayouts : intrinsicMode ? intrinsicLayouts : layouts;
  if (cache.has(input)) return cache.get(input);
  record(input, ["frame", "config", "mapping", "metrics", "symbolStrokeWidth"], "Prepared size legend layout");
  record(input.frame, ["plot", "canvas"], "Prepared size legend frame");
  record(input.frame.plot, ["x", "y", "width", "height"], "Prepared size legend plot");
  record(input.frame.canvas, ["width", "height"], "Prepared size legend canvas");
  Object.values(input.frame.plot).forEach(value => finite(value)); Object.values(input.frame.canvas).forEach(value => finite(value, true));
  finite(input.symbolStrokeWidth);
  const config = normalizeConfig(input.config);
  record(input.mapping, ["value", "scale"], "Prepared size legend mapping"); ownRecord(input.mapping.scale, "Prepared size scale");
  if (!["type", "domain", "range", "clamp"].every(key => Object.hasOwn(input.mapping.scale, key))) throw new TypeError("Prepared size scale requires exact fields.");
  const mapping = normalizeCartesianPosition(input.mapping);
  if (!["linear", "log", "sqrt", "pow"].includes(mapping.scale.type) || !Object.is(mapping.value, config.sampling.values[0])) throw new TypeError("Prepared size mapping requires its first exact sample.");
  normalizeSizeScaleDefinition({ patch: mapping.scale.range[0] > mapping.scale.range[1]
    ? { ...mapping.scale, range: [...mapping.scale.range].reverse(), reverse: true } : mapping.scale });
  const metrics = normalizeGuideMetrics(input.metrics), result = { ...input, config, mapping, metrics };
  const layout = intrinsic(result, intrinsicMode), expected = legendTextQueries(config, layout.text).map(textMetricKey).sort();
  if (!same(expected, metrics.measurements.map(textMetricKey).sort())) throw new TypeError("Prepared size metrics must contain the exact required query closure.");
  const normalized = cloneAndFreeze(result); cache.set(normalized, normalized);
  if (isOwned(input)) cache.set(input, normalized);
  return normalized;
}
function geometryList(layout, intrinsicMode = false) {
  const cache = intrinsicMode === "corner" ? cornerGeometries : intrinsicMode ? intrinsicGeometries : geometries;
  if (cache.has(layout)) return cache.get(layout);
  const { config, metrics, frame, symbolStrokeWidth } = layout, native = intrinsic(layout, intrinsicMode);
  const side = intrinsicMode || ["left", "right"].includes(config.position);
  const entries = native.values.map((value, index) => ({ component: "legend-symbol", sample: ["value", value], type: "circle",
    properties: { x: native.symbolX[index], y: native.symbolY[index], radius: native.radii[index] } }));
  for (const index of native.labelItemIndices) entries.push({
    component: "legend-label", sample: ["value", native.values[index]], type: "text",
    properties: legendTextGeometry(native.text[index], { x: native.labelX[index], y: native.itemY[index], align: config.labels.align ?? "left" }, config.labels, metrics, side)
  });
  if (config.titleVisible) entries.push({ component: "legend-title", sample: ["title"], type: "text",
    properties: legendTextGeometry(config.title, native.title, config.titleStyle, metrics, side) });
  const bounds = unionBounds(entries.map(entry => {
    const p = entry.properties;
    if (entry.type === "text") return resolveTextBounds({ ...p, ...(entry.component === "legend-title" ? config.titleStyle : config.labels) }, metrics);
    const r = p.radius + symbolStrokeWidth / 2;
    return { left: p.x - r, right: p.x + r, top: p.y - r, bottom: p.y + r };
  }));
  const move = intrinsicMode ? { dx: 0, dy: 0 } : ["left", "right"].includes(config.position)
    ? { dx: 0, ...resolveSingleSideLegendPlacement({ side: config.position, ...frame, bounds }) }
    : resolveSingleHorizontalLegendPlacement({ ...frame, config, bounds });
  const result = cloneAndFreeze(entries.map(entry => ({ ...entry, properties: { ...entry.properties,
    x: entry.properties.x + move.dx, y: entry.properties.y + move.dy } })));
  if (isOwned(layout)) cache.set(layout, result);
  return result;
}
export function prepareSizeLegendLayout({ config, scale, frame, profile, intrinsicMode = false }) {
  const font = input => ({ fontFamily: input.fontFamily ?? DEFAULT_FONT_FAMILY, fontSize: input.fontSize,
    fontWeight: textMetricFontWeight(input.fontWeight), fontStyle: input.fontStyle ?? "normal", align: input.align ?? null });
  const canonical = { position: config.position, align: config.align, offset: config.offset, title: config.title,
    titleVisible: config.titleVisible !== false, titlePosition: config.titlePosition, direction: config.direction,
    columns: config.columns ?? null, itemGap: config.itemGap, rowPadding: config.rowPadding ?? null, titlePadding: config.titlePadding ?? null,
    sampling: config.sampling, labelMap: config.labelMap ?? [], labels: { ...font(config.labels), offset: config.labels.offset, format: config.labels.format ?? "auto" }, titleStyle: font(config.titleStyle) };
  normalizeConfig(canonical);
  const mapping = cartesianPosition(canonical.sampling.values[0], scale);
  const initial = { frame, config: canonical, mapping, metrics: profile, symbolStrokeWidth: config.blockSymbol?.strokeWidth ?? 0 };
  return normalizeLayout({ ...initial, metrics: prepareGuideMetrics(legendTextQueries(canonical, intrinsic(initial, intrinsicMode).text), profile, "animation-size-legend") }, intrinsicMode);
}
export function normalizeSizeLegendAnimationState(input, intrinsicMode = false) {
  record(input, ["identity", "kind", "layout"], "Size legend animation state");
  const identity = normalizeGuideIdentity(input.identity), layout = normalizeLayout(input.layout, intrinsicMode);
  if (input.kind !== "size-legend" || identity.value[0] !== "size" || !geometryList(layout, intrinsicMode).some(entry => entry.component === identity.component && same(entry.sample, identity.value[1]))) throw new TypeError("Size legend identity does not name its native component.");
  return cloneAndFreeze({ identity, kind: "size-legend", layout });
}
export function resolveSizeLegendAnimationGeometry(input, intrinsicMode = false) {
  const state = normalizeSizeLegendAnimationState(input, intrinsicMode), entry = geometryList(state.layout, intrinsicMode).find(item => item.component === state.identity.component && same(item.sample, state.identity.value[1]));
  return cloneAndFreeze({ type: entry.type, properties: entry.properties });
}
export function sizeLegendAnimationMatchesNode(state, node) {
  const geometry = resolveSizeLegendAnimationGeometry(state);
  return node.type === geometry.type && Object.entries(geometry.properties).every(([key, value]) => same(value, node.properties[key]));
}
export function prepareSizeLegendInterpolation(fromInput, toInput, intrinsicMode = false) {
  const from = normalizeSizeLegendAnimationState(fromInput, intrinsicMode), to = normalizeSizeLegendAnimationState(toInput, intrinsicMode);
  if (guideAnimationKey(from.identity) !== guideAnimationKey(to.identity)) return fade("guide-policy");
  const a = from.layout, b = to.layout;
  const policy = layout => ({ ...layout.config, offset: 0, itemGap: 0,
    rowPadding: layout.config.rowPadding === null ? null : 0, titlePadding: layout.config.titlePadding === null ? null : 0,
    labels: { ...layout.config.labels, offset: 0 } });
  if (!same(policy(a), policy(b)) || !same(a.metrics, b.metrics) || a.symbolStrokeWidth !== b.symbolStrokeWidth) return fade("guide-layout");
  const position = prepareCartesianPosition(a.mapping, b.mapping);
  return position.kind === "crossfade" ? fade(position.reason) : cloneAndFreeze({ kind: "guide", version: ANIMATION_GUIDE_VERSION, from, to });
}
export function sampleSizeLegendInterpolation(plan, progress, intrinsicMode = false) {
  const sampleCache = intrinsicMode === "corner" ? cornerSamples : intrinsicMode ? intrinsicSamples : samples;
  validateUnitInterval(progress, "Size legend progress"); record(plan, ["kind", "version", "from", "to"], "Prepared size legend interpolation");
  if (plan.kind !== "guide" || plan.version !== ANIMATION_GUIDE_VERSION) throw new TypeError("Invalid prepared size legend interpolation.");
  const prepared = prepareSizeLegendInterpolation(plan.from, plan.to, intrinsicMode);
  if (prepared.kind !== "guide") throw new TypeError("Invalid prepared size legend interpolation.");
  const a = prepared.from.layout, b = prepared.to.layout, cached = sampleCache.get(a)?.get(b);
  if (cached?.progress === progress) {
    const state = normalizeSizeLegendAnimationState({ ...prepared.from, layout: cached.layout }, intrinsicMode);
    return cloneAndFreeze({ kind: "guide", state, ...resolveSizeLegendAnimationGeometry(state, intrinsicMode) });
  }
  const mapped = sampleCartesianPosition(prepareCartesianPosition(a.mapping, b.mapping), progress);
  if (mapped.kind === "crossfade") return fade(mapped.reason);
  const numbers = (from, to) => Object.fromEntries(Object.keys(from).map(key => [key, from[key] === null ? null : interpolateNumber(from[key], to[key], progress)]));
  const config = { ...a.config, ...numbers(Object.fromEntries(["offset", "itemGap", "rowPadding", "titlePadding"].map(key => [key, a.config[key]])), b.config),
    labels: { ...a.config.labels, offset: interpolateNumber(a.config.labels.offset, b.config.labels.offset, progress) } };
  try {
    const state = normalizeSizeLegendAnimationState({ ...prepared.from, layout: { ...a, config,
      frame: { plot: numbers(a.frame.plot, b.frame.plot), canvas: numbers(a.frame.canvas, b.frame.canvas) }, mapping: { value: mapped.value, scale: mapped.scale } } }, intrinsicMode);
    if (!sampleCache.has(a)) sampleCache.set(a, new WeakMap()); sampleCache.get(a).set(b, { progress, layout: state.layout });
    return cloneAndFreeze({ kind: "guide", state, ...resolveSizeLegendAnimationGeometry(state, intrinsicMode) });
  } catch (error) {
    if (!(error instanceof RangeError) && getErrorDetails(error)?.reason !== "canvas-overflow" && !/exact required query closure/.test(error.message)) throw error;
    return fade("guide-layout");
  }
}

export { normalizeLayout as normalizeSizeLegendLayout, geometryList as resolveSizeLegendEntries };
