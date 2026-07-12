import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import {
  assertMarkAvailable,
  resolveMarkData,
  validateMarkOptions
} from "./shared.js";

const CREATE_OPTIONS = Object.freeze(["id", "data"]);

const createBarMark = action(
  {
    op: "createBarMark",
    description: "Create a semantic bar mark and empty rect collection."
  },
  function (args = {}) {
    validateMarkOptions(args, CREATE_OPTIONS, "createBarMark");
    const id = validateUserId(args.id, "Bar mark id");
    const { data } = resolveMarkData(this, args);

    assertMarkAvailable(this, id);

    return this
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
        length: 0
      });
  }
);

export function registerBarMarkActions(ProgramClass) {
  ProgramClass.prototype.createBarMark = createBarMark;
}
