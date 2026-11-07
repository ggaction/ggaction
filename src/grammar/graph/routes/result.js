import { createRouteLedger } from "./execution.js";
import { routeHashStages, finishRouteStages, ROUTE_COMPLETION_BYTES } from "./valueHash.js";
import { cloneAndFreeze, isOwned } from "../../../core/immutable.js";
import { ownArray, ownRecord } from "../../../core/ownData.js";
import { validateWorkLimit } from "../../../core/validation.js";
import { resolvePathCommandBounds } from "../../pathGeometry.js";
import { prepareRouteInput } from "./common.js";
import { MAX_ROUTE_POINTS, validateRoutePoints } from "./polyline.js";
import { validateRouteJob, routeValueHash } from "./job.js";
import { normalizeRouteIntent, routeNumericOptions } from "./options.js";
import { validateRouteDiagnostics, validateRouteProvenance } from "./resultProvenance.js";

export function exactRouteRecord(value, keys, label) {
  ownRecord(value, label);
  if (Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) throw new TypeError(`${label} requires its exact stored fields.`);
}
const samePoint = (a, b) => Object.is(a.x, b.x) && Object.is(a.y, b.y);
const BOUND_KEYS = ["left", "right", "top", "bottom"];

// Routes checked, and their sampled points, between two host turns.
const GEOMETRY_STAGE_ROUTES = 256, GEOMETRY_STAGE_SAMPLES = 32_768;

// Validate a completed value without rerunning any solver. Input and result
// digests establish reproducible consistency, not cryptographic authenticity.
// Every check runs in order. The stages yield between route batches only when
// the routes are already deeply owned, so nothing they read can change while
// suspended; a received completion is checked in one turn before its snapshot.
function* validateRouteGeometryStages(job, envelope, scope) {
  const bounded = job.schemaVersion === 2;
  const context = prepareRouteInput(bounded ? { ...job.input, limits: job.intent.options.limits } : job.input,
    scope?.signal, bounded ? scope ?? { execution: job.intent.options.execution } : scope === undefined ? undefined : { ledger: scope.ledger });
  exactRouteRecord(envelope, [...(bounded ? ["schemaVersion"] : []), "inputHash", "resultHash", "result"], "Route completion");
  if (bounded && envelope.schemaVersion !== 2) throw new TypeError("Route completion requires schemaVersion 2.");
  if (envelope.inputHash !== job.inputHash) throw new TypeError("Route completion input is stale.");
  const result = envelope.result;
  exactRouteRecord(result, ["complete", "routes", "diagnostics", "options"], "Route result");
  if (result.complete !== true) throw new TypeError("Only complete routes can be stored.");
  exactRouteRecord(result.options, Object.keys(routeNumericOptions(job.intent)), "Route result options");
  normalizeRouteIntent(job.intent.method, { ...result.options, limits: job.intent.options.limits,
    ...(job.intent.method === "hierarchical" ? { mapping: job.intent.options.mapping } : {}),
    ...(bounded ? { execution: job.intent.options.execution } : {}) }, job.intent.coordinateSpace);
  if (routeValueHash(result.options) !== routeValueHash(routeNumericOptions(job.intent))) throw new TypeError("Route result options disagree with intent.");
  if (Array.isArray(result.routes) && result.routes.length !== context.model.edges.length) throw new TypeError("Route result membership is stale.");
  ownArray(result.routes, "Route results");
  const positions = new Map(context.positions.map(node => [node.key, node]));
  const stable = isOwned(result.routes);
  if (stable) yield;
  let samples = 0, batch = 0;
  for (const [index, route] of result.routes.entries()) {
    if (stable && index > 0 && (index % GEOMETRY_STAGE_ROUTES === 0 || samples - batch >= GEOMETRY_STAGE_SAMPLES)) { batch = samples; yield; }
    exactRouteRecord(route, ["edgeKey", "sourceKey", "targetKey", "controlPoints", "commands", "bounds", "provenance"], "Stored edge route");
    const edge = context.model.edges[index];
    if (route.edgeKey !== edge.key || route.sourceKey !== edge.sourceKey || route.targetKey !== edge.targetKey) throw new TypeError("Route key, endpoints or order are stale.");
    validateRoutePoints(route.controlPoints, context.budget.limits.maxSamples);
    if (Array.isArray(route.commands) && (route.commands.length < 2 || route.commands.length > MAX_ROUTE_POINTS)) throw new RangeError("Route commands exceed the supported sample range.");
    ownArray(route.commands, "Route commands");
    samples += route.controlPoints.length + route.commands.length;
    context.budget.samples(samples); context.budget.charge(route.controlPoints.length + route.commands.length);
    route.commands.forEach((command, position) => {
      exactRouteRecord(command, ["op", "x", "y"], "Route command");
      if (command.op !== (position === 0 ? "M" : "L") || !Number.isFinite(command.x) || !Number.isFinite(command.y)) throw new TypeError("Stored routes require finite sampled M/L commands.");
    });
    for (const points of [route.controlPoints, route.commands]) {
      if (!samePoint(points[0], positions.get(edge.sourceKey)) || !samePoint(points.at(-1), positions.get(edge.targetKey))) throw new TypeError("Stored route endpoints must preserve exact node anchors.");
    }
    exactRouteRecord(route.bounds, ["left", "right", "top", "bottom"], "Route bounds");
    const bounds = resolvePathCommandBounds(route.commands);
    // Computed bounds are four numbers, and the stored record has exactly these
    // own data fields. Equal number encodings are exactly Object.is, and a
    // non-number stored value is stale without reading anything inside it.
    if (!BOUND_KEYS.every(key => typeof route.bounds[key] === "number" && Object.is(route.bounds[key], bounds[key]))) throw new TypeError("Stored route bounds are stale.");
  }
  validateRouteProvenance(job, result, context);
  validateRouteDiagnostics(job, result, context);
  if (!bounded) validateWorkLimit(result.diagnostics.work, "Stored route work");
  return result;
}

export function validateRouteResult(jobInput, envelope, scope) {
  const job = validateRouteJob(jobInput);
  if (job.schemaVersion === 2) return finishRouteStages(validateRouteResultStages(job, envelope, scope));
  const result = finishRouteStages(validateRouteGeometryStages(job, envelope, scope));
  if (typeof envelope.resultHash !== "string" || envelope.resultHash !== routeValueHash(result)) throw new TypeError("Route result hash is stale.");
  return cloneAndFreeze(envelope);
}


export function* validateRouteResultStages(jobInput, envelope, scope) {
  const job = validateRouteJob(jobInput);
  if (job.schemaVersion !== 2) throw new TypeError("Asynchronous route validation requires schemaVersion 2.");
  const execution = job.intent.options.execution, ledger = scope?.ledger ?? createRouteLedger(execution, scope?.signal);
  yield* validateRouteGeometryStages(job, envelope, { execution, ledger, signal: scope?.signal });
  if (typeof envelope.resultHash !== "string" || !/^[a-f0-9]{64}$/.test(envelope.resultHash)) throw new TypeError("Route result hash is stale.");
  const checked = cloneAndFreeze(envelope);
  jobInput = undefined; envelope = undefined;
  // Worker counters are checked before contributing to the request ledger.
  if (scope?.includeComputation !== false) { ledger.charge(checked.result.diagnostics.work); ledger.pairs(checked.result.diagnostics.candidatePairs); }
  ledger.samples(checked.result.diagnostics.peakSamples);
  ledger.reserve(checked.result.diagnostics.peakBufferBytes); ledger.release(checked.result.diagnostics.peakBufferBytes);
  const digest = yield* routeHashStages(checked.result, execution, ledger, ROUTE_COMPLETION_BYTES);
  if (checked.resultHash !== digest.hash) throw new TypeError("Route result hash is stale.");
  ledger.check(); return checked;
}
