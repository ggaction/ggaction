import { normalizePolygonWinding } from "./options.js";
import { cloneAndFreeze } from "../../core/immutable.js";
import { ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties } from "../../core/validation.js";
import { createGeometryBudget, snapshotGeometryJSON } from "./input.js";
import { normalizeGeometry } from "./geometry.js";
import { centroidGeometryMath } from "./projectionMath.js";

// A source-space feature anchor. Projection and current detail representations
// never participate in deciding which semantic point the feature denotes.
export function geometryCentroid(value, options) {
  ownRecord(options, "Geometry centroid options");
  rejectUnknownProperties(options, ["coordinateKind", "polygonWinding"], "geometry centroid");
  if (!["planar", "geographic"].includes(options.coordinateKind)) throw new TypeError("Geometry centroid requires explicit coordinateKind.");
  const polygonWinding = normalizePolygonWinding(options);
  const budget = createGeometryBudget();
  const { geometry, drawable } = normalizeGeometry(snapshotGeometryJSON(value, budget), options.coordinateKind, budget);
  if (!drawable) return null;
  const point = centroidGeometryMath(geometry, options.coordinateKind === "geographic", polygonWinding);
  if (point.length !== 2 || point.some(component => !Number.isFinite(component))) throw new RangeError("Geometry has no unique finite centroid.");
  return cloneAndFreeze(point);
}
