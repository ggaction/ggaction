import { ownArray, ownRecord } from "../../core/ownData.js";
import { validateGeneratedItemLimit } from "../../core/validation.js";
import { geometryPosition, sameGeometryPosition, validateGeometryBBox } from "./geometry.js";

function integer(value) { return Number.isInteger(value) && value >= -2147483648 && value <= 2147483647; }

export function decodeTopology(source, coordinateKind, budget, objectName) {
  ownRecord(source, "Topology"); validateGeometryBBox(source);
  if (!Object.hasOwn(source, "type") || source.type !== "Topology") throw new TypeError("TopoJSON requires a Topology object.");
  ownRecord(source.objects, "Topology objects"); ownArray(source.arcs, "Topology arcs");
  const names = Object.keys(source.objects);
  if (objectName === undefined && names.length !== 1) throw new Error("Topology requires an explicit object when no unique object exists.");
  const object = objectName ?? names[0];
  if (typeof object !== "string" || !Object.hasOwn(source.objects, object)) throw new Error("Unknown topology object.");
  let transform;
  if (Object.hasOwn(source, "transform")) {
    ownRecord(source.transform, "Topology transform"); transform = source.transform;
    for (const key of ["scale", "translate"]) {
      ownArray(transform[key], `Topology transform ${key}`);
      if (transform[key].length !== 2 || transform[key].some(v => !Number.isFinite(v))) throw new TypeError("Topology transform requires two finite scale and translate values.");
    }
  }
  const position = (point, accumulated) => {
    ownArray(point, "Topology position");
    if (point.length < 2 || point.some(v => !Number.isFinite(v))) throw new TypeError("Topology positions require finite coordinates.");
    let result = [...point];
    if (transform) {
      if (!integer(point[0]) || !integer(point[1])) throw new TypeError("Quantized topology coordinates require signed 32-bit integers.");
      if (accumulated) {
        accumulated[0] += point[0]; accumulated[1] += point[1];
        if (!integer(accumulated[0]) || !integer(accumulated[1])) throw new RangeError("Topology delta accumulation exceeds signed 32-bit integer range.");
      }
      const xy = accumulated ?? point;
      result = [xy[0] * transform.scale[0] + transform.translate[0], xy[1] * transform.scale[1] + transform.translate[1], ...point.slice(2)];
    }
    return geometryPosition(result, coordinateKind, budget);
  };
  budget.count("arcs", source.arcs.length);
  const arcs = source.arcs.map(arc => {
    ownArray(arc, "Topology arc");
    if (arc.length < 2) throw new TypeError("Topology arcs require at least two positions.");
    const sum = [0, 0]; return arc.map(point => position(point, sum));
  });
  const stitch = refs => {
    ownArray(refs, "Topology arc references"); const result = [];
    for (const ref of refs) {
      budget.charge();
      if (!integer(ref)) throw new TypeError("Topology arc references require signed 32-bit integers.");
      const index = ref < 0 ? ~ref : ref, arc = arcs[index];
      if (arc === undefined) throw new RangeError("Topology arc reference is out of range.");
      const points = ref < 0 ? [...arc].reverse() : arc;
      if (result.length && !sameGeometryPosition(result.at(-1), points[0])) throw new Error("Topology arc junctions must match exactly.");
      const start = result.length ? 1 : 0;
      budget.count("positions", points.length - start); budget.charge(points.length);
      for (let i = start; i < points.length; i++) result.push(points[i]);
    }
    return result;
  };
  const expand = value => {
    ownRecord(value, "Topology geometry"); budget.charge(); validateGeometryBBox(value);
    if (!Object.hasOwn(value, "type")) throw new TypeError("Topology geometry requires an own type discriminator.");
    switch (value.type) {
      case null: return null;
      case "Point": return { type: value.type, coordinates: position(value.coordinates) };
      case "MultiPoint": ownArray(value.coordinates, "Topology multipoint"); return { type: value.type, coordinates: value.coordinates.map(point => position(point)) };
      case "LineString": return { type: value.type, coordinates: stitch(value.arcs) };
      case "MultiLineString": case "Polygon":
        ownArray(value.arcs, "Topology geometry arcs"); return { type: value.type, coordinates: value.arcs.map(stitch) };
      case "MultiPolygon":
        ownArray(value.arcs, "Topology polygon arcs"); return { type: value.type, coordinates: value.arcs.map(rings => {
          ownArray(rings, "Topology rings"); return rings.map(stitch);
        }) };
      case "GeometryCollection":
        ownArray(value.geometries, "Topology collection"); return { type: value.type, geometries: value.geometries.map(expand) };
      default: throw new TypeError("Unsupported topology geometry discriminator.");
    }
  };
  const selected = source.objects[object]; ownRecord(selected, "Topology selected object");
  const rows = selected.type === "GeometryCollection" ? ownArray(selected.geometries, "Topology selected geometries") : [selected];
  validateGeneratedItemLimit(rows.length, "Geometry features", budget.limits.maxFeatures);
  const features = rows.map((value, i) => ({ source: value, geometry: expand(value),
    sourcePath: selected.type === "GeometryCollection" ? ["objects", object, "geometries", i] : ["objects", object] }));
  return { features, topology: { object, arcs, references: selected, ...(transform === undefined ? {} : { transform }) } };
}
