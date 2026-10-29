import { validateGeneratedItemLimit, validateWorkLimit } from "../../core/validation.js";
import { circleGeometryMath } from "./projectionMath.js";

export function validateGeoMarkGeometry(geometry, binding) {
  if (geometry === null) return null;
  const stack = [geometry]; let work = 0;
  while (stack.length) {
    const value = stack.pop(); validateWorkLimit(++work, "Geographic mark geometry work");
    if (value === null) continue;
    if (value.type === "GeometryCollection") { for (const member of value.geometries) stack.push(member); continue; }
    const expected = binding.mode === "point" ? ["Point", "MultiPoint"] : ["LineString", "MultiLineString"];
    if (binding.mode !== "shape" && !expected.includes(value.type)) throw new TypeError("Geometry type is incompatible with the geographic mark mode.");
  }
  return geometry;
}

export function geoMarkGeometry(geometry, binding, parameters) {
  validateGeoMarkGeometry(geometry, binding);
  if (geometry === null) return null;
  const radius = binding.radiusDeg; let work = 0;
  if (radius === undefined) return geometry;
  const precision = Math.min(2, Math.max(.01, Math.sqrt(parameters.precisionPx / parameters.scalePx) * 180 / Math.PI));
  let circlePoints = 0;
  const circle = point => {
    validateGeneratedItemLimit(circlePoints += Math.ceil(360 / precision) + 2, "Geographic circle points");
    return circleGeometryMath(point.slice(0, 2), radius, precision);
  };
  const output = {}, pending = [{ source: geometry, target: output }];
  while (pending.length) {
    const { source, target } = pending.pop(); validateWorkLimit(++work, "Geographic circle work");
    if (source.type === "GeometryCollection") {
      target.type = source.type; target.geometries = source.geometries.map(member => member === null ? null : ({}));
      for (let index = 0; index < source.geometries.length; index++) if (source.geometries[index] !== null) pending.push({ source: source.geometries[index], target: target.geometries[index] });
    } else if (source.type === "Point") Object.assign(target, circle(source.coordinates));
    else {
      target.type = "MultiPolygon";
      target.coordinates = source.coordinates.map(point => circle(point).coordinates);
    }
  }
  return output;
}
