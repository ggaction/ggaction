import { validateUserId } from "../../core/identifiers.js";
import { validateOptionObject } from "../../core/validation.js";
import { normalizeCoordinateAspect } from "../../grammar/coordinates.js";
import { normalizePolarFrameOptions } from "../../grammar/polar.js";
import {
  applyMaterializationPlan,
  planCoordinateRematerialization
} from "../../materialization/dependencies.js";
import { requireCoordinate } from "../../selectors/coordinates.js";

const EDIT_COORDINATE_OPTIONS = Object.freeze(["target", "aspect", "polarFrame"]);

function applyCoordinatePatch(program, target, property, value) {
  const coordinate = requireCoordinate(program, target);
  if (value === "auto") {
    return coordinate[property] === undefined
      ? program
      : program.editSemantic({
          property: `coordinate[${target}].${property}`,
          remove: true
        });
  }
  return program.editSemantic({
    property: `coordinate[${target}].${property}`,
    value
  });
}

export function editNativeCoordinate(program, args = {}) {
  validateOptionObject(args, EDIT_COORDINATE_OPTIONS, "editCoordinate", {
    allowEmpty: false,
    emptyMessage: "editCoordinate requires aspect or polarFrame changes.",
    emptyError: Error
  });
  const target = validateUserId(args.target, "Coordinate id");
  const coordinate = requireCoordinate(program, target);
  if (coordinate.type === "geo") throw new TypeError("Geo coordinates require a projection edit.");
  const hasAspect = Object.hasOwn(args, "aspect");
  const hasPolarFrame = Object.hasOwn(args, "polarFrame");
  if (!hasAspect && !hasPolarFrame) {
    throw new Error("editCoordinate requires aspect or polarFrame changes.");
  }
  const aspect = hasAspect ? normalizeCoordinateAspect(args.aspect) : undefined;
  if (hasPolarFrame && coordinate.type !== "polar") {
    throw new Error("editCoordinate polarFrame requires a Polar coordinate.");
  }
  const polarFrame = hasPolarFrame
    ? normalizePolarFrameOptions(args.polarFrame)
    : undefined;
  let proposed = program;
  if (hasAspect) {
    proposed = applyCoordinatePatch(proposed, target, "aspect", aspect);
  }
  if (hasPolarFrame) {
    proposed = applyCoordinatePatch(
      proposed,
      target,
      "polarFrame",
      polarFrame
    );
  }
  const plan = planCoordinateRematerialization(proposed, target);
  // Validate the complete dependent geometry on a discarded immutable branch.
  applyMaterializationPlan(proposed, plan);
  return applyMaterializationPlan(proposed, plan);
}
