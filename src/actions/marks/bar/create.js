import { action } from "../../../core/action.js";
import {
  assertMarkAvailable,
  resolveMarkId,
  resolveMarkData,
  validateMarkOptions
} from "../shared.js";
import { resolveMarkGraphicPlacement } from
  "../../../materialization/graphicHierarchy.js";

const CREATE_OPTIONS = Object.freeze([
  "id", "data", "fill", "opacity", "stroke", "strokeWidth"
]);

export const createBarMark = action(
  {
    op: "createBarMark",
    description: "Create a semantic bar mark and empty rect collection."
  },
  function (args = {}) {
    validateMarkOptions(args, CREATE_OPTIONS, "createBarMark");
    const id = resolveMarkId(this, args.id, {
      defaultId: "bar",
      label: "Bar mark id",
      markType: "bar",
      operation: "createBarMark"
    });
    const { data } = resolveMarkData(this, args);

    assertMarkAvailable(this, id);

    const created = this
      .editSemantic({
        property: `layer[${id}].mark.type`,
        value: "bar"
      })
      .editSemantic({
        property: `layer[${id}].data`,
        value: data
      })
      .createGraphics({
        id,
        type: "rect",
        length: 0,
        ...resolveMarkGraphicPlacement(this, { data, markType: "bar" })
      });
    const appearance = Object.fromEntries(
      ["fill", "opacity", "stroke", "strokeWidth"]
        .filter(property => Object.hasOwn(args, property))
        .map(property => [property, args[property]])
    );
    return Object.keys(appearance).length === 0
      ? created
      : created.editBarMark({ target: id, ...appearance });
  }
);
