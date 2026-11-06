import { normalizePolygonWinding } from "./options.js";
import { cloneAndFreeze } from "../../core/immutable.js";
import { ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateGeneratedItemLimit, validateWorkLimit } from "../../core/validation.js";
import { MAX_PATH_COMMANDS, MAX_DECLARED_PATH_COMMANDS } from "../pathTopology.js";
import { buildRingPathCommands } from "../pathCommands.js";
import { createGeometryBudget, snapshotGeometryJSON } from "./input.js";
import { normalizeGeometry } from "./geometry.js";
import { normalizeProjectionOptions, projectionTuple, longitudeDegrees } from "./projectionOptions.js";
import { buildProjectionMath, streamGeometryMath, sphericalMidpointInto, orientGeometryRingsMath } from "./projectionMath.js";
import { createProjectionCalculation } from "./projections.js";

function antipodal(a, b) {
  const rad = Math.PI / 180, p = a[1] * rad, q = b[1] * rad;
  return Math.sin(p) * Math.sin(q) + Math.cos(p) * Math.cos(q) * Math.cos((a[0] - b[0]) * rad) < -1 + 1e-12;
}

// Midpoint pairs are read before the next one is written.
const scratchMidpoint = [0, 0];
function lineCoordinates(points, settings, kernel, budget, count) {
  if (!points.length || settings.coordinateKind === "planar") return points;
  const result = [[...points[0]]];
  for (let index = 1; index < points.length; index++) {
    const a = points[index - 1], b = points[index]; budget.charge();
    if (settings.interpolation === "great-circle") {
      if (antipodal(a, b)) {
        if (!settings.routeHint || antipodal(a, settings.routeHint) || antipodal(settings.routeHint, b)) throw new Error("Antipodal great-circle segment requires a non-antipodal routeHint.");
        count(); result.push(settings.routeHint);
      }
      count(); result.push(b);
      continue;
    }
    const start = [longitudeDegrees(a[0]), a[1]];
    let delta = longitudeDegrees(b[0] - a[0]);
    if (delta === -180 && b[0] - a[0] > 0) delta = 180;
    // Depth-first halves, last-in first-out as before; most source segments
    // are accepted whole, so the explicit stack is built only for a split.
    let segmentA = start, segmentB = [start[0] + delta, b[1]], depth = 0, stack;
    while (true) {
      const middleX = (segmentA[0] + segmentB[0]) / 2, middleY = (segmentA[1] + segmentB[1]) / 2;
      budget.charge();
      const span = Math.max(Math.abs(segmentA[0] - segmentB[0]), Math.abs(segmentA[1] - segmentB[1]));
      const linear = kernel.forwardXY(middleX, middleY), midpoint = sphericalMidpointInto(segmentA[0], segmentA[1], segmentB[0], segmentB[1], scratchMidpoint);
      const curved = kernel.forwardXY(midpoint[0], midpoint[1]);
      const error = linear && curved ? Math.hypot(linear[0] - curved[0], linear[1] - curved[1]) : 0;
      if (span > 5 || error > kernel.options.precisionPx / 2) {
        if (depth >= 20) throw new RangeError("Geographic source-segment refinement exceeds its depth limit.");
        const middle = [middleX, middleY];
        (stack ??= []).push({ a: middle, b: segmentB, depth: depth + 1 });
        segmentB = middle; depth += 1;
        continue;
      }
      count(); result.push(segmentB);
      if (!stack?.length) break;
      ({ a: segmentA, b: segmentB, depth } = stack.pop());
    }
  }
  return result;
}

function leaves(geometry) {
  const stack = [{ geometry, sourcePath: [] }], output = [];
  while (stack.length) {
    const item = stack.pop(), g = item.geometry;
    if (g === null) continue;
    if (g.type === "GeometryCollection") {
      for (let i = g.geometries.length - 1; i >= 0; i--) stack.push({ geometry: g.geometries[i], sourcePath: [...item.sourcePath, "geometries", i] });
    } else if (["MultiPoint", "MultiLineString", "MultiPolygon"].includes(g.type)) {
      for (let i = g.coordinates.length - 1; i >= 0; i--) stack.push({ geometry: { type: g.type.slice(5), coordinates: g.coordinates[i] }, sourcePath: [...item.sourcePath, "coordinates", i] });
    } else output.push(item);
  }
  return output;
}

export function projectGeometry(geometry, projectionInput, input = {}) {
  ownRecord(input, "Geographic stream options");
  rejectUnknownProperties(input, ["coordinateKind", "interpolation", "routeHint", "maxPoints", "polygonWinding"], "geographic stream");
  const options = normalizeProjectionOptions(projectionInput), coordinateKind = input.coordinateKind;
  if (!["geographic", "planar"].includes(coordinateKind) || (coordinateKind === "planar") !== (options.type === "identity")) throw new TypeError("Geometry coordinateKind and projection type are incompatible.");
  const polygonWinding = normalizePolygonWinding(input);
  const interpolation = Object.hasOwn(input, "interpolation") ? input.interpolation : "source-segment";
  if (!["source-segment", "great-circle"].includes(interpolation) || coordinateKind === "planar" && interpolation !== "source-segment") throw new TypeError("Geometry interpolation is incompatible with its coordinate kind.");
  const maxPoints = Object.hasOwn(input, "maxPoints") ? input.maxPoints : MAX_PATH_COMMANDS;
  if (!Number.isSafeInteger(maxPoints) || maxPoints < 1 || maxPoints > MAX_DECLARED_PATH_COMMANDS) throw new RangeError("Geographic maxPoints exceeds the path command limit.");
  let routeHint;
  if (Object.hasOwn(input, "routeHint")) {
    routeHint = projectionTuple(input.routeHint, [2], "Geographic routeHint");
    if (interpolation !== "great-circle" || Math.abs(routeHint[1]) > 90) throw new TypeError("routeHint requires a geographic great-circle point.");
  }
  const settings = { coordinateKind, interpolation, routeHint }, budget = createGeometryBudget();
  const source = snapshotGeometryJSON(geometry, budget), normalized = normalizeGeometry(source, coordinateKind, budget).geometry;
  const math = buildProjectionMath(options), kernel = createProjectionCalculation(options);
  let preparedPoints = 0, outputPoints = 0, commands = 0, events = 0, bounds = null;
  const parts = [];
  const countPrepared = () => validateGeneratedItemLimit(++preparedPoints, "Geographic refined points", maxPoints);
  function acceptPoint(x, y) {
    validateWorkLimit(++events, "Geographic stream work");
    validateGeneratedItemLimit(++outputPoints, "Geographic output points", maxPoints);
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new RangeError("Geographic stream produced non-finite coordinates.");
    return [x, y];
  }
  function extend(x, y) {
    if (bounds === null) bounds = [x, y, x, y];
    else { bounds[0] = Math.min(bounds[0], x); bounds[1] = Math.min(bounds[1], y); bounds[2] = Math.max(bounds[2], x); bounds[3] = Math.max(bounds[3], y); }
  }
  function appendPart(part, sourcePath, component, index) {
    if (part.kind === "point") extend(part.point[0], part.point[1]);
    else for (const command of part.commands) if (command.op !== "Z") extend(command.x, command.y);
    parts.push({ key: [...sourcePath, component, index], sourcePath, component, ...part });
  }
  for (const leaf of leaves(normalized)) {
    const g = leaf.geometry;
    let prepared = g;
    if (g.type === "LineString") prepared = { type: g.type, coordinates: lineCoordinates(g.coordinates, settings, kernel, budget, countPrepared) };
    else if (g.type === "Polygon") prepared = { type: g.type, coordinates: g.coordinates.map(points => {
      const ring = lineCoordinates(points, settings, kernel, budget, countPrepared);
      return ring;
    }) };
    if (g.type === "Polygon" && coordinateKind === "geographic") prepared = {
      ...prepared, coordinates: orientGeometryRingsMath(prepared.coordinates, true, polygonWinding)
    };
    if (g.type === "Point") {
      const projected = kernel.forwardPoint(g.coordinates.slice(0, 2));
      if (projected.reason === "non-finite-projection") throw new RangeError("Geographic point projection overflows.");
      if (projected.point) appendPart({ kind: "point", point: acceptPoint(...projected.point) }, leaf.sourcePath, projected.component, 0);
      continue;
    }
    for (const component of math.parts) {
      let line, polygon, index = 0;
      function command() {
        validateGeneratedItemLimit(++commands, "Geographic path commands", maxPoints);
      }
      const sink = {
        point(x, y) { line.push(acceptPoint(x, y)); },
        lineStart() { line = []; },
        lineEnd() {
          if (line.length < (polygon ? 3 : 2)) return;
          if (polygon) {
            // Count each ring command and its closing Z in emission order.
            for (let i = 0; i <= line.length; i++) command();
            polygon.push(line);
          } else {
            validateGeneratedItemLimit(commands += line.length, "Geographic path commands", maxPoints);
            appendPart({ kind: "line", commands: buildRingPathCommands([line], false) }, leaf.sourcePath, component.id, index++);
          }
        },
        polygonStart() { polygon = []; },
        polygonEnd() { if (polygon.length) appendPart({ kind: "polygon", commands: buildRingPathCommands(polygon, true), fillRule: "evenodd" }, leaf.sourcePath, component.id, index++); polygon = undefined; }
      };
      streamGeometryMath(prepared, component.projection, sink);
    }
  }
  return cloneAndFreeze({ parts, bounds, diagnostics: { preparedPoints, outputPoints, commands, work: budget.diagnostics().work + events } });
}
