import { validateAnimationOwnerKey, guideAnimationOwnerKey } from "../../grammar/animation/ownerKey.js";
import { cloneAndFreeze, isOwned } from "../../core/immutable.js";
import { ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateUnitInterval, validateWorkLimit } from "../../core/validation.js";
import { DEFAULT_FONT_FAMILY, textMetricFontWeight, textMetricKey } from "../../core/font.js";
import { textBoundsFitCanvas, textBoundsIntersect } from "../../core/textMetrics.js";
import { encodeValue } from "../../core/valueEncoding.js";
import { axisTitleTextLines } from "../../grammar/axisTextPlacement.js";
import { resolveAxisTitleAlong } from "../../grammar/axisGeometry.js";
import { normalizeGuideAnchor, resolveGuideAnchor, prepareGuideAnchor, sampleGuideAnchor } from "../../grammar/animation/guideAnchors.js";
import { resolveCartesianPosition } from "../../grammar/animation/cartesianPosition.js";
import { guideAnimationKey, normalizeGuideIdentity, ANIMATION_GUIDE_VERSION } from "../../grammar/animation/guideState.js";
import { interpolateNumber } from "../../grammar/animation/values.js";
import { axisTitleBounds, resolveInferredAxisTitleOffset, resolveLabelRelativeAxisTitleOffset } from "../guides/axisTitleLayout.js";
import { normalizeAxisAnimationLayout, resolveAxisAnimationLabelBounds, axisAnimationLabelEntries, normalizeAxisLabelAnimationState, prepareAxisAnimationLayoutPair, sampleAxisAnimationLayout } from "./axisLabelState.js";
import { normalizeGuideMetrics, prepareGuideMetrics } from "./guideMetrics.js";

const same = (a, b) => JSON.stringify(encodeValue(a)) === JSON.stringify(encodeValue(b));
const layouts = new WeakMap(), geometries = new WeakMap();
const fade = reason => Object.freeze({ kind: "crossfade", reason });
function record(value, keys, label) {
  ownRecord(value, label); rejectUnknownProperties(value, keys, label);
  if (keys.some(key => !Object.hasOwn(value, key))) throw new TypeError(`${label} requires every field.`);
}
function finite(value, positive = false) {
  if (!Number.isFinite(value) || positive && value <= 0) throw new RangeError("Prepared title layout requires finite dimensions.");
}
function anchorOf(layout) { return { ...layout.anchor, frame: layout.frame }; }
function labelsOf(layout) {
  return layout.labels === null || Object.hasOwn(layout.labels, "group") ? null : normalizeAxisAnimationLayout({ ...layout.labels, frame: layout.frame, canvas: layout.canvas });
}
function configOf(layout) {
  const anchor = layout.anchor;
  return { ...layout.style, position: anchor.policy.side, align: anchor.policy.align ?? undefined,
    baseline: anchor.policy.baseline, at: anchor.anchor.kind === "range" ? anchor.anchor.at : anchor.anchor.mapping.value,
    alongOffset: anchor.anchor.alongOffset,
    ...(layout.clearance.kind === "labels" ? { offset: { from: "labels", gap: layout.clearance.gap } } : layout.clearance.kind === "fixed" ? { offset: layout.clearance.offset } : {}) };
}
function queries(layout) {
  const config = configOf(layout), lines = axisTitleTextLines(layout.text, config);
  return [...new Set(lines?.map(line => line.text) ?? [layout.text])].map(text => ({ text,
    fontFamily: config.fontFamily, fontSize: config.fontSize, fontWeight: config.fontWeight, fontStyle: "normal" }));
}
function normalizeLayout(input) {
  if (layouts.has(input)) return layouts.get(input);
  record(input, ["frame", "canvas", "anchor", "text", "style", "metrics", "labels", "clearance"], "Prepared dependent title layout");
  ownRecord(input.anchor, "Prepared dependent title anchor");
  if (Object.hasOwn(input.anchor, "frame")) throw new TypeError("Dependent title layout owns its frame once.");
  const fullAnchor = normalizeGuideAnchor(anchorOf(input));
  if (fullAnchor.kind !== "title" || !["x", "y"].includes(fullAnchor.channel) || fullAnchor.policy.offset !== 0) throw new TypeError("Dependent title requires a Cartesian zero-clearance anchor.");
  record(input.canvas, ["width", "height"], "Prepared title canvas");
  Object.values(input.canvas).forEach(value => finite(value, true));
  if (typeof input.text !== "string" || input.text.length === 0) throw new TypeError("Prepared title requires nonempty native text.");
  validateWorkLimit(input.text.length, "Prepared title text work");
  record(input.style, ["fontFamily", "fontSize", "fontWeight", "rotation", "overlap"], "Prepared title style");
  const style = input.style;
  if (typeof style.fontFamily !== "string" || !style.fontFamily.length || !Number.isInteger(style.fontWeight) ||
      style.fontWeight < 100 || style.fontWeight > 900 || style.fontWeight % 100 !== 0 || !["error", "allow"].includes(style.overlap)) throw new TypeError("Prepared title requires an exact native text style.");
  finite(style.fontSize, true); finite(style.rotation);
  ownRecord(input.clearance, "Prepared title clearance");
  if (input.clearance.kind === "inferred") {
    record(input.clearance, ["kind", "preferred", "unclamped"], "Prepared inferred title clearance");
    finite(input.clearance.preferred);
    if (typeof input.clearance.unclamped !== "boolean") throw new TypeError("Prepared title requires its native clamp policy.");
  } else if (input.clearance.kind === "fixed") {
    record(input.clearance, ["kind", "offset"], "Prepared fixed title clearance"); finite(input.clearance.offset);
    if (input.labels !== null) throw new TypeError("Fixed title offset has no label dependency.");
  } else {
    record(input.clearance, ["kind", "gap"], "Prepared label-relative title clearance");
    finite(input.clearance.gap);
    if (input.clearance.kind !== "labels" || input.clearance.gap < 0) throw new TypeError("Prepared title requires a nonnegative label gap.");
  }
  if (input.labels !== null) {
    ownRecord(input.labels, "Prepared title label dependency");
    if (Object.hasOwn(input.labels, "frame") || Object.hasOwn(input.labels, "canvas")) throw new TypeError("Dependent title layout owns its frame once.");
  }
  const group = input.labels !== null && Object.hasOwn(input.labels, "group") ? input.labels.group : undefined;
  if (group !== undefined) { record(input.labels, ["group"], "Title label group reference"); validateAnimationOwnerKey(group); }
  const labels = labelsOf(input);
  if (labels !== null && labels.channel !== fullAnchor.channel) throw new TypeError("Title and label dependency must share their native axis channel.");
  if (labels === null && group === undefined && input.clearance.kind === "labels") throw new TypeError("Label-relative title requires its label dependency.");
  const metrics = normalizeGuideMetrics(input.metrics), { frame, ...anchor } = fullAnchor;
  const normalized = cloneAndFreeze({ ...input, frame, anchor, metrics,
    labels: group !== undefined ? { group } : labels === null ? null : (({ frame: ignored, canvas: ignoredCanvas, ...value }) => value)(labels) });
  if (!same(queries(normalized).map(textMetricKey).sort(), metrics.measurements.map(textMetricKey).sort())) throw new TypeError("Prepared title metrics require the exact query closure.");
  if (group === undefined) geometry(normalized);
  layouts.set(normalized, normalized); if (isOwned(input)) layouts.set(input, normalized);
  return normalized;
}
function geometry(layout, currentLabels) {
  const dynamic = layout.labels?.group !== undefined;
  if (dynamic && currentLabels === undefined) throw new TypeError("Dependent title requires its current native label group.");
  if (!dynamic && geometries.has(layout)) return geometries.get(layout);
  const config = configOf(layout), anchor = anchorOf(layout), labels = labelsOf(layout);
  const ink = dynamic ? currentLabels : labels === null ? { labelBounds: [], requiredBounds: null } : resolveAxisAnimationLabelBounds(labels);
  const scale = anchor.anchor.kind === "range" ? { range: anchor.anchor.range } : resolveCartesianPosition(anchor.anchor.mapping).resolvedScale;
  const input = { channel: anchor.channel, config, text: layout.text, profile: layout.metrics, frame: layout.frame,
    canvas: layout.canvas, scale, labels: ink.requiredBounds, labelBounds: ink.labelBounds,
    along: resolveAxisTitleAlong(scale, config), labelPosition: dynamic ? anchor.policy.side : labels?.config.position };
  const offset = layout.clearance.kind === "fixed" ? layout.clearance.offset : layout.clearance.kind === "inferred" ? resolveInferredAxisTitleOffset({ ...input,
    preferred: layout.clearance.preferred, unclamped: layout.clearance.unclamped }) : resolveLabelRelativeAxisTitleOffset(input);
  const resolved = resolveGuideAnchor({ ...anchor, policy: { ...anchor.policy, offset } });
  const bounds = axisTitleBounds(resolved.properties, config, layout.text, layout.metrics);
  if (!textBoundsFitCanvas(bounds, layout.canvas)) throw new RangeError("Prepared dependent title does not fit its Canvas.");
  if (config.overlap !== "allow" && ink.labelBounds.some(label => textBoundsIntersect(bounds, label))) throw new RangeError("Prepared dependent title overlaps its native labels.");
  const lines = axisTitleTextLines(layout.text, config);
  const result = cloneAndFreeze({ type: "text", properties: { ...resolved.properties, text: layout.text,
    ...(layout.style.rotation === 0 ? {} : { rotation: layout.style.rotation }), ...(lines === undefined ? {} : { lines }) } });
  if (!dynamic && isOwned(layout)) geometries.set(layout, result); return result;
}
export function prepareAxisTitleAnimationLayout({ anchor, canvas, config, text, profile, labels = null, preferred, unclamped = false }) {
  const { frame, ...value } = anchor;
  if (labels !== null && !Object.hasOwn(labels, "group") && (!same(labels.frame, frame) || !same(labels.canvas, canvas))) throw new TypeError("Title and labels must share their native frame.");
  const layout = { frame, canvas, anchor: value, text,
    style: { fontFamily: config.fontFamily ?? DEFAULT_FONT_FAMILY, fontSize: config.fontSize,
      fontWeight: textMetricFontWeight(config.fontWeight), rotation: config.rotation, overlap: config.overlap ?? "error" },
    labels: labels === null ? null : (({ frame: ignored, canvas: ignoredCanvas, ...value }) => value)(labels),
    clearance: config.inferredOffset === true ? { kind: "inferred", preferred, unclamped } : typeof config.offset === "number" ? { kind: "fixed", offset: config.offset } : { kind: "labels", gap: config.offset.gap }, metrics: profile };
  return normalizeLayout({ ...layout, metrics: prepareGuideMetrics(queries(layout), profile, "animation-title") });
}
export function normalizeAxisTitleAnimationState(input) {
  record(input, ["identity", "kind", "layout"], "Dependent title animation state");
  const identity = normalizeGuideIdentity(input.identity);
  if (input.kind !== "title-layout" || identity.component !== "title" || identity.line !== 0 || identity.value !== null) throw new TypeError("Dependent title requires its native title identity.");
  const layout = normalizeLayout(input.layout);
  if (layout.labels?.group !== undefined && layout.labels.group !== guideAnimationOwnerKey(identity)) throw new TypeError("Title labels must name its exact native axis owner.");
  return cloneAndFreeze({ identity, kind: "title-layout", layout });
}
export function resolveAxisTitleAnimationGeometry(input, currentLabels) { return geometry(normalizeAxisTitleAnimationState(input).layout, currentLabels); }
export function axisTitleAnimationMatchesNode(input, node, currentLabels) {
  const state = normalizeAxisTitleAnimationState(input), output = geometry(state.layout, currentLabels), style = state.layout.style;
  return node.type === output.type && Object.entries(output.properties).every(([key, value]) => same(value, node.properties[key])) &&
    (node.properties.rotation ?? 0) === style.rotation && (node.properties.fontStyle ?? "normal") === "normal" && (node.properties.fontFamily ?? DEFAULT_FONT_FAMILY) === style.fontFamily &&
    node.properties.fontSize === style.fontSize && textMetricFontWeight(node.properties.fontWeight) === style.fontWeight &&
    (Object.hasOwn(output.properties, "lines") || !Object.hasOwn(node.properties, "lines"));
}
export function prepareAxisTitleInterpolation(fromInput, toInput) {
  const from = normalizeAxisTitleAnimationState(fromInput), to = normalizeAxisTitleAnimationState(toInput);
  if (guideAnimationKey(from.identity) !== guideAnimationKey(to.identity)) return fade("guide-policy");
  const a = from.layout, b = to.layout;
  if (a.text !== b.text || !same(a.style, b.style) || !same(a.metrics, b.metrics) || a.clearance.kind !== b.clearance.kind ||
      a.clearance.unclamped !== b.clearance.unclamped || a.labels?.group !== b.labels?.group || (a.labels === null) !== (b.labels === null)) return fade("guide-layout");
  const anchor = prepareGuideAnchor(anchorOf(a), anchorOf(b));
  if (anchor.kind === "crossfade") return anchor;
  if (a.labels !== null && a.labels.group === undefined) {
    const labels = prepareAxisAnimationLayoutPair(labelsOf(a), labelsOf(b));
    if (labels.kind === "crossfade") return labels;
  }
  return cloneAndFreeze({ kind: "guide", version: ANIMATION_GUIDE_VERSION, from, to });
}
export function sampleAxisTitleInterpolation(input, progress, currentLabels) {
  validateUnitInterval(progress, "Dependent title progress"); record(input, ["kind", "version", "from", "to"], "Prepared dependent title interpolation");
  if (input.kind !== "guide" || input.version !== ANIMATION_GUIDE_VERSION) throw new TypeError("Invalid prepared dependent title interpolation.");
  const prepared = prepareAxisTitleInterpolation(input.from, input.to);
  if (prepared.kind !== "guide") throw new TypeError("Invalid prepared dependent title interpolation.");
  const a = prepared.from.layout, b = prepared.to.layout;
  const anchor = sampleGuideAnchor(prepareGuideAnchor(anchorOf(a), anchorOf(b)), progress);
  if (anchor.kind === "crossfade") return anchor;
  const labels = a.labels === null || a.labels.group !== undefined ? null : sampleAxisAnimationLayout(labelsOf(a), labelsOf(b), progress);
  if (labels?.kind === "crossfade") return labels;
  const at = (a, b) => interpolateNumber(a, b, progress), { frame, ...value } = anchor.state;
  if (a.labels?.group !== undefined && (currentLabels === undefined || a.clearance.kind === "labels" && currentLabels.labelBounds.length === 0)) return fade("guide-layout");
  try {
    const state = normalizeAxisTitleAnimationState({ ...prepared.from, layout: { ...a, frame, anchor: value,
      canvas: { width: at(a.canvas.width, b.canvas.width), height: at(a.canvas.height, b.canvas.height) },
      labels: a.labels?.group !== undefined ? a.labels : labels === null ? null : (({ frame: ignored, canvas: ignoredCanvas, ...value }) => value)(labels.layout),
      clearance: a.clearance.kind === "inferred" ? { ...a.clearance, preferred: at(a.clearance.preferred, b.clearance.preferred) }
        : a.clearance.kind === "fixed" ? { ...a.clearance, offset: at(a.clearance.offset, b.clearance.offset) } : { ...a.clearance, gap: at(a.clearance.gap, b.clearance.gap) } } });
    return cloneAndFreeze({ kind: "guide", state, ...geometry(state.layout, currentLabels) });
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    return fade("guide-layout");
  }
}

// Exact siblings are part of a title's native occupied-ink dependency.
export function axisTitleAnimationLabels(input) {
  const state = normalizeAxisTitleAnimationState(input), layout = labelsOf(state.layout);
  if (layout === null) return Object.freeze([]);
  return cloneAndFreeze(axisAnimationLabelEntries(layout).map(entry => normalizeAxisLabelAnimationState({
    identity: { ...state.identity, component: "labels", value: entry.value, line: entry.line },
    kind: "label-layout", layout
  })));
}
