import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import {
  validateNonEmptyString,
  validateOptionObject
} from "../../core/validation.js";
import { readQuantitativeField } from "../../grammar/scales/index.js";
import { validatePathOrderDirection } from "../../grammar/pathOrder.js";
import {
  assertPathOrderCompatible,
  pathOrderCompatibility
} from "../../materialization/marks/pathOrder.js";
import {
  canMaterializeArea,
  canMaterializeLine
} from "../../materialization/marks/index.js";
import { findLayer } from "../../selectors/layers.js";

const ENCODE_OPTIONS = Object.freeze([
  "target", "field", "fieldType", "order"
]);
const REMOVE_OPTIONS = Object.freeze(["target"]);

function resolvePathOrderLayer(program, target, { active = false } = {}) {
  const requested = target === undefined
    ? undefined
    : validateUserId(target, "Path order target");
  if (requested !== undefined) {
    const layer = findLayer(program, requested);
    if (layer === undefined) {
      throw new Error(`Unknown path order target "${requested}".`);
    }
    if (active && layer.encoding?.pathOrder === undefined) {
      throw new Error(`Mark "${requested}" has no path order encoding.`);
    }
    assertPathOrderCompatible(
      program,
      layer,
      active ? "removePathOrder" : "encodePathOrder"
    );
    return layer;
  }
  const pathLayers = program.semanticSpec.layers.filter(layer =>
    ["line", "area"].includes(layer.mark?.type)
  );
  const candidates = pathLayers.filter(layer =>
    pathOrderCompatibility(program, layer).compatible &&
    (!active || layer.encoding?.pathOrder !== undefined)
  );
  const current = candidates.find(
    layer => layer.id === program.context.currentMark
  );
  if (current !== undefined) return current;
  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1) {
    throw new Error("path order target is ambiguous; provide target.");
  }
  if (!active && pathLayers.length === 1) {
    assertPathOrderCompatible(program, pathLayers[0], "encodePathOrder");
  }
  if (active && pathLayers.length === 1) {
    throw new Error(`Mark "${pathLayers[0].id}" has no path order encoding.`);
  }
  throw new Error("path order requires an eligible layer.");
}

function rematerializePath(program, layer) {
  if (layer.mark.type === "line") {
    return canMaterializeLine(program, layer)
      ? program.rematerializeLineMark({ id: layer.id })
      : program;
  }
  return canMaterializeArea(program, layer)
    ? program.rematerializeAreaMark({ id: layer.id })
    : program;
}

const encodePathOrder = action(
  {
    op: "encodePathOrder",
    description: "Order vertices within each Cartesian path series."
  },
  function (args = {}) {
    validateOptionObject(args, ENCODE_OPTIONS, "encodePathOrder");
    const field = validateNonEmptyString(args.field, "Path order field");
    const fieldType = args.fieldType ?? "quantitative";
    if (fieldType !== "quantitative") {
      throw new Error("encodePathOrder requires a quantitative field.");
    }
    const order = validatePathOrderDirection(args.order ?? "ascending");
    const layer = resolvePathOrderLayer(this, args.target);
    const dataset = assertPathOrderCompatible(this, layer, "encodePathOrder");
    readQuantitativeField(dataset.values, field);

    const next = this
      .editSemantic({
        property: `layer[${layer.id}].encoding.pathOrder.field`,
        value: field
      })
      .editSemantic({
        property: `layer[${layer.id}].encoding.pathOrder.fieldType`,
        value: fieldType
      })
      .editSemantic({
        property: `layer[${layer.id}].encoding.pathOrder.order`,
        value: order
      });
    return rematerializePath(next, findLayer(next, layer.id));
  }
);

const removePathOrder = action(
  {
    op: "removePathOrder",
    description: "Remove explicit path order and restore automatic ordering."
  },
  function (args = {}) {
    validateOptionObject(args, REMOVE_OPTIONS, "removePathOrder");
    const layer = resolvePathOrderLayer(this, args.target, { active: true });
    const next = this.editSemantic({
      property: `layer[${layer.id}].encoding.pathOrder`,
      remove: true
    });
    return rematerializePath(next, findLayer(next, layer.id));
  }
);

export function registerPathOrderEncodingActions(ProgramClass) {
  ProgramClass.prototype.encodePathOrder = encodePathOrder;
  ProgramClass.prototype.removePathOrder = removePathOrder;
}
