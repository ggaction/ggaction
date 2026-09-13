import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateOptionObject } from "../../core/validation.js";
import { normalizeCoordinateAspect } from "../../grammar/coordinates.js";
import {
  applyMaterializationPlan,
  planCoordinateRematerialization
} from "../../materialization/dependencies.js";
import { requireCoordinate } from "../../selectors/coordinates.js";

const EDIT_COORDINATE_OPTIONS = Object.freeze(["target", "aspect"]);

function applyAspectPatch(program, target, aspect) {
  const coordinate = requireCoordinate(program, target);
  if (aspect === "auto") {
    return coordinate.aspect === undefined
      ? program
      : program.editSemantic({
          property: `coordinate[${target}].aspect`,
          remove: true
        });
  }
  return program.editSemantic({
    property: `coordinate[${target}].aspect`,
    value: aspect
  });
}

export const editCoordinate = action(
  {
    op: "editCoordinate",
    description: "Edit coordinate layout constraints and rematerialize its consumers."
  },
  function (args = {}) {
    validateOptionObject(args, EDIT_COORDINATE_OPTIONS, "editCoordinate", {
      allowEmpty: false,
      emptyMessage: "editCoordinate requires aspect changes.",
      emptyError: Error
    });
    const target = validateUserId(args.target, "Coordinate id");
    requireCoordinate(this, target);
    if (!Object.hasOwn(args, "aspect")) {
      throw new Error("editCoordinate requires aspect changes.");
    }
    const aspect = normalizeCoordinateAspect(args.aspect);
    const proposed = applyAspectPatch(this, target, aspect);
    const plan = planCoordinateRematerialization(proposed, target);
    // Validate the complete dependent geometry on a discarded immutable branch.
    applyMaterializationPlan(proposed, plan);
    return applyMaterializationPlan(proposed, plan);
  }
);

export function registerCoordinateEditActions(ProgramClass) {
  ProgramClass.prototype.editCoordinate = editCoordinate;
}
