import { cloneAndFreeze } from "../../../core/immutable.js";
import { ownArray, ownRecord } from "../../../core/ownData.js";
import { contentDigest, canonicalJSON } from "../../../core/contentDigest.js";
import { encodeValue } from "../../../core/valueEncoding.js";
import { validateInputReference } from "../../../core/resourceReference.js";
import { encodeRowKey } from "../../../core/itemIdentity.js";
import { rejectUnknownProperties } from "../../../core/validation.js";
import { prepareRouteInput } from "./common.js";
import { normalizeRouteIntent, routeNumericOptions, ROUTE_VERSIONS } from "./options.js";
import { bundleHierarchicalRoutes, validateRouteHierarchy } from "./hierarchical.js";
import { bundleForceDirectedRoutes } from "./forceDirected.js";
import { bundleDensityRoutes } from "./density.js";
import { bundleEdgePathRoutes } from "./edgePath.js";

export const routeValueHash = value => contentDigest(canonicalJSON(encodeValue(value)));
const same = (a, b) => routeValueHash(a) === routeValueHash(b);

export function createRouteJob(payload, viewport = null) {
  ownRecord(payload, "Route job payload");
  rejectUnknownProperties(payload, ["inputs", "intent", "input", "hierarchy"], "route job payload");
  ownRecord(payload.intent, "Route intent");
  rejectUnknownProperties(payload.intent, ["method", "options", "coordinateSpace"], "route intent");
  const intent = normalizeRouteIntent(payload.intent.method, payload.intent.options, payload.intent.coordinateSpace);
  ownArray(payload.inputs, "Route inputs");
  const expected = intent.method === "hierarchical" ? ["graph", "layout", "hierarchy", "layout"] : ["graph", "layout"];
  if (payload.inputs.length !== expected.length) throw new TypeError("Route inputs require their exact ordered roles.");
  payload.inputs.forEach((ref, index) => { validateInputReference(ref); if (ref.kind !== expected[index]) throw new TypeError("Route input kind is incompatible."); });
  if (new Set(payload.inputs.map(ref => JSON.stringify([ref.kind, ref.id]))).size !== payload.inputs.length) throw new TypeError("Route inputs require unique resource identities.");
  if (intent.coordinateSpace === "world") {
    if (viewport !== null) throw new TypeError("World routes do not depend on a viewport.");
  } else {
    ownRecord(viewport, "Route viewport");
    rejectUnknownProperties(viewport, ["x", "y", "width", "height"], "route viewport");
    if (!["x", "y", "width", "height"].every(key => Object.hasOwn(viewport, key) && Number.isFinite(viewport[key])) || viewport.width < 0 || viewport.height < 0) throw new TypeError("Route viewport requires finite bounds and nonnegative dimensions.");
  }
  const context = prepareRouteInput(payload.input);
  if (!same(payload.input.limits, intent.options.limits)) throw new TypeError("Route job limits disagree with intent.");
  const hierarchical = intent.method === "hierarchical";
  if (hierarchical !== Object.hasOwn(payload, "hierarchy")) throw new TypeError("Route hierarchy input disagrees with method.");
  if (hierarchical) {
    validateRouteHierarchy(payload.hierarchy, context);
    const mapping = intent.options.mapping.map(({ nodeKey, hierarchyKey }) => ({ nodeKey: encodeRowKey(nodeKey), hierarchyKey: encodeRowKey(hierarchyKey) }));
    if (!same(mapping, payload.hierarchy.mapping)) throw new TypeError("Route hierarchy mapping disagrees with intent.");
  }
  // Shared graph/hierarchy owners inspect nested descriptors before cloning.
  const body = cloneAndFreeze({ schemaVersion: 1, algorithmVersion: ROUTE_VERSIONS[intent.method], inputs: payload.inputs,
    intent, input: payload.input, viewport, ...(hierarchical ? { hierarchy: payload.hierarchy } : {}) });
  return cloneAndFreeze({ ...body, inputHash: routeValueHash(body) });
}

export function validateRouteJob(job) {
  ownRecord(job, "Route job");
  rejectUnknownProperties(job, ["schemaVersion", "algorithmVersion", "inputs", "intent", "input", "viewport", "hierarchy", "inputHash"], "route job");
  if (!["schemaVersion", "algorithmVersion", "inputs", "intent", "input", "viewport", "inputHash"].every(key => Object.hasOwn(job, key))) throw new TypeError("Route job requires all own version, input and hash fields.");
  const payload = { inputs: job.inputs, intent: job.intent, input: job.input, ...(Object.hasOwn(job, "hierarchy") ? { hierarchy: job.hierarchy } : {}) };
  const normalized = createRouteJob(payload, job.viewport);
  if (job.schemaVersion !== 1 || job.algorithmVersion !== normalized.algorithmVersion || job.inputHash !== normalized.inputHash) throw new TypeError("Route job version or input hash is stale.");
  return normalized;
}

export function computeRouteJob(input, signal) {
  if (signal !== undefined) AbortSignal.prototype.throwIfAborted.call(signal);
  const job = validateRouteJob(input), options = routeNumericOptions(job.intent);
  const result = job.intent.method === "hierarchical" ? bundleHierarchicalRoutes(job.input, job.hierarchy, options, signal)
    : job.intent.method === "force-directed" ? bundleForceDirectedRoutes(job.input, options, signal)
      : job.intent.method === "density" ? bundleDensityRoutes(job.input, options, signal) : bundleEdgePathRoutes(job.input, options, signal);
  return cloneAndFreeze({ inputHash: job.inputHash, resultHash: routeValueHash(result), result });
}
