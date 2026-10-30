import { cloneAndFreeze } from "../../core/immutable.js";
import { canonicalJSON } from "../../core/contentDigest.js";
import { ownRecord } from "../../core/ownData.js";
import { validateInputReference } from "../../core/resourceReference.js";
import { rejectUnknownProperties, validateUnitInterval } from "../../core/validation.js";
import { validateGraphicIdentity } from "../schemas/graphicIdentity.js";
import { createGeometryBudget, snapshotGeometryJSON } from "../geo/input.js";
import { normalizeGeometry } from "../geo/geometry.js";
import { normalizePolygonWinding } from "../geo/options.js";
import { normalizeGeoAnnotationAnchor } from "../geo/annotation.js";
import { resolveGeoAnnotationPosition } from "../geo/annotationPosition.js";
import { normalizeProjectionOptions } from "../geo/projectionOptions.js";
import { createProjectionKernel } from "../geo/projections.js";
import { prepareGeoCameraInterpolation, sampleGeoCameraInterpolation } from "../geo/cameraInterpolation.js";

export const ANIMATION_GEO_ANCHOR_VERSION = "native-geo-anchor@1";
const plans = new WeakMap(), equal = (a, b) => canonicalJSON(a) === canonicalJSON(b);
function closed(value, keys, label) {
  ownRecord(value, label); rejectUnknownProperties(value, keys, label);
  if (keys.some(key => !Object.hasOwn(value, key) || value[key] === undefined)) throw new TypeError(`${label} requires every declared field.`);
}
export function normalizeGeoAnchorState(input) {
  const budget = createGeometryBudget(), state = snapshotGeometryJSON(input, budget);
  closed(state, ["version", "identity", "coordinateKind", "projection", "parameters", "anchor", "geometry", "feature"], "Animation geographic anchor");
  if (state.version !== ANIMATION_GEO_ANCHOR_VERSION) throw new TypeError("Unsupported geographic anchor version.");
  validateGraphicIdentity(state.identity); validateInputReference(state.projection);
  if (state.identity.role !== "label" || state.identity.topology !== "text" || state.identity.lineage.kind !== "resource" || state.projection.kind !== "projection") throw new TypeError("Geographic anchors require native Text and projection identity.");
  if (!equal(state.parameters, normalizeProjectionOptions(state.parameters)) || !equal(state.anchor, normalizeGeoAnnotationAnchor(state.anchor))) throw new TypeError("Geographic anchor parameters must be normalized.");
  if (!["geographic", "planar"].includes(state.coordinateKind) || (state.coordinateKind === "planar") !== (state.parameters.type === "identity")) throw new TypeError("Geographic anchor coordinates and camera differ.");
  if (state.anchor.type === "position") {
    if (state.geometry !== null || state.feature !== null) throw new TypeError("Position anchors cannot duplicate a feature source.");
  } else {
    validateInputReference(state.geometry);
    if (state.geometry.kind !== "geometry") throw new TypeError("Feature anchors require a geometry reference.");
    const geographic = state.coordinateKind === "geographic";
    closed(state.feature, ["geometry", ...(geographic ? ["polygonWinding"] : [])], "Animation anchor feature");
    normalizePolygonWinding({ coordinateKind: state.coordinateKind, ...(geographic ? { polygonWinding: state.feature.polygonWinding } : {}) });
    if (!equal(normalizeGeometry(state.feature.geometry, state.coordinateKind, budget).geometry, state.feature.geometry)) throw new TypeError("Feature anchors require normalized geometry.");
  }
  if (!equal(state.identity.lineage.resource, state.geometry ?? state.projection)) throw new TypeError("Geographic anchor lineage must match its exact source.");
  const position = resolveGeoAnnotationPosition(state.anchor, state.feature, state.coordinateKind);
  if (position !== null) createProjectionKernel(state.parameters).forward(position);
  return state;
}
export function resolveGeoAnchorState(input) {
  const state = normalizeGeoAnchorState(input);
  const position = resolveGeoAnnotationPosition(state.anchor, state.feature, state.coordinateKind);
  return position === null ? null : createProjectionKernel(state.parameters).forward(position).point;
}
export function prepareGeoAnchorInterpolation(inputFrom, inputTo) {
  const from = normalizeGeoAnchorState(inputFrom), to = normalizeGeoAnchorState(inputTo);
  const camera = prepareGeoCameraInterpolation(from.parameters, to.parameters);
  const source = value => ({ anchor: value.anchor, feature: value.feature, geometry: value.geometry?.id ?? null });
  const reason = from.identity.key !== to.identity.key || from.coordinateKind !== to.coordinateKind ? "geo-identity"
    : from.projection.id !== to.projection.id ? "geo-binding"
    : !equal(source(from), source(to)) ? "geo-feature-geometry" : camera.reason;
  const plan = cloneAndFreeze({ kind: "geo-anchor", version: ANIMATION_GEO_ANCHOR_VERSION, mode: reason === undefined ? "anchor" : "crossfade", from, to, camera,
    ...(reason === undefined ? {} : { reason }) });
  plans.set(plan, resolveGeoAnnotationPosition(from.anchor, from.feature, from.coordinateKind)); return plan;
}
export function sampleGeoAnchorInterpolation(plan, progress) {
  if (!plans.has(plan)) throw new TypeError("An authentic prepared geographic anchor is required.");
  validateUnitInterval(progress, "Geographic anchor progress");
  if (plan.mode === "crossfade") return cloneAndFreeze({ mode: "crossfade", reason: plan.reason, weights: [1 - progress, progress] });
  const state = progress === 0 ? plan.from : progress === 1 ? plan.to
    : cloneAndFreeze({ ...plan.to, parameters: sampleGeoCameraInterpolation(plan.camera, progress).parameters });
  const position = plans.get(plan);
  return Object.freeze({ mode: "anchor", state,
    point: position === null ? null : createProjectionKernel(state.parameters).forward(position).point });
}
