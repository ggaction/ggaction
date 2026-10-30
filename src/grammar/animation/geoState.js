import { cloneAndFreeze } from "../../core/immutable.js";
import { canonicalJSON } from "../../core/contentDigest.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { validateInputReference } from "../../core/resourceReference.js";
import { rejectUnknownProperties, validateGeneratedItemLimit, validateWorkLimit, validateNonNegativeFinite, validateUnitInterval } from "../../core/validation.js";
import { createGeometryBudget, snapshotGeometryJSON } from "../geo/input.js";
import { normalizeGeometry } from "../geo/geometry.js";
import { normalizePolygonWinding } from "../geo/options.js";
import { normalizeProjectionOptions } from "../geo/projectionOptions.js";
import { validateGeoSourceBinding } from "../geo/mark.js";
import { prepareGeoCameraInterpolation, sampleGeoCameraInterpolation } from "../geo/cameraInterpolation.js";
import { geoMarkGeometry, validateGeoMarkGeometry, geoPartGeometry } from "../geo/markGeometry.js";
import { projectGeometry } from "../geo/stream.js";
import { interpolateNumber } from "./values.js";

export const ANIMATION_GEO_VERSION = "native-geo-camera@1";
const fallbackReasons = new Set(["geo-identity", "geo-binding", "geo-feature-topology", "geo-feature-geometry", "edited-geo-graphics", "projection-type", "projection-parameters"]);
export const isGeoAnimationFallbackReason = reason => fallbackReasons.has(reason);
const plans = new WeakSet();
const equal = (a, b) => canonicalJSON(a) === canonicalJSON(b);
const fade = reason => Object.freeze({ kind: "crossfade", reason });
function closed(value, keys, label) {
  ownRecord(value, label); rejectUnknownProperties(value, keys, label);
  if (keys.some(key => !Object.hasOwn(value, key) || value[key] === undefined)) throw new TypeError(`${label} requires every declared field.`);
}

// Snapshot first: descriptor, cycle, nesting and cumulative work checks precede
// all semantic reads, including geometry that is currently outside the clip.
export function normalizeAnimationGeoGroup(input) {
  const budget = createGeometryBudget(), group = snapshotGeometryJSON(input, budget);
  closed(group, ["key", "binding", "coordinateKind", "projection", "parameters", "logicalId", "features"], "Animation Geo group");
  if (typeof group.key !== "string" || !group.key || typeof group.logicalId !== "string" || !group.logicalId) throw new TypeError("Animation Geo requires an explicit scoped owner and logical source.");
  const address = JSON.parse(group.key);
  if (!Array.isArray(address) || address.length !== 2 || !Array.isArray(address[0]) || address[0].some(part => typeof part !== "string" || !part) || typeof address[1] !== "string" || !address[1] || JSON.stringify(address) !== group.key) throw new TypeError("Animation Geo owner must use a canonical scope and layer ID.");
  validateGeoSourceBinding(group.binding); validateInputReference(group.projection);
  if (group.projection.kind !== "projection") throw new TypeError("Animation Geo requires an exact projection reference.");
  const parameters = normalizeProjectionOptions(group.parameters);
  if (!equal(parameters, group.parameters)) throw new TypeError("Animation Geo camera parameters must be normalized.");
  if (!["geographic", "planar"].includes(group.coordinateKind) || (group.coordinateKind === "planar") !== (parameters.type === "identity")) throw new TypeError("Animation Geo coordinates and projection are incompatible.");
  if (group.binding.mode === "graticule" && (group.coordinateKind !== "geographic" || group.logicalId !== "graticule")) throw new TypeError("Animation graticule requires its geographic generated identity.");
  if (group.binding.radiusDeg !== undefined && group.coordinateKind !== "geographic") throw new TypeError("Geographic angular radius requires spherical coordinates.");
  ownArray(group.features, "Animation Geo features"); budget.count("features", group.features.length);
  const keys = new Set();
  for (const feature of group.features) {
    const winding = Object.hasOwn(feature, "polygonWinding");
    closed(feature, ["key", "geometry", "radiusPx", ...(winding ? ["polygonWinding"] : [])], "Animation Geo feature");
    if (typeof feature.key !== "string" || !feature.key || keys.has(feature.key)) throw new TypeError("Animation Geo feature keys must be unique nonempty strings.");
    keys.add(feature.key); validateNonNegativeFinite(feature.radiusPx, "Animation Geo radius");
    normalizePolygonWinding({ coordinateKind: group.coordinateKind, ...(winding ? { polygonWinding: feature.polygonWinding } : {}) });
    if (group.coordinateKind === "geographic" && !winding) throw new TypeError("Animation geographic features require resolved polygon winding.");
    const normalized = normalizeGeometry(feature.geometry, group.coordinateKind, budget);
    if (!equal(normalized.geometry, feature.geometry)) throw new TypeError("Animation Geo requires normalized source geometry.");
    validateGeoMarkGeometry(feature.geometry, group.binding);
  }
  return group;
}

// The native stream owns clipping, refinement, winding, holes and complements.
// Return every current part; endpoint command counts never constrain a frame.
export function resolveAnimationGeoGeometry(input) {
  const group = normalizeAnimationGeoGroup(input), features = []; let work = 0, points = 0;
  for (const feature of group.features) {
    const geometry = group.binding.mode === "graticule" ? feature.geometry : geoMarkGeometry(feature.geometry, group.binding, group.parameters);
    const projected = projectGeometry(geometry, group.parameters, { coordinateKind: group.coordinateKind,
      interpolation: group.binding.interpolation ?? "source-segment",
      ...(group.binding.routeHint === undefined ? {} : { routeHint: group.binding.routeHint }),
      ...(feature.polygonWinding === undefined || group.binding.radiusDeg !== undefined ? {} : { polygonWinding: feature.polygonWinding }) });
    validateWorkLimit(work += projected.diagnostics.work, "Animation geographic stream work");
    validateGeneratedItemLimit(points += projected.diagnostics.outputPoints, "Animation geographic output points");
    features.push({ key: feature.key, parts: geoPartGeometry(projected.parts, feature.radiusPx) });
  }
  return cloneAndFreeze({ features, diagnostics: { work, points } });
}

export function prepareGeoInterpolation(inputFrom, inputTo) {
  const from = normalizeAnimationGeoGroup(inputFrom), to = normalizeAnimationGeoGroup(inputTo);
  if (from.key !== to.key || from.logicalId !== to.logicalId || from.coordinateKind !== to.coordinateKind) return fade("geo-identity");
  const policy = binding => { const { geometry, ...rest } = binding; return { ...rest, ...(geometry === undefined ? {} : { geometry: { kind: geometry.kind, id: geometry.id } }) }; };
  if (!equal(policy(from.binding), policy(to.binding))) return fade("geo-binding");
  const camera = prepareGeoCameraInterpolation(from.parameters, to.parameters);
  if (camera.mode === "crossfade") return fade(camera.reason);
  const previous = new Map(from.features.map(feature => [feature.key, feature]));
  const failures = to.features.flatMap(feature => {
    const source = previous.get(feature.key);
    return source === undefined ? [{ key: feature.key, reason: "geo-feature-topology" }]
      : !equal(source.geometry, feature.geometry) || source.polygonWinding !== feature.polygonWinding ? [{ key: feature.key, reason: "geo-feature-geometry" }] : [];
  });
  const plan = cloneAndFreeze({ kind: "geo", version: ANIMATION_GEO_VERSION, from, to, camera, failures }); plans.add(plan); return plan;
}

export function sampleGeoInterpolation(plan, progress) {
  validateUnitInterval(progress, "Animation Geo progress");
  if (!plans.has(plan)) throw new TypeError("An authentic prepared Geo interpolation is required.");
  if (progress === 0 || progress === 1) return Object.freeze({ group: progress === 0 ? plan.from : plan.to, failures: Object.freeze([]) });
  const previous = new Map(plan.from.features.map(feature => [feature.key, feature])), failed = new Set(plan.failures.map(failure => failure.key));
  const parameters = sampleGeoCameraInterpolation(plan.camera, progress).parameters;
  return cloneAndFreeze({ group: { ...plan.to, parameters, features: plan.to.features.map(feature => failed.has(feature.key) ? feature : {
    ...feature, radiusPx: interpolateNumber(previous.get(feature.key).radiusPx, feature.radiusPx, progress)
  }) }, failures: plan.failures });
}
