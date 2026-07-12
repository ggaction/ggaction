import { action } from "../../core/action.js";
import { resolveTarget, validateOptions } from "./shared.js";

const RADIUS_OPTIONS = Object.freeze(["value", "target"]);

const encodeRadius = action(
  {
    op: "encodeRadius",
    description: "Set a constant graphical radius on a point mark."
  },
  function (args = {}) {
    validateOptions(args, RADIUS_OPTIONS, "encodeRadius");
    const { id: target } = resolveTarget(
      this,
      args.target,
      ["point"],
      "point mark"
    );

    if (!Number.isFinite(args.value) || args.value < 0) {
      throw new RangeError(
        "encodeRadius requires a non-negative finite value."
      );
    }

    return this.editGraphics({
      target,
      property: "radius",
      value: args.value
    });
  }
);

export function registerAppearanceEncodingAction(ProgramClass) {
  ProgramClass.prototype.encodeRadius = encodeRadius;
}
