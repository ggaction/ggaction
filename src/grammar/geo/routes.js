import { cloneAndFreeze } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties } from "../../core/validation.js";
import { createGeometryBudget } from "./input.js";
import { normalizeGeometry } from "./geometry.js";

export function normalizeGeoRouteOptions(input) {
  ownRecord(input, "Geographic route options");
  rejectUnknownProperties(input, ["coordinateKind"], "geographic route options");
  if (!Object.hasOwn(input, "coordinateKind") || !["geographic", "planar"].includes(input.coordinateKind)) {
    throw new TypeError("Geographic routes require an explicit geographic or planar coordinateKind.");
  }
  return Object.freeze({ method: "geo-routes", coordinateKind: input.coordinateKind });
}

// Interpret retained samples only. Projection, date-line splitting and any
// requested great-circle interpolation remain the native GeoLine owner's work.
export function routeGeometryFeatures(routes, coordinateKind) {
  normalizeGeoRouteOptions({ coordinateKind });
  const budget = createGeometryBudget(), keys = new Set();
  if (Array.isArray(routes)) budget.count("features", routes.length);
  ownArray(routes, "Geographic routes");
  let positions = 0;
  const features = routes.map((route, index) => {
    ownRecord(route, "Geographic route");
    if (!Object.hasOwn(route, "edgeKey") || typeof route.edgeKey !== "string" || !route.edgeKey || keys.has(route.edgeKey)) {
      throw new TypeError("Geographic routes require unique retained edge keys.");
    }
    keys.add(route.edgeKey); budget.charge(route.edgeKey.length);
    if (!Object.hasOwn(route, "commands")) throw new TypeError("Geographic routes require retained commands.");
    const commands = route.commands;
    if (Array.isArray(commands) && (commands.length < 2 || (positions += commands.length) > budget.limits.maxPositions)) throw new RangeError("Geographic route positions exceed the supported sample range.");
    ownArray(commands, "Geographic route commands");
    const coordinates = commands.map((command, position) => {
      ownRecord(command, "Geographic route command");
      if (Object.keys(command).length !== 3 || !["op", "x", "y"].every(key => Object.hasOwn(command, key)) ||
          command.op !== (position === 0 ? "M" : "L")) throw new TypeError("Geographic routes require exact sampled M/L commands.");
      budget.charge();
      return [command.x, command.y];
    });
    return { properties: { edgeKey: route.edgeKey }, sourcePath: ["routes", index],
      ...normalizeGeometry({ type: "LineString", coordinates }, coordinateKind, budget) };
  });
  return cloneAndFreeze({ features, diagnostics: budget.diagnostics() });
}
