import { createRouteLedger, normalizeRouteExecution } from "./execution.js";
import { routeHashStages, finishRouteStages, ROUTE_JOB_HASH_BYTES, ROUTE_COMPLETION_BYTES, routeHashScratchBytes } from "./valueHash.js";
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
// Only this module's fully validated, deeply owned snapshots can reuse proof.
// Worker/structured copies and caller-frozen records still take the full path.
const validatedJobs = new WeakSet();

function routeJobBody(payload, viewport, scope) {
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
  const bounded = Object.hasOwn(intent.options, "execution");
  if (bounded) ownRecord(payload.input, "Route input");
  if (bounded && Object.hasOwn(payload.input, "limits")) throw new TypeError("Route v2 input limits belong only to intent.");
  if (bounded) scope = { ...scope, execution: intent.options.execution, ledger: scope?.ledger ?? createRouteLedger(intent.options.execution, scope?.signal) };
  const context = prepareRouteInput(bounded ? { ...payload.input, limits: intent.options.limits } : payload.input,
    scope?.signal, bounded ? scope : scope === undefined ? undefined : { ledger: scope.ledger });
  if (!bounded && !same(payload.input.limits, intent.options.limits)) throw new TypeError("Route job limits disagree with intent.");
  const hierarchical = intent.method === "hierarchical";
  if (hierarchical !== Object.hasOwn(payload, "hierarchy")) throw new TypeError("Route hierarchy input disagrees with method.");
  if (hierarchical) {
    validateRouteHierarchy(payload.hierarchy, context);
    const mapping = intent.options.mapping.map(({ nodeKey, hierarchyKey }) => ({ nodeKey: encodeRowKey(nodeKey), hierarchyKey: encodeRowKey(hierarchyKey) }));
    if (!same(mapping, payload.hierarchy.mapping)) throw new TypeError("Route hierarchy mapping disagrees with intent.");
  }
  // Shared graph/hierarchy owners inspect nested descriptors before cloning.
  return { scope, body: cloneAndFreeze({ schemaVersion: bounded ? 2 : 1, algorithmVersion: ROUTE_VERSIONS[intent.method], inputs: payload.inputs,
    intent, input: payload.input, viewport, ...(hierarchical ? { hierarchy: payload.hierarchy } : {}) }) };
}

export function createRouteJob(payload, viewport = null, scope) {
  const prepared = routeJobBody(payload, viewport, scope), { body } = prepared;
  if (body.schemaVersion === 2) return finishRouteStages(completeRouteJob(body, prepared.scope));
  const job = cloneAndFreeze({ ...body, inputHash: routeValueHash(body) });
  validatedJobs.add(job);
  return job;
}

function* completeRouteJob(body, scope) {
  const ledger = scope?.ledger ?? createRouteLedger(body.intent.options.execution, scope?.signal);
  const digest = yield* routeHashStages(body, body.intent.options.execution, ledger, ROUTE_JOB_HASH_BYTES);
  const job = cloneAndFreeze({ ...body, inputHash: digest.hash });
  ledger.check(); validatedJobs.add(job);
  return job;
}

// Snapshot acquisition is synchronous and complete before the first yield.
export function* createRouteJobStages(payload, viewport = null, scope) {
  const prepared = routeJobBody(payload, viewport, scope), { body } = prepared;
  scope = prepared.scope;
  if (body.schemaVersion !== 2) throw new TypeError("Asynchronous route jobs require schemaVersion 2.");
  payload = undefined; viewport = undefined;
  return yield* completeRouteJob(body, scope);
}

export function isRouteJobV2(value) {
  return value !== null && typeof value === "object" && Object.getOwnPropertyDescriptor(value, "schemaVersion")?.value === 2;
}

export function* validateRouteJobStages(input, scope, revalidate = false) {
  scope?.ledger?.check();
  if (!revalidate && validatedJobs.has(input)) {
    if (input.schemaVersion !== 2) throw new TypeError("Asynchronous route computation requires schemaVersion 2.");
    return input;
  }
  ownRecord(input, "Route job");
  rejectUnknownProperties(input, ["schemaVersion", "algorithmVersion", "inputs", "intent", "input", "viewport", "hierarchy", "inputHash"], "route job");
  if (!["schemaVersion", "algorithmVersion", "inputs", "intent", "input", "viewport", "inputHash"].every(key => Object.hasOwn(input, key))) throw new TypeError("Route job requires all own version, input and hash fields.");
  const version = input.schemaVersion, algorithm = input.algorithmVersion, hash = input.inputHash;
  let payload = { inputs: input.inputs, intent: input.intent, input: input.input, ...(Object.hasOwn(input, "hierarchy") ? { hierarchy: input.hierarchy } : {}) };
  const prepared = routeJobBody(payload, input.viewport, scope), { body } = prepared;
  scope = prepared.scope;
  input = undefined; payload = undefined;
  if (version !== 2 || body.schemaVersion !== 2 || algorithm !== body.algorithmVersion || typeof hash !== "string" || !/^[a-f0-9]{64}$/.test(hash)) throw new TypeError("Route job version or input hash is stale.");
  // Do not register an external snapshot until its claimed hash is checked.
  const ledger = scope?.ledger ?? createRouteLedger(body.intent.options.execution, scope?.signal);
  const digest = yield* routeHashStages(body, body.intent.options.execution, ledger, ROUTE_JOB_HASH_BYTES);
  if (hash !== digest.hash) throw new TypeError("Route job version or input hash is stale.");
  const job = cloneAndFreeze({ ...body, inputHash: hash });
  ledger.check(); validatedJobs.add(job); return job;
}

export function validateRouteJob(job) {
  if (isRouteJobV2(job)) return finishRouteStages(validateRouteJobStages(job));
  if (validatedJobs.has(job)) return job;
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
  if (job.schemaVersion !== 1) throw new TypeError("Route v2 requires computeGraphEdgeRoutesAsync.");
  const result = job.intent.method === "hierarchical" ? bundleHierarchicalRoutes(job.input, job.hierarchy, options, signal)
    : job.intent.method === "force-directed" ? bundleForceDirectedRoutes(job.input, options, signal)
      : job.intent.method === "density" ? bundleDensityRoutes(job.input, options, signal) : bundleEdgePathRoutes(job.input, options, signal);
  return cloneAndFreeze({ inputHash: job.inputHash, resultHash: routeValueHash(result), result });
}


export function routeJobExecution(input) {
  ownRecord(input, "Route job"); ownRecord(input.intent, "Route intent"); ownRecord(input.intent.options, "Edge route options");
  return normalizeRouteExecution(input.intent.options.execution);
}

export function* computeRouteJobStages(input, signal) {
  if (signal !== undefined) AbortSignal.prototype.throwIfAborted.call(signal);
  const execution = routeJobExecution(input), ledger = createRouteLedger(execution, signal), scope = { execution, ledger, signal };
  const validation = validateRouteJobStages(input, scope, true);
  input = undefined;
  const job = yield* validation;
  const effective = { ...job.input, limits: job.intent.options.limits }, options = routeNumericOptions(job.intent);
  const result = job.intent.method === "hierarchical" ? bundleHierarchicalRoutes(effective, job.hierarchy, options, signal, scope)
    : job.intent.method === "force-directed" ? bundleForceDirectedRoutes(effective, options, signal, scope)
      : job.intent.method === "density" ? bundleDensityRoutes(effective, options, signal, scope) : bundleEdgePathRoutes(effective, options, signal, scope);
  // Reserve the upcoming hash scratch before fixing its observed diagnostic.
  const scratch = routeHashScratchBytes(execution.maxBytes - ROUTE_COMPLETION_BYTES);
  ledger.reserve(scratch); ledger.release(scratch);
  const completed = cloneAndFreeze({ ...result, diagnostics: { ...result.diagnostics, ...ledger.diagnostics() } });
  const digest = yield* routeHashStages(completed, execution, ledger, ROUTE_COMPLETION_BYTES);
  ledger.check();
  return cloneAndFreeze({ schemaVersion: 2, inputHash: job.inputHash, resultHash: digest.hash, result: completed });
}
