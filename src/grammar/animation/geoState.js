import { cloneAndFreeze } from "../../core/immutable.js";
import { sameCanonicalJSON } from "../../core/contentDigest.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { validateInputReference } from "../../core/resourceReference.js";
import { MAX_WORK_ITEMS, rejectUnknownProperties, validateGeneratedItemLimit, validateWorkLimit, validateNonNegativeFinite, validateUnitInterval } from "../../core/validation.js";
import { GEO_LIMITS, createGeometryBudget, snapshotGeometryJSON } from "../geo/input.js";
import { normalizeGeometry } from "../geo/geometry.js";
import { normalizePolygonWinding } from "../geo/options.js";
import { normalizeProjectionOptions } from "../geo/projectionOptions.js";
import { validateGeoSourceBinding } from "../geo/mark.js";
import { prepareGeoCameraInterpolation, sampleGeoCameraInterpolation } from "../geo/cameraInterpolation.js";
import { geoMarkGeometry, validateGeoMarkGeometry, geoPartGeometry } from "../geo/markGeometry.js";
import { geoBindingCapacity } from "../geo/capacity.js";
import { projectGeometry } from "../geo/stream.js";
import { interpolateNumber } from "./values.js";

export const ANIMATION_GEO_VERSION = "native-geo-camera@1";
export const ANIMATION_GEO_CAPACITY_VERSION = "native-geo-camera@2";
const fallbackReasons = new Set(["geo-identity", "geo-binding", "geo-feature-topology", "geo-feature-geometry", "edited-geo-graphics", "projection-type", "projection-parameters"]);
export const isGeoAnimationFallbackReason = reason => fallbackReasons.has(reason);
const plans = new WeakSet();
const equal = sameCanonicalJSON;
const fade = reason => Object.freeze({ kind: "crossfade", reason });
function closed(value, keys, label) {
  ownRecord(value, label); rejectUnknownProperties(value, keys, label);
  if (keys.some(key => !Object.hasOwn(value, key) || value[key] === undefined)) throw new TypeError(`${label} requires every declared field.`);
}

// Admitted owned groups keep the exact admission charges their immutable content
// produced. A group sampled from an authentic plan points at its admitted `to`.
const admittedGroups = new WeakMap(), sampledGroups = new WeakMap();

// Snapshot first: descriptor, cycle, nesting and cumulative work checks precede
// all semantic reads, including geometry that is currently outside the clip.
export function normalizeAnimationGeoGroup(input) {
  const budget = createGeometryBudget(), group = snapshotGeometryJSON(input, budget), snapshot = budget.diagnostics();
  admitGroupFields(group, budget, feature => {
    const normalized = normalizeGeometry(feature.geometry, group.coordinateKind, budget);
    if (!equal(normalized.geometry, feature.geometry)) throw new TypeError("Animation Geo requires normalized source geometry.");
    validateGeoMarkGeometry(feature.geometry, group.binding);
  });
  admittedGroups.set(group, { snapshot, totals: budget.diagnostics(), parameters: [] });
  return group;
}

// Charges a fresh full admission of `group` would make with the group at
// `depth`, or undefined unless every value outside the parameters and feature
// radii is the admitted source's own value. Parameters are measured afresh.
export function sampledGeoGroupCharges(group, depth, phase) {
  const source = sampledGroups.get(group) ?? (admittedGroups.has(group) ? group : undefined), admitted = admittedGroups.get(source);
  if (admitted === undefined) return undefined;
  const keys = Object.keys(group), sourceKeys = Object.keys(source);
  if (keys.length !== sourceKeys.length || keys.some((key, index) => key !== sourceKeys[index] ||
      key !== "parameters" && key !== "features" && group[key] !== source[key]) || group.features.length !== source.features.length) return undefined;
  for (let index = 0; index < group.features.length; index++) {
    const feature = group.features[index], original = source.features[index];
    if (feature === original) continue;
    const featureKeys = Object.keys(feature), originalKeys = Object.keys(original);
    if (featureKeys.length !== originalKeys.length || featureKeys.some((key, at) => key !== originalKeys[at] ||
        (key === "radiusPx" ? !Number.isFinite(feature.radiusPx) : feature[key] !== original[key]))) return undefined;
  }
  // The subtree below the group must fit under `depth`; parameters sit one deeper.
  if (depth > 0 && !((admitted.fits ??= [])[depth] ??= fitsDepth(source, depth))) return undefined;
  const sourceParameters = admitted.parameters[depth] ??= parameterCharges(source.parameters, depth);
  const parameters = source === group ? sourceParameters : parameterCharges(group.parameters, depth);
  if (sourceParameters === undefined || parameters === undefined) return undefined;
  const base = admitted[phase];
  return { ...base, values: base.values - sourceParameters.values + parameters.values, work: base.work - sourceParameters.work + parameters.work };
}
function parameterCharges(value, depth) {
  try { const budget = createGeometryBudget({ maxDepth: GEO_LIMITS.maxDepth - depth - 1 }); snapshotGeometryJSON(value, budget); return budget.diagnostics(); }
  catch { return undefined; }
}
function fitsDepth(value, depth) {
  try { snapshotGeometryJSON(value, createGeometryBudget({ maxDepth: GEO_LIMITS.maxDepth - depth })); return true; }
  catch { return false; }
}
const withinLimits = charges => charges !== undefined && charges.values <= GEO_LIMITS.maxValues && charges.work <= MAX_WORK_ITEMS;
// Every admission charge only counts toward totals verified above.
const verifiedBudget = Object.freeze({ count() {} });

// Exactly the fresh admission's result: a sampled group whose verified totals
// stay within every limit cannot fail a charge, and its unchanged feature
// geometries are the admitted source's own normalized values.
export function normalizeSampledAnimationGeoGroup(group) {
  if (!withinLimits(sampledGeoGroupCharges(group, 0, "totals"))) return normalizeAnimationGeoGroup(group);
  admitGroupFields(group, verifiedBudget, () => {});
  return group;
}

function admitGroupFields(group, budget, admitGeometry) {
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
    admitGeometry(feature);
  }
}

// The native stream owns clipping, refinement, winding, holes and complements.
// Return every current part; endpoint command counts never constrain a frame.
export function resolveAnimationGeoGeometry(input, capacityEnabled = false) {
  return resolveNormalizedAnimationGeoGeometry(normalizeAnimationGeoGroup(input), capacityEnabled);
}

// Internal synchronous preparation always admits the complete input. Only this
// closure can reach the calculation with that exact normalized immutable group.
export function prepareAnimationGeoGeometry(input) {
  const group = normalizeSampledAnimationGeoGroup(input);
  return capacityEnabled => resolveNormalizedAnimationGeoGeometry(group, capacityEnabled);
}

function resolveNormalizedAnimationGeoGeometry(group, capacityEnabled) {
  const features = [];
  const capacity = capacityEnabled ? geoBindingCapacity(group.binding) : undefined; let work = 0, points = 0;
  for (const feature of group.features) {
    const geometry = group.binding.mode === "graticule" ? feature.geometry : geoMarkGeometry(feature.geometry, group.binding, group.parameters);
    const projected = projectGeometry(geometry, group.parameters, { coordinateKind: group.coordinateKind,
      ...(capacity === undefined ? {} : { maxPoints: capacity.maxProjectedPoints }),
      interpolation: group.binding.interpolation ?? "source-segment",
      ...(group.binding.routeHint === undefined ? {} : { routeHint: group.binding.routeHint }),
      ...(feature.polygonWinding === undefined || group.binding.radiusDeg !== undefined ? {} : { polygonWinding: feature.polygonWinding }) });
    validateWorkLimit(work += projected.diagnostics.work, "Animation geographic stream work");
    validateGeneratedItemLimit(points += projected.diagnostics.outputPoints, "Animation geographic output points", capacity?.maxProjectedPoints);
    features.push({ key: feature.key, parts: geoPartGeometry(projected.parts, feature.radiusPx, capacityEnabled && Object.hasOwn(group.binding,"capacity") ? capacity.maxPathCommands : undefined) });
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
  const sample = cloneAndFreeze({ group: { ...plan.to, parameters, features: plan.to.features.map(feature => failed.has(feature.key) ? feature : {
    ...feature, radiusPx: interpolateNumber(previous.get(feature.key).radiusPx, feature.radiusPx, progress)
  }) }, failures: plan.failures });
  sampledGroups.set(sample.group, plan.to);
  return sample;
}
