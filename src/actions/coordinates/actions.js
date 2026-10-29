import { action } from "../../core/action.js";
import { validateMarkClipCoordinate } from "../../selectors/markClip.js";
import { validateCoordinateType } from "../../grammar/coordinates.js";
import { validateUserId } from "../../core/identifiers.js";
import { findCoordinate } from "../../selectors/coordinates.js";
import { findLayer, hasLayer } from "../../selectors/layers.js";
import { validateOptionObject } from "../../core/validation.js";

const COORDINATE_OPTIONS = Object.freeze(["id", "type", "layers"]);

function validateOptions(args) {
  validateOptionObject(args, COORDINATE_OPTIONS, "createCoordinate");
}

export function validateCoordinateLayers(program, layers) {
  if (!Array.isArray(layers)) {
    throw new TypeError("createCoordinate layers must be an array.");
  }

  const ids = layers.map(layer => validateUserId(layer, "Layer id"));

  if (new Set(ids).size !== ids.length) {
    throw new Error("createCoordinate layers must not contain duplicates.");
  }

  for (const id of ids) {
    if (!hasLayer(program, id)) {
      throw new Error(`Unknown layer "${id}".`);
    }
  }

  return ids;
}

export function createNativeCoordinate(program, args = {}) {
  validateOptions(args);
  const id = validateUserId(args.id ?? "main", "Coordinate id");
  const type = validateCoordinateType(args.type ?? "cartesian");
  if (type === "geo") throw new TypeError("Geo coordinates require the full ChartProgram.");
  const layers = validateCoordinateLayers(program, args.layers ?? []);
  const existing = findCoordinate(program, id);

  if (existing !== undefined && existing.type !== type) {
    throw new Error(
      `Coordinate "${id}" already exists with type "${existing.type}".`
    );
  }

  for (const layerId of layers) {
    const layer = findLayer(program, layerId);
    validateMarkClipCoordinate(program, layer, program.markConfigs[layerId]?.clip, type);

    if (layer.coordinate !== undefined && layer.coordinate !== id) {
      throw new Error(
        `Layer "${layerId}" already uses coordinate "${layer.coordinate}".`
      );
    }
  }

  let next = existing === undefined
    ? program.editSemantic({
        property: `coordinate[${id}].type`,
        value: type
      })
    : program;

  for (const layerId of layers) {
    const layer = findLayer(next, layerId);

    if (layer.coordinate === undefined) {
      next = next.editSemantic({
        property: `layer[${layerId}].coordinate`,
        value: id
      });
    }
  }

  return next;
}

export const createCoordinate = /* @__PURE__ */ action(
  { op: "createCoordinate", description: "Create a semantic coordinate and attach layers to it." },
  function (args = {}) { return createNativeCoordinate(this, args); }
);

export function registerBasicCoordinateActions(ProgramClass) {
  ProgramClass.prototype.createCoordinate = createCoordinate;
}
