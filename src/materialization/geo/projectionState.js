import { geoLabelSource, validateGeoLabelBinding } from "./labels.js";
import { geoScaleValues } from "./appearance.js";
import { resolveGeoMark } from "./mark.js";
import { ownRecord } from "../../core/ownData.js";
import { canonicalJSON } from "../../core/contentDigest.js";
import { encodeValue } from "../../core/valueEncoding.js";
import { normalizeProjectionDefinition, projectionParameters } from "../../grammar/geo/projectionDefinition.js";
import { normalizeProjectionOptions, projectionTuple } from "../../grammar/geo/projectionOptions.js";
import { resolveInputReference } from "../../selectors/resources.js";
import { createProjectionResource } from "./projectionResource.js";
import { conditionalValues } from "../../grammar/conditionalState.js";

const same = (a, b) => canonicalJSON(encodeValue(a)) === canonicalJSON(encodeValue(b));
function validateStored(resource) {
  if (!same(resource.options, normalizeProjectionDefinition(resource.options)) || !same(resource.ownership, { mode: "authored" }) ||
      !same(resource.provenance, { origin: "authored", sourceRows: [] })) throw new TypeError("Stored projection definition is inconsistent.");
  ownRecord(resource.result, "Projection result");
  const fitted = resource.options.fit !== undefined, keys = fitted ? ["scalePx", "translatePx", "bounds"] : [];
  if (Object.keys(resource.result).length !== keys.length || keys.some(key => !Object.hasOwn(resource.result, key)) ||
      resource.inputs.length !== (fitted ? 1 : 0) || fitted && resource.inputs[0].kind !== "geometry") throw new TypeError("Stored projection requires exact fit result and geometry input fields.");
  normalizeProjectionOptions(projectionParameters(resource));
  if (fitted && resource.result.bounds !== null) {
    const [x0, y0, x1, y1] = projectionTuple(resource.result.bounds, [4], "Projection fit bounds");
    if (x0 > x1 || y0 > y1) throw new TypeError("Projection fit bounds must be ordered.");
  }
}
function validateBindings(program, resource) {
  if (resource.options.fit !== undefined) {
    const expected = createProjectionResource({ id: resource.id, revision: resource.revision, options: resource.options,
      geometry: resolveInputReference(program, resource.inputs[0]), input: ref => resolveInputReference(program, ref) });
    if (!same(resource.result, expected.result)) throw new TypeError("Stored projection fit disagrees with its geometry and options.");
  }
  const coordinates = new Set(program.semanticSpec.coordinates.filter(coordinate => coordinate.type === "geo" && coordinate.projection.id === resource.id).map(coordinate => coordinate.id));
  for (const layer of program.semanticSpec.layers) if (coordinates.has(layer.coordinate)) {
    if (geoLabelSource(program, layer) !== undefined) { validateGeoLabelBinding(program, layer); continue; }
    resolveGeoMark(program, layer, program.materializationConfigs.marks[layer.id]?.geo, program.resolvedScales, { appearance: false });
    const bindings = [...Object.entries(layer.encoding ?? {}), ...Object.entries(layer.conditionals ?? {})
      .flatMap(([channel, definition]) => conditionalValues(definition).filter(value => value.scale !== undefined).map(value => [channel, value]))];
    for (const [channel, encoding] of bindings) {
      if (program.resolvedScales[encoding.scale] === undefined) throw new TypeError("Stored geographic mapping requires a resolved scale.");
      geoScaleValues(program, { layer, encoding, channel });
    }
  }
}

export const projectionResourceHandler = Object.freeze({ validateStored, validateBindings });
