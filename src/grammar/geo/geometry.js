import { ownArray, ownRecord } from "../../core/ownData.js";

export function validateGeometryBBox(value) {
  if (!Object.hasOwn(value, "bbox")) return;
  ownArray(value.bbox, "Geometry bbox");
  if (value.bbox.length < 4 || value.bbox.length % 2 !== 0 || value.bbox.some(component => !Number.isFinite(component))) {
    throw new TypeError("Geometry bbox requires finite minimum/maximum coordinate pairs.");
  }
}

export function geometryPosition(value, coordinateKind, budget) {
  ownArray(value, "Geometry position");
  if (value.length < 2 || value.some(component => !Number.isFinite(component))) throw new TypeError("Geometry positions require at least two finite coordinates.");
  if (coordinateKind === "geographic" && Math.abs(value[1]) > 90) throw new RangeError("Geographic latitude must be between -90 and 90 degrees.");
  budget.count("positions"); budget.charge(value.length);
  return [...value];
}

export function sameGeometryPosition(a, b) {
  return a.length === b.length && a.every((value, i) => value === b[i]);
}

function line(value, coordinateKind, budget, ring) {
  ownArray(value, "Geometry line coordinates");
  if (ring ? value.length < 4 : value.length !== 0 && value.length < 2) throw new TypeError(ring ? "Geometry rings require at least four positions." : "Geometry lines require zero or at least two positions.");
  const result = value.map(p => geometryPosition(p, coordinateKind, budget));
  if (result.some(p => p.length !== result[0].length)) throw new TypeError("Geometry lines require consistent coordinate dimensions.");
  if (ring && !sameGeometryPosition(result[0], result.at(-1))) throw new TypeError("Geometry rings must be closed without automatic repair.");
  return result;
}

export function normalizeGeometry(value, coordinateKind, budget) {
  if (value === null) return { geometry: null, drawable: false };
  ownRecord(value, "Geometry"); budget.charge(); validateGeometryBBox(value);
  if (!Object.hasOwn(value, "type")) throw new TypeError("Geometry requires an own type discriminator.");
  if (Object.hasOwn(value, "crs")) throw new TypeError("Geometry CRS members are unsupported; declare coordinateKind explicitly.");
  if (value.type === "GeometryCollection") {
    ownArray(value.geometries, "Geometry collection");
    const children = value.geometries.map(geometry => normalizeGeometry(geometry, coordinateKind, budget));
    return { geometry: { type: value.type, geometries: children.map(child => child.geometry) }, drawable: children.some(child => child.drawable) };
  }
  let coordinates;
  switch (value.type) {
    case "Point": coordinates = geometryPosition(value.coordinates, coordinateKind, budget); break;
    case "MultiPoint":
      ownArray(value.coordinates, "Geometry multipoint"); coordinates = value.coordinates.map(p => geometryPosition(p, coordinateKind, budget)); break;
    case "LineString": coordinates = line(value.coordinates, coordinateKind, budget, false); break;
    case "MultiLineString":
      ownArray(value.coordinates, "Geometry multiline"); coordinates = value.coordinates.map(points => line(points, coordinateKind, budget, false)); break;
    case "Polygon":
      ownArray(value.coordinates, "Geometry polygon"); coordinates = value.coordinates.map(points => line(points, coordinateKind, budget, true)); break;
    case "MultiPolygon":
      ownArray(value.coordinates, "Geometry multipolygon"); coordinates = value.coordinates.map(rings => {
        ownArray(rings, "Geometry polygon"); return rings.map(points => line(points, coordinateKind, budget, true));
      }); break;
    default: throw new TypeError("Unsupported geometry discriminator.");
  }
  const drawable = value.type === "Point" || (value.type === "MultiPolygon" ? coordinates.some(rings => rings.length > 0)
    : value.type === "MultiLineString" ? coordinates.some(points => points.length > 0) : coordinates.length > 0);
  return { geometry: { type: value.type, coordinates }, drawable };
}
