export { routeNodes, routeEdges, routePositions, routeCanvas } from "../../../examples/edge-routes/data.js";

// A-C follows A-B-C with 1/4 corner cuts at (135,90) and (185,90).
// Every visible endpoint is six units from its original node along that segment.
// These binary64 values retain exact renderer equivalence; independent distance
// and corner expectations below test the geometric interpretation separately.
export const routePaths = [
  [{ op: "M", x: 63.84110639798688, y: 175.39067232241575 }, { op: "L", x: 135, y: 90 }, { op: "L", x: 185, y: 90 }, { op: "L", x: 256.1588936020131, y: 175.39067232241575 }],
  [{ op: "M", x: 63.84110639798688, y: 175.39067232241575 }, { op: "L", x: 156.1588936020131, y: 64.60932767758426 }],
  [{ op: "M", x: 163.8411063979869, y: 64.60932767758425 }, { op: "L", x: 256.1588936020131, y: 175.39067232241575 }]
];

export { routeMethods } from "../../../examples/edge-routes/data.js";
import { methodCoordinates } from "./method-coordinates.js";
export function methodRoutePaths(method = "edge-path") {
  if (method === "edge-path") return routePaths;
  if (!Object.hasOwn(methodCoordinates, method)) throw new Error(`Unknown route reference method: ${method}`);
  return methodCoordinates[method].map(points => points.map(([x, y], index) => ({ op: index === 0 ? "M" : "L", x, y })));
}
