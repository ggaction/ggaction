import { cloneAndFreeze } from "../../../core/immutable.js";
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

// Validate a completed value without rerunning any solver. Input and result
// digests establish reproducible consistency, not cryptographic authenticity.
export function validateRouteResult(jobInput, envelope) {
  const job = validateRouteJob(jobInput), context = prepareRouteInput(job.input);
  exactRouteRecord(envelope, ["inputHash", "resultHash", "result"], "Route completion");
  if (envelope.inputHash !== job.inputHash) throw new TypeError("Route completion input is stale.");
  const result = envelope.result;
  exactRouteRecord(result, ["complete", "routes", "diagnostics", "options"], "Route result");
  if (result.complete !== true) throw new TypeError("Only complete routes can be stored.");
  exactRouteRecord(result.options, Object.keys(routeNumericOptions(job.intent)), "Route result options");
  normalizeRouteIntent(job.intent.method, { ...result.options, limits: job.intent.options.limits,
    ...(job.intent.method === "hierarchical" ? { mapping: job.intent.options.mapping } : {}) }, job.intent.coordinateSpace);
  if (routeValueHash(result.options) !== routeValueHash(routeNumericOptions(job.intent))) throw new TypeError("Route result options disagree with intent.");
  if (Array.isArray(result.routes) && result.routes.length !== context.model.edges.length) throw new TypeError("Route result membership is stale.");
  ownArray(result.routes, "Route results");
  const positions = new Map(context.positions.map(node => [node.key, node]));
  let samples = 0;
  for (const [index, route] of result.routes.entries()) {
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
    if (routeValueHash(bounds) !== routeValueHash(route.bounds)) throw new TypeError("Stored route bounds are stale.");
  }
  validateRouteProvenance(job, result, context);
  validateRouteDiagnostics(job, result, context);
  validateWorkLimit(result.diagnostics.work, "Stored route work");
  if (typeof envelope.resultHash !== "string" || envelope.resultHash !== routeValueHash(result)) throw new TypeError("Route result hash is stale.");
  return cloneAndFreeze(envelope);
}
