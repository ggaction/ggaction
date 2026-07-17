import { action } from "../../core/action.js";
import { validateCoordinateType } from "../../grammar/coordinates.js";
import { validateUserId } from "../../core/identifiers.js";
import { findCoordinate } from "../../selectors/coordinates.js";
import { findLayer, hasLayer } from "../../selectors/layers.js";
import { validateOptionObject } from "../../core/validation.js";

const COORDINATE_OPTIONS = Object.freeze(["id", "type", "layers"]);

function validateOptions(args) {
  validateOptionObject(args, COORDINATE_OPTIONS, "createCoordinate");
}

function validateLayers(program, layers) {
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

export const createCoordinate = action(
  {
    op: "createCoordinate",
    description: "Create a semantic coordinate and attach layers to it."
  },
  function (args = {}) {
    validateOptions(args);
    const id = validateUserId(args.id ?? "main", "Coordinate id");
    const type = validateCoordinateType(args.type ?? "cartesian");
    const layers = validateLayers(this, args.layers ?? []);
    const existing = findCoordinate(this, id);

    if (existing !== undefined && existing.type !== type) {
      throw new Error(
        `Coordinate "${id}" already exists with type "${existing.type}".`
      );
    }

    for (const layerId of layers) {
      const layer = findLayer(this, layerId);

      if (layer.coordinate !== undefined && layer.coordinate !== id) {
        throw new Error(
          `Layer "${layerId}" already uses coordinate "${layer.coordinate}".`
        );
      }
    }

    let program = existing === undefined
      ? this.editSemantic({
          property: `coordinate[${id}].type`,
          value: type
        })
      : this;

    for (const layerId of layers) {
      const layer = findLayer(program, layerId);

      if (layer.coordinate === undefined) {
        program = program.editSemantic({
          property: `layer[${layerId}].coordinate`,
          value: id
        });
      }
    }

    return program;
  }
);
