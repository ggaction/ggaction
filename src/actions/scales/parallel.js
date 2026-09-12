import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateOptionObject } from "../../core/validation.js";
import { findCoordinate } from "../../selectors/coordinates.js";
import { requireLayer } from "../../selectors/layers.js";
import { requireSemanticScale } from "../../selectors/scales.js";

const QUANTITATIVE_OPTIONS = Object.freeze([
  "type", "domain", "range", "nice", "zero", "clamp", "reverse",
  "base", "exponent", "constant", "unknown"
]);
const ORDINAL_OPTIONS = Object.freeze([
  "type", "domain", "range", "reverse", "padding", "align", "unknown"
]);
const ALL_OPTIONS = Object.freeze([
  "target", "dimension",
  ...new Set([...QUANTITATIVE_OPTIONS, ...ORDINAL_OPTIONS])
]);

function resolveParallelDimension(program, args) {
  validateOptionObject(args, ALL_OPTIONS, "editParallelScale");
  const target = validateUserId(args.target, "Parallel scale target");
  if (typeof args.dimension !== "string" || args.dimension.length === 0) {
    throw new TypeError("Parallel scale dimension must be a non-empty field string.");
  }
  const layer = requireLayer(program, target, `Parallel scale target "${target}"`);
  if (
    findCoordinate(program, layer.coordinate)?.type !== "parallel" ||
    !Array.isArray(layer.encoding?.parallel?.dimensions)
  ) {
    throw new Error(`Parallel scale target "${target}" is not a Parallel layer.`);
  }
  const matches = layer.encoding.parallel.dimensions.filter(
    dimension => dimension.field === args.dimension
  );
  if (matches.length !== 1) {
    throw new Error(
      matches.length === 0
        ? `Parallel scale target "${target}" has no dimension field "${args.dimension}".`
        : `Parallel scale dimension field "${args.dimension}" is ambiguous on target "${target}".`
    );
  }
  const dimension = matches[0];
  requireSemanticScale(program, dimension.scale);
  return dimension;
}

export const editParallelScale = action(
  {
    op: "editParallelScale",
    description: "Edit a Parallel-coordinate dimension scale by field identity."
  },
  function (args = {}) {
    const dimension = resolveParallelDimension(this, args);
    const editable = dimension.fieldType === "quantitative"
      ? QUANTITATIVE_OPTIONS
      : ORDINAL_OPTIONS;
    validateOptionObject(
      args,
      ["target", "dimension", ...editable],
      "editParallelScale"
    );
    if (!editable.some(property => Object.hasOwn(args, property))) {
      throw new Error("editParallelScale requires at least one editable property.");
    }
    const patch = Object.fromEntries(Object.entries(args).filter(
      ([property]) => !["target", "dimension"].includes(property)
    ));
    return this.editScale({ id: dimension.scale, ...patch });
  }
);
