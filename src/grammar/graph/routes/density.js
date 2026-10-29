import { cloneAndFreeze } from "../../../core/immutable.js";
import { ownRecord } from "../../../core/ownData.js";
import { rejectUnknownProperties, validateGeneratedItemLimit } from "../../../core/validation.js";
import { prepareRouteInput, finalizeRouteResult } from "./common.js";
import { routeLength, resampleRoute } from "./polyline.js";
import { routeDensitySamples, createRouteDensityField, advectDensityRoute } from "./densityField.js";

const GRID_SIZE = 256, ITERATIONS = 20, STEP = 0.005, MAX_EDGE_SAMPLES = 4096;
const bandwidthAt = iteration => Math.max(2 / GRID_SIZE, 0.05 * 0.9 ** iteration);

export function normalizeDensityRouteOptions(input = {}) {
  ownRecord(input, "Density route options");
  rejectUnknownProperties(input, ["zeroLength"], "density route options");
  const zeroLength = input.zeroLength === undefined ? "point" : input.zeroLength;
  if (zeroLength !== "point") throw new TypeError("Density zeroLength must be point.");
  return Object.freeze({ zeroLength });
}

function resampleDensityRoutes(routes, bandwidth, budget, heldSamples = 0) {
  const spacing = Math.min(bandwidth / 4, 1 / GRID_SIZE);
  const counts = routes.map(points => Math.max(2, Math.ceil(routeLength(points) / spacing) + 1));
  let total = 0;
  for (const count of counts) { validateGeneratedItemLimit(count, "Density edge samples", MAX_EDGE_SAMPLES); total += count; }
  budget.samples(heldSamples + routes.reduce((sum, points) => sum + points.length, 0) + total); budget.charge(total);
  return routes.map((points, index) => resampleRoute(points, counts[index]));
}

function densityBounds(samples, bandwidth) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const { x, y } of samples) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  const side = Math.max(1, maxX - minX, maxY - minY);
  return { x: (minX + maxX - side) / 2 - bandwidth, y: (minY + maxY - side) / 2 - bandwidth, width: side + 2 * bandwidth, height: side + 2 * bandwidth };
}

export function bundleDensityRoutes(input, optionsInput = {}, signal) {
  const options = normalizeDensityRouteOptions(optionsInput), context = prepareRouteInput(input, signal);
  let routes = context.edges.map(edge => [edge.source, edge.target]);
  const active = routes.some(points => routeLength(points) > 0), schedule = [];
  if (active) {
    routes = resampleDensityRoutes(routes, bandwidthAt(0), context.budget);
    for (let iteration = 0; iteration < ITERATIONS; iteration++) {
      context.budget.check();
      const bandwidth = bandwidthAt(iteration), sampleCount = routes.reduce((sum, points) => sum + points.length, 0);
      // Include old/new routes, weighted samples, smoothing and resampling buffers.
      context.budget.samples(sampleCount * 6 + context.edges.length * 2); context.budget.charge(sampleCount * 24);
      const samples = routes.map(routeDensitySamples), flat = samples.flat();
      const fieldBudget = { charge: context.budget.charge, samples: count => context.budget.samples(count + flat.length * 5 + context.edges.length * 2) };
      const field = createRouteDensityField(flat, densityBounds(flat, bandwidth), { bandwidth, size: GRID_SIZE, directed: context.model.directed }, fieldBudget);
      routes = resampleDensityRoutes(routes.map((points, index) => advectDensityRoute(points, samples[index], field, STEP)), bandwidth, context.budget, field.cells.size + flat.length * 3 + context.edges.length * 2);
      schedule.push({ iteration, bandwidth, fieldCells: field.cells.size, samples: routes.reduce((sum, points) => sum + points.length, 0) });
    }
  }
  const result = finalizeRouteResult(context, "density-v1", context.edges.map((edge, index) => ({ edgeKey: edge.key, points: routes[index], ...(edge.source.x === edge.target.x && edge.source.y === edge.target.y ? { reason: "zero-length" } : {}) })));
  return cloneAndFreeze({ ...result, options, diagnostics: { ...result.diagnostics, gridSize: GRID_SIZE, step: STEP, iterations: schedule.length, schedule } });
}
