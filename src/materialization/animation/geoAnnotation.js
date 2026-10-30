import { cloneAndFreeze } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties } from "../../core/validation.js";
import { normalizeTextMetricProfile, normalizeFontMetricProfile } from "../../core/textMetricProfile.js";
import { fontMetricBinding, measureTextWidth } from "../../core/textMetrics.js";
import { requireLayer } from "../../selectors/layers.js";
import { createGeometryBudget, snapshotGeometryJSON } from "../../grammar/geo/input.js";
import { ANIMATION_GEO_ANCHOR_VERSION, normalizeGeoAnchorState, resolveGeoAnchorState } from "../../grammar/animation/geoAnchor.js";
import { namespaceItemKey } from "../../grammar/schemas/graphicIdentity.js";
import { validateConcreteGraphicProperties } from "../../grammar/schemas/concreteGraphic.js";
import { geoAnnotationSource } from "../geo/annotationSource.js";
import { geoAnnotationTextProperties } from "../geo/annotation.js";
import { geoFeatureKey } from "../geo/source.js";
import { resolveCoordinateBounds } from "../coordinateBounds.js";
import { materializeFillItemsInPlot } from "../fillPaint.js";

function graphic(presentation, point) {
  const { properties, state } = presentation;
  if (point === null || properties.text.length === 0) return [];
  return materializeFillItemsInPlot([{ type: "text", identity: state.identity,
    properties: { ...properties, x: point[0] + properties.x, y: point[1] + properties.y } }], {
    plotOrigin: presentation.plotOrigin, textMetrics: presentation.textMetrics ?? undefined
  });
}
export function normalizeGeoAnnotationPresentation(input) {
  const value = snapshotGeometryJSON(input, createGeometryBudget());
  ownRecord(value, "Animation geographic Text presentation");
  const keys = ["state", "properties", "plotOrigin", "textMetrics"];
  rejectUnknownProperties(value, keys, "animation geographic Text presentation");
  if (keys.some(key => !Object.hasOwn(value, key) || value[key] === undefined)) throw new TypeError("Geographic Text requires every presentation field.");
  normalizeGeoAnchorState(value.state);
  ownRecord(value.properties, "Geographic Text properties"); ownArray(value.plotOrigin, "Geographic Text plot origin");
  if (typeof value.properties.text !== "string") throw new TypeError("Geographic Text requires string content.");
  if (value.plotOrigin.length !== 2 || value.plotOrigin.some(n => !Number.isFinite(n))) throw new TypeError("Geographic Text plot origin requires two finite values.");
  if (value.textMetrics !== null) {
    (value.textMetrics.schemaVersion === 2 ? normalizeFontMetricProfile : normalizeTextMetricProfile)(value.textMetrics);
  }
  const binding = fontMetricBinding(value.textMetrics, value.properties), font = value.properties.font;
  if (binding === undefined ? font !== undefined : font === undefined ||
      Object.entries(binding.identity).some(([key, expected]) => font[key] !== expected)) {
    throw new TypeError("Geographic Text font must match its exact prepared measurement identity.");
  }
  if (binding !== undefined) {
    for (const text of value.properties.lines?.map(line => line.text) ?? [value.properties.text]) {
      measureTextWidth(text, value.properties, value.textMetrics);
    }
  }
  // Check even currently hidden Text. Bounds-dependent paint uses the native
  // owner at an explicit origin; its anchor is never inferred from old pixels.
  const candidates = materializeFillItemsInPlot([{ type: "text", properties: value.properties }], {
    plotOrigin: value.plotOrigin, textMetrics: value.textMetrics ?? undefined
  });
  for (const candidate of candidates) validateConcreteGraphicProperties(candidate.type, candidate.properties);
  return value;
}
export function resolveGeoAnnotationPresentation(input) {
  const presentation = normalizeGeoAnnotationPresentation(input);
  const graphics = graphic(presentation, resolveGeoAnchorState(presentation.state));
  for (const item of graphics) validateConcreteGraphicProperties(item.type, item.properties);
  return cloneAndFreeze(graphics);
}
export function projectGeoAnnotationAnimation(program, layer, namespaces = []) {
  ownArray(namespaces, "Geographic annotation namespaces");
  if (namespaces.some(value => typeof value !== "string" || value.length === 0)) throw new TypeError("Geographic annotations require explicit namespaces.");
  if (requireLayer(program, layer.id) !== layer || layer.mark.type !== "geo" || layer.geoBinding.mode !== "annotation") throw new TypeError("Animation preparation requires its exact native geographic annotation.");
  const config = program.materializationConfigs.marks[layer.id].geo;
  const source = geoAnnotationSource(program, layer, config), { binding, projection, coordinateKind, parameters } = source;
  const resource = { kind: "projection", id: projection.id, revision: projection.revision };
  const geometry = binding.geometry ?? null, feature = source.features[0];
  const key = namespaces.reduceRight((key, namespace) => namespaceItemKey(key, namespace), geoFeatureKey(layer, source.resource, feature));
  const state = normalizeGeoAnchorState({ version: ANIMATION_GEO_ANCHOR_VERSION,
    identity: { key, topology: "text", role: "label", lineage: { kind: "resource", resource: geometry ?? resource } },
    coordinateKind, projection: resource, parameters, anchor: binding.anchor, geometry,
    feature: geometry === null ? null : { geometry: feature.geometry,
      ...(coordinateKind === "geographic" ? { polygonWinding: feature.polygonWinding ?? "right-hand" } : {}) } });
  const plot = resolveCoordinateBounds(program, layer.coordinate);
  return normalizeGeoAnnotationPresentation({ state,
    properties: geoAnnotationTextProperties(program, config, { x: 0, y: 0 }, binding.text),
    plotOrigin: [plot.x, plot.y], textMetrics: program.materializationConfigs.textMetrics ?? null });
}
