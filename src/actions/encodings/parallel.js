import { action } from "../../core/action.js";
import { validateOptionObject } from "../../core/validation.js";
import {
  normalizeParallelDimensions,
  validateParallelKeyField,
  validateParallelMissingPolicy,
  validateParallelRows
} from "../../grammar/parallelCoordinates.js";
import { resolvePositionScaleDefinition } from "../scales/definitions.js";
import {
  applyEncodingScale,
  resolveTarget,
  setEncodingProperties
} from "./shared.js";
import { resolveParallelCoordinate } from "../coordinates/parallel.js";

const OPTIONS = Object.freeze([
  "target", "coordinate", "dimensions", "key", "missing"
]);

export const encodeParallelCoordinates = action(
  {
    op: "encodeParallelCoordinates",
    description: "Atomically encode ordered Parallel-coordinate dimensions."
  },
  function (args = {}) {
    validateOptionObject(args, OPTIONS, "encodeParallelCoordinates");
    const { id: target, dataset, layer } = resolveTarget(
      this,
      args.target,
      ["line"],
      "line mark"
    );
    if (
      ["x", "y", "theta", "radius"].some(
        channel => layer.encoding?.[channel] !== undefined
      )
    ) {
      throw new Error(
        `Parallel encoding cannot mix with existing position encodings on layer "${target}".`
      );
    }
    const coordinate = resolveParallelCoordinate(this, {
      requested: args.coordinate,
      layer,
      operation: "encodeParallelCoordinates"
    });
    const dimensions = normalizeParallelDimensions(
      dataset.values,
      args.dimensions,
      target
    );
    const key = args.key === undefined
      ? undefined
      : validateParallelKeyField(args.key);
    const missing = validateParallelMissingPolicy(args.missing ?? "break");
    validateParallelRows(dataset.values, dimensions, { key, missing });

    const definitions = dimensions.map(dimension =>
      resolvePositionScaleDefinition(
        this,
        "y",
        dimension.fieldType,
        { ...dimension.scaleOptions, id: dimension.scale },
        dimension.fieldType === "ordinal" ? { discreteType: "point" } : {}
      )
    );
    const storedDimensions = dimensions.map(({ scaleOptions, ...dimension }) => {
      void scaleOptions;
      return dimension;
    });

    let next = this;
    if (coordinate.create) {
      next = next.createCoordinate({ id: coordinate.id, type: "parallel" });
    }
    if (layer.coordinate === undefined) {
      next = next.editSemantic({
        property: `layer[${target}].coordinate`,
        value: coordinate.id
      });
    }
    next = setEncodingProperties(next, target, "parallel", {
      dimensions: storedDimensions,
      missing
    });
    if (key === undefined && layer.encoding?.parallel?.key !== undefined) {
      next = next.editSemantic({
        property: `layer[${target}].encoding.parallel.key`,
        remove: true
      });
    } else if (key !== undefined) {
      next = next.editSemantic({
        property: `layer[${target}].encoding.parallel.key`,
        value: key
      });
    }
    for (let index = 0; index < definitions.length; index += 1) {
      next = applyEncodingScale(next, definitions[index], dimensions[index].scaleOptions);
    }
    for (const definition of definitions) {
      next = next.rematerializeScale({
        id: definition.id,
        guides: false,
        marks: false
      });
    }
    return next.rematerializeLineMark({ id: target, scales: false });
  }
);

export function registerParallelEncodingAction(ProgramClass) {
  ProgramClass.prototype.encodeParallelCoordinates = encodeParallelCoordinates;
}
