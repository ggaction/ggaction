import { cloneAndFreeze } from "../../core/immutable.js";
import { ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateUnitInterval } from "../../core/validation.js";
import { resampleRoute, routeLength, validateRoutePoints } from "../graph/routes/polyline.js";
import { interpolateNumber } from "./values.js";

export const ANIMATION_ROUTE_VERSION = "anchored-arc-length-route@1";
const fade = reason => Object.freeze({ kind: "crossfade", reason });

function endpoint(value) {
  ownRecord(value, "Animation route endpoint");
  rejectUnknownProperties(value, ["edgeKey", "sourceKey", "targetKey", "points"], "animation route endpoint");
  if (!["edgeKey", "sourceKey", "targetKey"].every(key =>
    Object.hasOwn(value, key) && typeof value[key] === "string" && value[key].length > 0)) {
    throw new TypeError("Animation routes require explicit edge and node keys.");
  }
  validateRoutePoints(value.points);
  return value;
}

// Routes already contain sampled concrete points. Graph inference and curve
// sampling stay with their existing owners and never execute on a frame tick.
export function prepareRouteInterpolation(fromInput, toInput, options = {}) {
  const from = endpoint(fromInput), to = endpoint(toInput);
  ownRecord(options, "Animation route options");
  rejectUnknownProperties(options, ["samples", "maxStretch"], "animation route options");
  const count = options.samples ?? Math.max(from.points.length, to.points.length);
  const maxStretch = options.maxStretch ?? 2;
  if (!Number.isFinite(maxStretch) || maxStretch < 1) throw new RangeError("Animation route maxStretch must be finite and at least one.");
  // Reuse the existing route sample count, point and arc-length admission.
  const source = resampleRoute(from.points, count), target = resampleRoute(to.points, count);
  const fromLength = routeLength(from.points), toLength = routeLength(to.points);
  if (from.edgeKey !== to.edgeKey || from.sourceKey !== to.sourceKey || from.targetKey !== to.targetKey) return fade("edge-identity");
  if (fromLength === 0 || toLength === 0) return fade("collapsed-route");
  const maximumLength = Math.max(fromLength, toLength) * maxStretch;
  if (!Number.isFinite(maximumLength)) throw new RangeError("Animation route stretch bound must be finite.");
  return cloneAndFreeze({ kind: "route", version: ANIMATION_ROUTE_VERSION,
    edgeKey: from.edgeKey, sourceKey: from.sourceKey, targetKey: from.targetKey,
    from: from.points, to: to.points, source, target, maximumLength });
}

function samePoint(a, b) { return Object.is(a.x, b.x) && Object.is(a.y, b.y); }

export function sampleRouteInterpolation(plan, progress, anchors) {
  validateUnitInterval(progress, "Animation route progress");
  ownRecord(plan, "Prepared animation route");
  if (plan.kind !== "route" || plan.version !== ANIMATION_ROUTE_VERSION) throw new TypeError("Animation route sampling requires a supported prepared route.");
  rejectUnknownProperties(plan, ["kind", "version", "edgeKey", "sourceKey", "targetKey", "from", "to", "source", "target", "maximumLength"], "prepared animation route");
  if (!["edgeKey", "sourceKey", "targetKey"].every(key => typeof plan[key] === "string" && plan[key].length > 0) ||
      !Number.isFinite(plan.maximumLength) || plan.maximumLength <= 0) throw new TypeError("Prepared animation route requires explicit keys and a finite positive stretch bound.");
  for (const points of [plan.from, plan.to, plan.source, plan.target]) validateRoutePoints(points);
  if (plan.source.length !== plan.target.length ||
      !samePoint(plan.from[0], plan.source[0]) || !samePoint(plan.from.at(-1), plan.source.at(-1)) ||
      !samePoint(plan.to[0], plan.target[0]) || !samePoint(plan.to.at(-1), plan.target.at(-1))) {
    throw new TypeError("Prepared animation route samples must preserve aligned endpoint anchors.");
  }
  ownRecord(anchors, "Animation route anchors");
  rejectUnknownProperties(anchors, ["source", "target"], "animation route anchors");
  validateRoutePoints([anchors.source, anchors.target]);
  if (progress === 0 || progress === 1) {
    const points = progress === 0 ? plan.from : plan.to;
    if (!samePoint(points[0], anchors.source) || !samePoint(points.at(-1), anchors.target)) throw new Error("Animation route endpoint anchors disagree with the exact endpoint.");
    return cloneAndFreeze({ kind: "route", points });
  }
  const at = (a, b) => ({ x: interpolateNumber(a.x, b.x, progress), y: interpolateNumber(a.y, b.y, progress) });
  const first = at(plan.source[0], plan.target[0]), last = at(plan.source.at(-1), plan.target.at(-1));
  const sourceDelta = { x: anchors.source.x - first.x, y: anchors.source.y - first.y };
  const targetDelta = { x: anchors.target.x - last.x, y: anchors.target.y - last.y };
  if (![sourceDelta.x, sourceDelta.y, targetDelta.x, targetDelta.y].every(Number.isFinite)) return fade("nonfinite-route");
  const points = plan.source.map((point, index) => {
    const sampled = at(point, plan.target[index]), u = index / (plan.source.length - 1);
    return { x: sampled.x + interpolateNumber(sourceDelta.x, targetDelta.x, u),
      y: sampled.y + interpolateNumber(sourceDelta.y, targetDelta.y, u) };
  });
  points[0] = { ...anchors.source }; points[points.length - 1] = { ...anchors.target };
  if (points.some(point => !Number.isFinite(point.x) || !Number.isFinite(point.y))) return fade("nonfinite-route");
  let length;
  try { length = routeLength(points); } catch { return fade("nonfinite-route"); }
  if (length === 0) return fade("collapsed-route");
  if (length > plan.maximumLength) return fade("route-stretch");
  return cloneAndFreeze({ kind: "route", points });
}
