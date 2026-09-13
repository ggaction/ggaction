import { action } from "../../../core/action.js";
import { validatePointShape } from "../../../grammar/pointShapes.js";
import { getPointGraphicType } from "../../../grammar/schemas/mark.js";
import {
  requestedStrokeDetails,
  STROKE_STYLE_PROPERTIES
} from "../../../grammar/strokeStyle.js";
import { resolveMarkGraphicPlacement } from
  "../../../materialization/graphicHierarchy.js";
import {
  applyLayeredMarkInheritance,
  assertMarkAvailable,
  materializeInheritedMark,
  resolveLayeredMarkInheritance,
  resolveMarkData,
  resolveMarkId,
  validateMarkOptions
} from "../shared.js";

const OPTIONS = Object.freeze([
  "id", "data", "shape", "fill", "opacity", "stroke", "strokeWidth",
  ...STROKE_STYLE_PROPERTIES
]);

export const createPointMark = action(
  {
    op: "createPointMark",
    description: "Create a semantic point mark and concrete point graphics."
  },
  function (args = {}) {
    validateMarkOptions(args, OPTIONS, "createPointMark");
    requestedStrokeDetails(args, "createPointMark");
    const id = resolveMarkId(this, args.id, {
      defaultId: "point",
      label: "Point mark id",
      markType: "point",
      operation: "createPointMark"
    });
    const inherited = resolveLayeredMarkInheritance(this, args, "point");
    const { data, dataset } = resolveMarkData(this, {
      ...args,
      ...(args.data === undefined &&
        this.context.currentData === undefined &&
        inherited?.data !== undefined
        ? { data: inherited.data }
        : {})
    });
    const shape = Object.hasOwn(args, "shape") ? args.shape : "circle";
    validatePointShape(shape);
    const resolvedType = getPointGraphicType(shape);
    const graphicType = resolvedType === "path" ? "circle" : resolvedType;

    assertMarkAvailable(this, id);

    let next = this
      .editSemantic({
        property: `layer[${id}].mark.type`,
        value: "point"
      })
      .editSemantic({
        property: `layer[${id}].data`,
        value: data
      });
    next = applyLayeredMarkInheritance(next, id, inherited)
      .createGraphics({
        id,
        type: graphicType,
        length: dataset.values.length,
        ...resolveMarkGraphicPlacement(next, { data, markType: "point" })
      })
      ._withMarkConfig(id, { shape });
    const created = materializeInheritedMark(next, id);
    const appearance = Object.fromEntries(
      ["fill", "opacity", "stroke", "strokeWidth", ...STROKE_STYLE_PROPERTIES]
        .filter(property => Object.hasOwn(args, property))
        .map(property => [property, args[property]])
    );
    return Object.keys(appearance).length === 0
      ? created
      : created.editPointMark({ target: id, ...appearance });
  }
);
