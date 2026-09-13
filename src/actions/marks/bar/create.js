import { action } from "../../../core/action.js";
import {
  assertMarkAvailable,
  applyLayeredMarkInheritance,
  materializeInheritedMark,
  resolveLayeredMarkInheritance,
  resolveMarkId,
  resolveMarkData,
  validateMarkOptions
} from "../shared.js";
import { resolveMarkGraphicPlacement } from
  "../../../materialization/graphicHierarchy.js";
import { requestedRectStyleDetails } from
  "../../../grammar/roundedRect.js";
import { STROKE_STYLE_PROPERTIES } from
  "../../../grammar/strokeStyle.js";

const CREATE_OPTIONS = Object.freeze([
  "id", "data", "fill", "opacity", "stroke", "strokeWidth",
  "cornerRadius", ...STROKE_STYLE_PROPERTIES
]);

export const createBarMark = action(
  {
    op: "createBarMark",
    description: "Create a semantic bar mark and empty rect collection."
  },
  function (args = {}) {
    validateMarkOptions(args, CREATE_OPTIONS, "createBarMark");
    requestedRectStyleDetails(args, "createBarMark");
    const id = resolveMarkId(this, args.id, {
      defaultId: "bar",
      label: "Bar mark id",
      markType: "bar",
      operation: "createBarMark"
    });
    const inherited = resolveLayeredMarkInheritance(this, args, "bar");
    const { data } = resolveMarkData(this, {
      ...args,
      ...(args.data === undefined && this.context.currentData === undefined &&
        inherited?.data !== undefined ? { data: inherited.data } : {})
    });

    assertMarkAvailable(this, id);

    let created = this
      .editSemantic({
        property: `layer[${id}].mark.type`,
        value: "bar"
      })
      .editSemantic({
        property: `layer[${id}].data`,
        value: data
      });
    created = applyLayeredMarkInheritance(created, id, inherited);
    created = created
      .createGraphics({
        id,
        type: "rect",
        length: 0,
        ...resolveMarkGraphicPlacement(created, { data, markType: "bar" })
      });
    created = materializeInheritedMark(created, id);
    const appearance = Object.fromEntries(
      [
        "fill", "opacity", "stroke", "strokeWidth", "cornerRadius",
        ...STROKE_STYLE_PROPERTIES
      ]
        .filter(property => Object.hasOwn(args, property))
        .map(property => [property, args[property]])
    );
    return Object.keys(appearance).length === 0
      ? created
      : created.editBarMark({ target: id, ...appearance });
  }
);
