import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { getPointGraphicType } from "../../grammar/schemas/mark.js";
import {
  assertMarkAvailable,
  resolveMarkData,
  validateMarkOptions
} from "./shared.js";

const POINT_MARK_OPTIONS = Object.freeze(["id", "data", "shape"]);

const createPointMark = action(
  {
    op: "createPointMark",
    description: "Create a semantic point mark and concrete point graphics."
  },
  function (args = {}) {
    validateMarkOptions(args, POINT_MARK_OPTIONS, "createPointMark");
    const id = validateUserId(args.id, "Point mark id");
    const { data, dataset } = resolveMarkData(this, args);
    const shape = Object.hasOwn(args, "shape") ? args.shape : "circle";
    const graphicType = getPointGraphicType(shape);

    assertMarkAvailable(this, id);

    return this
      .editSemantic({
        property: `layer[${id}].mark.type`,
        value: "point"
      })
      .editSemantic({
        property: `layer[${id}].data`,
        value: data
      })
      .createGraphics({
        id,
        type: graphicType,
        length: dataset.values.length
      });
  }
);

export function registerPointMarkActions(ProgramClass) {
  ProgramClass.prototype.createPointMark = createPointMark;
}
