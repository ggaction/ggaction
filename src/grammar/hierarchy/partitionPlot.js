import { cloneAndFreeze } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateNonNegativeFinite } from "../../core/validation.js";
import { hierarchyTargetKey, normalizeHierarchyPlot, validateHierarchyPlotDefinition } from "./plot.js";

export const PARTITION_MAPPING_OPTIONS = Object.freeze(["orientation", "reverseU", "reverseV", "padding", "innerRadius", "outerRadius", "startAngle", "sweep", "direction", "radiusPolicy"]);
export const PARTITION_VIEW_OPTIONS = Object.freeze(["focus", "rootVisible", "prunedSelection"]);
const DEFAULT_MAPPING = Object.freeze({ orientation: "horizontal", reverseU: false, reverseV: false, padding: [0, 0],
  innerRadius: 0, outerRadius: "auto", startAngle: 0, sweep: 360, direction: "clockwise", radiusPolicy: "equal-depth" });
function choices(value, allowed, label) {
  if (!allowed.includes(value)) throw new TypeError(`Unsupported partition ${label}.`);
}
function bool(value, label) { if (typeof value !== "boolean") throw new TypeError(`Partition ${label} must be boolean.`); }
function padding(value) {
  const pair = typeof value === "number" ? [value, value] : value;
  ownArray(pair, "Partition padding");
  if (pair.length !== 2) throw new TypeError("Partition padding requires a number or two gaps.");
  pair.forEach(value => validateNonNegativeFinite(value, "Partition gap"));
  return pair;
}
export function validatePartitionMapping(value) {
  ownRecord(value, "Partition mapping"); rejectUnknownProperties(value, PARTITION_MAPPING_OPTIONS, "partition mapping");
  if (PARTITION_MAPPING_OPTIONS.some(key => !Object.hasOwn(value, key))) throw new TypeError("Stored partition mapping requires all fields.");
  choices(value.orientation, ["horizontal", "vertical"], "orientation");
  bool(value.reverseU, "reverseU"); bool(value.reverseV, "reverseV");
  if (!Array.isArray(value.padding)) throw new TypeError("Stored partition padding requires two gaps.");
  padding(value.padding);
  validateNonNegativeFinite(value.innerRadius, "Partition inner radius");
  if (value.outerRadius !== "auto" && (!Number.isFinite(value.outerRadius) || value.outerRadius <= value.innerRadius)) throw new RangeError("Partition outer radius must exceed inner radius.");
  if (!Number.isFinite(value.startAngle)) throw new TypeError("Partition startAngle must be finite degrees.");
  if (!(Number.isFinite(value.sweep) && value.sweep > 0 && value.sweep <= 360)) throw new RangeError("Partition sweep must be in (0, 360] degrees.");
  choices(value.direction, ["clockwise", "counterclockwise"], "direction");
  choices(value.radiusPolicy, ["equal-depth", "equal-depth-area"], "radiusPolicy");
}
export function validatePartitionView(value, model) {
  ownRecord(value, "Partition view");
  const required = ["focusKey", "rootVisible", "prunedSelection"];
  rejectUnknownProperties(value, [...required, "recovery"], "partition view");
  if (required.some(key => !Object.hasOwn(value, key))) throw new TypeError("Stored partition view requires all fields.");
  if (value.focusKey !== null && (typeof value.focusKey !== "string" || !model.nodes.some(node => node.key === value.focusKey))) throw new TypeError("Partition focus must identify a current node.");
  bool(value.rootVisible, "rootVisible"); choices(value.prunedSelection, ["keep-hidden", "drop"], "prunedSelection");
  if (Object.hasOwn(value, "recovery")) {
    const recovery = ownRecord(value.recovery, "Partition recovery");
    rejectUnknownProperties(recovery, ["previousFocusKey", "reason"], "partition recovery");
    if (!Object.hasOwn(recovery, "previousFocusKey") || recovery.previousFocusKey !== null && (typeof recovery.previousFocusKey !== "string" || !recovery.previousFocusKey)) throw new TypeError("Partition recovery requires its previous focus key.");
    choices(recovery.reason, ["ancestor", "root", "empty"], "recovery reason");
  }
}
export function normalizePartitionPlot(patch, hierarchy, previousConfig, previousLabels, previousView) {
  ownRecord(patch, "Partition plot");
  rejectUnknownProperties(patch, [...PARTITION_MAPPING_OPTIONS, ...PARTITION_VIEW_OPTIONS, "clip", "cells", "labels"], "partition plot");
  if (Object.values(patch).some(value => value === undefined)) throw new TypeError("Partition options cannot be undefined; omission preserves intent.");
  const mapping = { ...DEFAULT_MAPPING, ...previousConfig?.mapping, ...Object.fromEntries(PARTITION_MAPPING_OPTIONS.filter(key => Object.hasOwn(patch, key)).map(key => [key, patch[key]])) };
  mapping.padding = padding(mapping.padding); validatePartitionMapping(mapping);
  const view = { focusKey: null, rootVisible: true, prunedSelection: "keep-hidden", ...previousView };
  if (Object.hasOwn(patch, "focus")) {
    if (patch.focus !== null) {
      ownRecord(patch.focus, "Partition focus"); rejectUnknownProperties(patch.focus, ["key", "path"], "partition focus");
    }
    view.focusKey = patch.focus === null ? null : hierarchyTargetKey(patch.focus, hierarchy.options);
    delete view.recovery;
  }
  for (const key of ["rootVisible", "prunedSelection"]) if (Object.hasOwn(patch, key)) view[key] = patch[key];
  validatePartitionView(view, hierarchy.result);
  const base = Object.fromEntries(["clip", "cells", "labels"].filter(key => Object.hasOwn(patch, key)).map(key => [key, patch[key]]));
  let minWidth = previousConfig?.labelVisibility.minWidth ?? 0, minArcLength = previousConfig?.labelVisibility.minArcLength ?? 0;
  if (base.labels !== undefined && base.labels !== false) {
    ownRecord(base.labels, "Partition labels");
    const { minWidth: width, minArcLength: arc, ...paint } = base.labels;
    if (Object.hasOwn(base.labels, "minWidth")) minWidth = validateNonNegativeFinite(width, "Partition label minWidth");
    if (Object.hasOwn(base.labels, "minArcLength")) minArcLength = validateNonNegativeFinite(arc, "Partition label minArcLength");
    base.labels = paint;
  }
  const { mapping: _mapping, labelVisibility: _visibility, ...prior } = previousConfig ?? {};
  const normalized = normalizeHierarchyPlot("partition", base, hierarchy, previousConfig === undefined ? undefined : prior, previousLabels);
  return cloneAndFreeze({ config: { ...normalized.config, mapping, labelVisibility: { minWidth, minArcLength } }, labels: normalized.labels, view });
}
export function validatePartitionPlotDefinition(config, labels, view, model) {
  ownRecord(config, "Partition plot config");
  const { mapping, labelVisibility, ...paint } = config;
  validateHierarchyPlotDefinition("partition", paint, labels);
  if (paint.origin !== "auto") throw new TypeError("Partition placement is owned by its coordinate.");
  validatePartitionMapping(mapping); validatePartitionView(view, model);
  ownRecord(labelVisibility, "Partition label visibility");
  rejectUnknownProperties(labelVisibility, ["minWidth", "minArcLength"], "partition label visibility");
  validateNonNegativeFinite(labelVisibility.minWidth, "Partition label minWidth");
  validateNonNegativeFinite(labelVisibility.minArcLength, "Partition label minArcLength");
}
