import { cloneAndFreeze, isOwned } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateWorkLimit, validateUnitInterval } from "../../core/validation.js";
import { DEFAULT_FONT_FAMILY, textMetricFontWeight, textMetricKey } from "../../core/font.js";
import { getErrorDetails } from "../../core/diagnostics.js";
import { resolveTextBounds, unionBounds } from "../../core/textMetrics.js";
import { encodeValue } from "../../core/valueEncoding.js";
import { normalizeDisplayLabelMap } from "../../grammar/displayLabels.js";
import { normalizeRecipe } from "../../grammar/legendSymbolRecipe.js";
import { validateLegendTitleAlignment } from "../../grammar/legendTitleStyle.js";
import { createPointShapeGraphic } from "../../grammar/pointShapes.js";
import { materializeRectItem } from "../../grammar/roundedRect.js";
import { translatedProperties } from "../graphicTranslation.js";
import { resolvePrimitiveOccupiedBounds } from "../../grammar/schemas/graphicBounds.js";
import { interpolateNumber } from "../../grammar/animation/values.js";
import { normalizeGuideIdentity, guideAnimationKey, ANIMATION_GUIDE_VERSION } from "../../grammar/animation/guideState.js";
import { resolveCategoricalLegendLayoutValues, symbolWidth } from "../guides/categoricalLegend.js";
import { categoricalLegendLabels } from "../guides/legendConfig.js";
import { resolveSingleSideLegendPlacement, resolveSingleHorizontalLegendPlacement } from "../../layout/legendLane.js";
import { prepareGuideMetrics, normalizeGuideMetrics } from "./guideMetrics.js";
import { normalizeLegendTextStyle, legendTextQueries, legendTextGeometry } from "./legendState.js";

const same = (a, b) => JSON.stringify(encodeValue(a)) === JSON.stringify(encodeValue(b));
const layouts = new WeakMap(), geometries = new WeakMap(), samples = new WeakMap();
const fade = reason => Object.freeze({ kind: "crossfade", reason });
const configKeys = ["kind", "domain", "channels", "position", "align", "offset", "title", "titleVisible", "titlePosition", "direction", "columns", "itemGap", "rowPadding", "titlePadding", "labelMap", "labels", "titleStyle", "symbol"];
const numericSymbol = type => type === "line" ? ["length", "lineWidth"] : type === "point" ? ["size", "strokeWidth"] : ["width", "height", "strokeWidth"];
function record(value, keys, label) {
  ownRecord(value, label); rejectUnknownProperties(value, keys, label);
  if (keys.some(key => !Object.hasOwn(value, key))) throw new TypeError(`${label} requires every field.`);
}
function finite(value, positive = false) {
  if (!Number.isFinite(value) || value < 0 || positive && value === 0) throw new RangeError("Categorical legend dimensions must be finite and nonnegative.");
}
const withoutNull = value => Object.fromEntries(Object.entries(value).filter(([, item]) => item !== null));
const nativeConfig = config => ({ ...withoutNull(config), layout: "edge", border: false,
  labels: withoutNull(config.labels), titleStyle: withoutNull(config.titleStyle) });
function normalizeConfig(input) {
  record(input, configKeys, "Prepared categorical legend config");
  ownArray(input.domain, "Prepared legend domain"); ownArray(input.channels, "Prepared legend channels");
  validateWorkLimit(input.domain.length ** 2, "Prepared categorical legend work");
  if (!input.domain.length || !["series", "color", "stroke"].includes(input.kind) || !input.channels.length ||
      new Set(input.channels).size !== input.channels.length || input.channels.some(value => !["color", "stroke", "strokeDash", "shape"].includes(value)) ||
      !["left", "right", "top", "bottom"].includes(input.position) || !["left", "center", "right"].includes(input.align) ||
      !["top", "left"].includes(input.titlePosition) || !["horizontal", "vertical"].includes(input.direction) ||
      typeof input.title !== "string" || typeof input.titleVisible !== "boolean" ||
      input.columns !== null && (!Number.isSafeInteger(input.columns) || input.columns < 1)) throw new TypeError("Prepared categorical legend requires native layout policy.");
  normalizeDisplayLabelMap(input.domain.map(value => ({ value, label: "" })), "Prepared legend domain");
  validateWorkLimit(input.title.length + input.domain.reduce((n, value) => n + (typeof value === "string" ? value.length : 0), 0), "Prepared legend text work");
  finite(input.offset); finite(input.itemGap, true);
  for (const key of ["rowPadding", "titlePadding"]) if (input[key] !== null) finite(input[key]);
  ownArray(input.labelMap, "Prepared categorical label map");
  validateWorkLimit(input.labelMap.length ** 2, "Prepared categorical label map work");
  let textWork = 0;
  input.labelMap.forEach(entry => { ownRecord(entry, "Prepared categorical label entry"); validateWorkLimit(textWork += typeof entry.label === "string" ? entry.label.length : 0, "Prepared legend label text"); });
  const labelMap = normalizeDisplayLabelMap(input.labelMap);
  normalizeLegendTextStyle(input.labels, true); normalizeLegendTextStyle(input.titleStyle, false);
  validateLegendTitleAlignment(withoutNull(input.titleStyle), input.titlePosition);
  if (["left", "right"].includes(input.position) && (input.align !== "center" || input.direction !== "vertical" || input.titlePosition !== "top")) {
    throw new TypeError("Prepared side legends require native centered vertical layout and a top title.");
  }
  record(input.symbol, ["layers"], "Prepared categorical symbol"); ownArray(input.symbol.layers, "Prepared categorical symbol layers");
  for (const layer of input.symbol.layers) {
    ownRecord(layer, "Prepared categorical symbol layer");
    if (layer.outline !== undefined || layer.shadow !== undefined) throw new TypeError("Prepared categorical symbols require an effect-free native recipe.");
    if (layer.strokeDash !== undefined) ownArray(layer.strokeDash, "Prepared categorical stroke dash");
  }
  const symbol = normalizeRecipe(input.symbol, input.kind, { internal: true });
  return { ...input, labelMap, symbol };
}
function normalizeAppearance(input, length) {
  record(input, ["colors", "strokes", "dashes", "shapes"], "Prepared categorical appearance");
  for (const key of ["colors", "strokes", "dashes", "shapes"]) {
    ownArray(input[key], `Prepared categorical ${key}`);
    if (input[key].length !== length) throw new TypeError("Prepared categorical appearance must match its exact domain.");
  }
  if ([...input.colors, ...input.strokes].some(value => typeof value !== "string" || !value.length)) throw new TypeError("Prepared categorical paint must be a native string.");
  let work = input.colors.reduce((n, value) => n + value.length, 0) + input.strokes.reduce((n, value) => n + value.length, 0);
  validateWorkLimit(work, "Prepared categorical appearance work");
  input.dashes.forEach(value => { ownArray(value, "Prepared categorical dash"); validateWorkLimit(work += value.length, "Prepared categorical appearance work"); value.forEach(item => finite(item)); });
  input.shapes.forEach(shape => {
    if (shape !== null && typeof shape === "object") {
      ownRecord(shape, "Prepared categorical point shape");
      ownArray(shape.polygon, "Prepared categorical point polygon");
      validateWorkLimit(work += shape.polygon.length ** 2, "Prepared categorical appearance work");
      shape.polygon.forEach(point => ownRecord(point, "Prepared categorical polygon vertex"));
    }
    createPointShapeGraphic({ shape, x: 0, y: 0, area: 1, fill: "black" });
  });
  return input;
}
function intrinsic(layout) {
  return resolveCategoricalLegendLayoutValues({ ...layout.frame, config: nativeConfig(layout.config), appearance: layout.appearance, profile: layout.metrics });
}
function normalizeLayout(input) {
  if (layouts.has(input)) return layouts.get(input);
  record(input, ["frame", "config", "appearance", "metrics"], "Prepared categorical legend layout");
  record(input.frame, ["plot", "canvas"], "Prepared categorical legend frame");
  record(input.frame.plot, ["x", "y", "width", "height"], "Prepared categorical legend plot");
  record(input.frame.canvas, ["width", "height"], "Prepared categorical legend canvas");
  Object.values(input.frame.plot).forEach(value => finite(value)); Object.values(input.frame.canvas).forEach(value => finite(value, true));
  const config = normalizeConfig(input.config), appearance = normalizeAppearance(input.appearance, config.domain.length), metrics = normalizeGuideMetrics(input.metrics);
  const result = { ...input, config, appearance, metrics };
  const expected = legendTextQueries(config, categoricalLegendLabels(config)).map(textMetricKey).sort();
  if (!same(expected, metrics.measurements.map(textMetricKey).sort())) throw new TypeError("Prepared categorical metrics require the exact native query closure.");
  intrinsic(result);
  const normalized = cloneAndFreeze(result); layouts.set(normalized, normalized); if (isOwned(input)) layouts.set(input, normalized);
  return normalized;
}
function geometryList(layout) {
  if (geometries.has(layout)) return geometries.get(layout);
  const { config, appearance, metrics, frame } = layout, native = intrinsic(layout), width = symbolWidth(config), entries = [], side = ["left", "right"].includes(config.position);
  config.domain.forEach((value, index) => {
    for (const layer of config.symbol.layers) {
      const x = native.symbolX[index], y = native.itemY[index]; let item;
      if (layer.type === "line") item = { type: "line", properties: { x1: x + (width - layer.length) / 2, x2: x + (width + layer.length) / 2, y1: y, y2: y } };
      else if (layer.type === "point") item = config.channels.includes("shape")
        ? createPointShapeGraphic({ shape: appearance.shapes[index], x: x + width / 2, y, area: Math.PI * layer.size ** 2, fill: "black" })
        : { type: "circle", properties: { x: x + width / 2, y, radius: layer.size } };
      else item = materializeRectItem({ x: x + (width - layer.width) / 2, y: y - layer.height / 2, width: layer.width, height: layer.height }, layer);
      const properties = Object.fromEntries(Object.entries(item.properties).filter(([key]) => ["x", "y", "x1", "x2", "y1", "y2", "radius", "width", "height", "commands"].includes(key)));
      const stroke = layer.type === "line" ? layer.stroke ?? (config.channels.includes("stroke") ? appearance.strokes[index] : appearance.colors[index])
        : config.channels.includes("stroke") ? appearance.strokes[index] : layer.stroke;
      entries.push({ component: "legend-symbol", sample: ["value", value, layer.type], type: item.type, properties, layer: { ...layer, stroke } });
    }
  });
  categoricalLegendLabels(config).forEach((text, index) => { if (text !== "") entries.push({ component: "legend-label", sample: ["value", config.domain[index]], type: "text",
    properties: legendTextGeometry(text, { x: native.labelX[index], y: native.itemY[index], align: config.labels.align ?? "left" }, config.labels, metrics, side) }); });
  if (config.titleVisible) entries.push({ component: "legend-title", sample: ["title"], type: "text", properties: legendTextGeometry(config.title, native.title, config.titleStyle, metrics, side) });
  const bounds = unionBounds(entries.map(entry => entry.type === "text"
    ? resolveTextBounds({ ...entry.properties, ...(entry.component === "legend-title" ? config.titleStyle : config.labels) }, metrics)
    : resolvePrimitiveOccupiedBounds(entry.type, { ...entry.layer, ...entry.properties, strokeWidth: entry.layer.lineWidth ?? entry.layer.strokeWidth })));
  const move = ["left", "right"].includes(config.position)
    ? { dx: 0, ...resolveSingleSideLegendPlacement({ side: config.position, ...frame, bounds }) }
    : resolveSingleHorizontalLegendPlacement({ ...frame, config, bounds });
  const result = cloneAndFreeze(entries.map(({ layer, ...entry }) => ({ ...entry,
    properties: translatedProperties(entry.type, entry.properties, move.dx, move.dy) })));
  if (isOwned(layout)) geometries.set(layout, result); return result;
}
export function prepareCategoricalLegendLayout({ config, appearance, frame, profile }) {
  const font = input => ({ fontFamily: input.fontFamily ?? DEFAULT_FONT_FAMILY, fontSize: input.fontSize, fontWeight: textMetricFontWeight(input.fontWeight), fontStyle: input.fontStyle ?? "normal", align: input.align ?? null });
  const canonical = { kind: config.kind, domain: config.domain, channels: config.channels, position: config.position, align: config.align,
    offset: config.offset, title: config.title, titleVisible: config.titleVisible !== false, titlePosition: config.titlePosition, direction: config.direction,
    columns: config.columns ?? null, itemGap: config.itemGap, rowPadding: config.rowPadding ?? null, titlePadding: config.titlePadding ?? null,
    labelMap: [...(config.labelMap ?? []), ...(config.defaultLabelMap ?? []).filter(entry => !(config.labelMap ?? []).some(item => item.value === entry.value))],
    labels: { ...font(config.labels), offset: config.labels.offset, format: "auto" }, titleStyle: font(config.titleStyle), symbol: config.symbol };
  normalizeConfig(canonical);
  return normalizeLayout({ frame, config: canonical, appearance: Object.fromEntries(["colors", "strokes", "dashes", "shapes"].map(key => [key, appearance[key]])),
    metrics: prepareGuideMetrics(legendTextQueries(canonical, categoricalLegendLabels(canonical)), profile, "animation-categorical-legend") });
}
export function normalizeCategoricalLegendAnimationState(input) {
  record(input, ["identity", "kind", "layout"], "Categorical legend animation state");
  const identity = normalizeGuideIdentity(input.identity), layout = normalizeLayout(input.layout);
  if (input.kind !== "categorical-legend" || identity.value[0] !== layout.config.kind || !geometryList(layout).some(entry => entry.component === identity.component && same(entry.sample, identity.value[1]))) throw new TypeError("Categorical identity does not name its native component.");
  return cloneAndFreeze({ identity, kind: "categorical-legend", layout });
}
export function resolveCategoricalLegendAnimationGeometry(input) {
  const state = normalizeCategoricalLegendAnimationState(input), entry = geometryList(state.layout).find(item => item.component === state.identity.component && same(item.sample, state.identity.value[1]));
  return cloneAndFreeze({ type: entry.type, properties: entry.properties });
}
export function categoricalLegendAnimationMatchesNode(state, node) {
  const geometry = resolveCategoricalLegendAnimationGeometry(state);
  return node.type === geometry.type && Object.entries(geometry.properties).every(([key, value]) => same(value, node.properties[key]));
}
export function prepareCategoricalLegendInterpolation(fromInput, toInput) {
  const from = normalizeCategoricalLegendAnimationState(fromInput), to = normalizeCategoricalLegendAnimationState(toInput);
  if (guideAnimationKey(from.identity) !== guideAnimationKey(to.identity)) return fade("guide-policy");
  const a = from.layout, b = to.layout;
  const policy = layout => ({ config: { ...layout.config, offset: 0, itemGap: 0, rowPadding: layout.config.rowPadding === null ? null : 0,
    titlePadding: layout.config.titlePadding === null ? null : 0, labels: { ...layout.config.labels, offset: 0 },
    symbol: { layers: layout.config.symbol.layers.map(layer => Object.fromEntries(Object.entries(layer).filter(([key]) => !["fill", "stroke", "opacity"].includes(key)).map(([key, value]) => [key, numericSymbol(layer.type).includes(key) ? 0 : value]))) } }, shapes: layout.appearance.shapes });
  if (!same(policy(a), policy(b)) || !same(a.metrics, b.metrics)) return fade("guide-layout");
  return cloneAndFreeze({ kind: "guide", version: ANIMATION_GUIDE_VERSION, from, to });
}
export function sampleCategoricalLegendInterpolation(plan, progress) {
  validateUnitInterval(progress, "Categorical legend progress"); record(plan, ["kind", "version", "from", "to"], "Prepared categorical legend interpolation");
  if (plan.kind !== "guide" || plan.version !== ANIMATION_GUIDE_VERSION) throw new TypeError("Invalid prepared categorical legend interpolation.");
  const prepared = prepareCategoricalLegendInterpolation(plan.from, plan.to);
  if (prepared.kind !== "guide") throw new TypeError("Invalid prepared categorical legend interpolation.");
  const a = prepared.from.layout, b = prepared.to.layout, cached = samples.get(a)?.get(b);
  if (cached?.progress === progress) {
    const state = normalizeCategoricalLegendAnimationState({ ...prepared.from, layout: cached.layout });
    return cloneAndFreeze({ kind: "guide", state, ...resolveCategoricalLegendAnimationGeometry(state) });
  }
  const numbers = (from, to) => Object.fromEntries(Object.keys(from).map(key => [key, from[key] === null ? null : interpolateNumber(from[key], to[key], progress)]));
  const config = { ...a.config, ...numbers(Object.fromEntries(["offset", "itemGap", "rowPadding", "titlePadding"].map(key => [key, a.config[key]])), b.config),
    labels: { ...a.config.labels, offset: interpolateNumber(a.config.labels.offset, b.config.labels.offset, progress) },
    symbol: { layers: a.config.symbol.layers.map((layer, i) => ({ ...layer, ...Object.fromEntries(numericSymbol(layer.type).map(key => [key, interpolateNumber(layer[key], b.config.symbol.layers[i][key], progress)])) })) } };
  try {
    const state = normalizeCategoricalLegendAnimationState({ ...prepared.from, layout: { ...a, config, frame: { plot: numbers(a.frame.plot, b.frame.plot), canvas: numbers(a.frame.canvas, b.frame.canvas) } } });
    if (!samples.has(a)) samples.set(a, new WeakMap()); samples.get(a).set(b, { progress, layout: state.layout });
    return cloneAndFreeze({ kind: "guide", state, ...resolveCategoricalLegendAnimationGeometry(state) });
  } catch (error) {
    if (!(error instanceof RangeError) && getErrorDetails(error)?.reason !== "canvas-overflow") throw error;
    return fade("guide-layout");
  }
}
