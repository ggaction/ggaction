import { ownArray, ownRecord } from "../../../core/ownData.js";
import { rejectUnknownProperties, validateGeneratedItemLimit } from "../../../core/validation.js";
import { interpolateNumber } from "../../numeric.js";
import { MAX_PATH_COMMANDS } from "../../pathCommands.js";

// Method-specific sampling limits are stricter; common vector output shares the
// existing concrete command limit. Control polygons use the total sample guard.
export const MAX_ROUTE_POINTS = MAX_PATH_COMMANDS;

export function validateRoutePoints(points, maximum = MAX_ROUTE_POINTS) {
  if (Array.isArray(points)) validateGeneratedItemLimit(points.length, "Route points", maximum);
  ownArray(points, "Route points");
  if (points.length < 2) throw new TypeError("Route points require at least two endpoints.");
  for (const point of points) {
    ownRecord(point, "Route point");
    rejectUnknownProperties(point, ["x", "y"], "route point");
    if (!["x", "y"].every(key => Object.hasOwn(point, key) && Number.isFinite(point[key]))) throw new RangeError("Route points require own finite x and y.");
  }
  return points;
}

function lengths(points) {
  validateRoutePoints(points);
  const cumulative = [0];
  for (let index = 1; index < points.length; index++) {
    const previous = points[index - 1], point = points[index];
    const length = cumulative.at(-1) + Math.hypot(point.x - previous.x, point.y - previous.y);
    if (!Number.isFinite(length)) throw new RangeError("Route arc length must be finite.");
    cumulative.push(length);
  }
  return cumulative;
}

export function routeLength(points) { return lengths(points).at(-1); }

// Count includes both endpoints. Repeated samples contribute zero arc length.
// Every returned point is fresh, including pinned and degenerate endpoints.
export function resampleRoute(points, count) {
  if (!Number.isSafeInteger(count) || count < 2) throw new RangeError("Route sample count requires an integer of at least two.");
  validateGeneratedItemLimit(count, "Route sample count", MAX_ROUTE_POINTS);
  const cumulative = lengths(points), total = cumulative.at(-1);
  const result = [{ ...points[0] }];
  let segment = 1;
  for (let index = 1; index < count - 1; index++) {
    const distance = total * (index / (count - 1));
    while (segment < points.length - 1 && cumulative[segment] <= distance) segment++;
    const width = cumulative[segment] - cumulative[segment - 1];
    const proportion = width === 0 ? 0 : (distance - cumulative[segment - 1]) / width;
    const a = points[segment - 1], b = points[segment];
    result.push({ x: interpolateNumber(a.x, b.x, proportion), y: interpolateNumber(a.y, b.y, proportion) });
  }
  result.push({ ...points.at(-1) });
  return result;
}
