import { canonicalJSON } from "../../core/contentDigest.js";
import { encodeValue } from "../../core/valueEncoding.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { validateGeneratedItemLimit, validateWorkLimit } from "../../core/validation.js";
import { contourGrid } from "../../grammar/contour/layout.js";
import { estimateContourDensity } from "../../grammar/contour/density.js";
import { normalizeContourDensityDefinition, contourDensityInput, contourDensityOptions } from "../../grammar/contour/input.js";
import { resolveInputReference } from "../../selectors/resources.js";
import { contourRowReferences } from "./resources.js";
import { validateContourBinding } from "../../grammar/contour/plot.js";
import { requireCoordinate } from "../../selectors/coordinates.js";

const same = (a, b) => canonicalJSON(encodeValue(a)) === canonicalJSON(encodeValue(b));
function exact(value, fields, label) {
  ownRecord(value, label);
  if (Object.keys(value).length !== fields.length || fields.some(field => !Object.hasOwn(value, field))) throw new TypeError(`${label} requires its exact stored fields.`);
}

function validateResultShape(contours, levelCount) {
  exact(contours, ["algorithm", "grid", "thresholds", "bands"], "Stored contours");
  if (contours.algorithm !== "marching-squares@1") throw new TypeError("Stored contour algorithm is invalid.");
  let work = 0;
  for (const [name, count] of [["thresholds", levelCount], ["bands", levelCount - 1]]) {
    const regions = contours[name];
    if (!Array.isArray(regions) || regions.length !== count) throw new TypeError("Stored contour region count disagrees with its thresholds.");
    ownArray(regions, "Stored contour regions");
    for (const region of regions) {
      exact(region, name === "thresholds" ? ["value", "polygons"] : ["lower", "upper", "upperInclusive", "polygons"], "Stored contour region");
      if (Array.isArray(region.polygons)) validateGeneratedItemLimit(region.polygons.length, "Stored contour polygon count");
      ownArray(region.polygons, "Stored contour polygons");
      let segments = 0;
      for (const polygon of region.polygons) {
        exact(polygon, ["outer", "holes"], "Stored contour polygon");
        if (Array.isArray(polygon.holes)) validateGeneratedItemLimit(polygon.holes.length, "Stored contour hole count");
        ownArray(polygon.holes, "Stored contour holes");
        for (const ring of [polygon.outer, ...polygon.holes]) {
          if (!Array.isArray(ring) || ring.length < 4) throw new TypeError("Stored contour rings require at least three vertices and closure.");
          validateGeneratedItemLimit(segments += ring.length - 1, "Stored contour boundary segment count");
          validateWorkLimit(work += ring.length, "Stored contour verification work");
          ownArray(ring, "Stored contour ring");
          for (const point of ring) {
            if (!Array.isArray(point) || point.length !== 2) throw new TypeError("Stored contour points require two coordinates.");
            ownArray(point, "Stored contour point");
            if (point.some(value => !Number.isFinite(value))) throw new TypeError("Stored contour coordinates must be finite.");
          }
        }
      }
    }
  }
}

function validateStored(resource) {
  const density = resource.options.source === "density";
  exact(resource.options, ["method", "source", "thresholds", ...(density ? ["definition"] : [])], "Contour options");
  if (resource.options.method !== "contour" || !["grid", "density"].includes(resource.options.source) ||
      !same(resource.ownership, { mode: "authored" }) || resource.provenance.origin !== (density ? "inferred" : "authored") ||
      resource.inputs.length !== (density ? 1 : 0) || density && resource.inputs[0].kind !== "data") throw new TypeError("Contour resource source and ownership are inconsistent.");
  exact(resource.result, ["contours", "density"], "Contour result");
  if (density) {
    if (!same(normalizeContourDensityDefinition(resource.options.definition), resource.options.definition)) throw new TypeError("Contour density options are not normalized.");
    exact(resource.result.density, ["totalWeight", "sourceCount"], "Contour density diagnostics");
    if (!Number.isFinite(resource.result.density.totalWeight) || resource.result.density.totalWeight < 0 ||
        !Number.isSafeInteger(resource.result.density.sourceCount) || resource.result.density.sourceCount < 0) throw new TypeError("Contour density diagnostics are invalid.");
  } else if (resource.result.density !== null || !same(resource.provenance.sourceRows, [])) throw new TypeError("Inline contours do not have density source diagnostics.");
  // A bounded, deterministic verification does not replace stored geometry or
  // invoke a materializer. In particular, holes and disconnected bands cannot
  // be accepted merely because their coordinates are finite.
  const expected = contourGrid(resource.result.contours.grid, resource.options.thresholds);
  validateResultShape(resource.result.contours, expected.thresholds.length);
  if (!same(expected, resource.result.contours)) {
    throw new TypeError("Stored contour geometry disagrees with its grid and thresholds.");
  }
}

function validateBindings(program, resource) {
  for (const layer of program.semanticSpec.layers) if (layer.contourBinding?.geometry.id === resource.id) {
    if (layer.mark.type !== "contour" || requireCoordinate(program, layer.coordinate).type !== "cartesian") throw new TypeError("Contour binding requires its Cartesian mark.");
    validateContourBinding(layer, program.materializationConfigs.marks[layer.id]?.contour);
  }
  if (resource.options.source !== "density") return;
  const data = resolveInputReference(program, resource.inputs[0]), definition = resource.options.definition;
  const density = estimateContourDensity(contourDensityInput(data.values, definition), contourDensityOptions(definition));
  if (!same(density.grid, resource.result.contours.grid) || !same(resource.result.density, { totalWeight: density.totalWeight, sourceCount: density.sourceCount }) ||
      !same(resource.provenance.sourceRows, contourRowReferences(data))) throw new TypeError("Stored contour density source binding is stale.");
}

export const contourResourceHandler = Object.freeze({ validateStored, validateBindings });
