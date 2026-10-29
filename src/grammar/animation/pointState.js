import { ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties } from "../../core/validation.js";
import { preparePositionInterpolation } from "./positions.js";
import { mapContinuousScaleValues } from "../scales/mapping.js";

const reasons = new Set(["anonymous", "semantic-unavailable", "primitive-role", "unsupported-family",
  "overlay-position", "coordinate-family", "offset-position", "computed-point-position", "incomplete-position",
  "scale-type", "nonfinite-semantic-value", "unsupported-point-primitive", "edited-position"]);

export function unavailablePointAnimationPosition(reason) {
  if (!reasons.has(reason)) throw new TypeError("Unknown animation point fallback reason.");
  return Object.freeze({ reason });
}

export function pointPositionMatchesNode(position, node) {
  return ["x", "y"].every(channel => mapContinuousScaleValues([position[channel].value], position[channel].scale)[0] === node.properties[channel]);
}

// A prepared endpoint's meaning must still produce its concrete native circle.
// Restore does not evaluate expressions, resolve rows, or infer values from pixels.
export function validatePointAnimationPosition(position, identity, node) {
  ownRecord(position, "Prepared animation point");
  if (Object.hasOwn(position, "reason")) {
    rejectUnknownProperties(position, ["reason"], "animation point fallback");
    unavailablePointAnimationPosition(position.reason);
    if ((identity === undefined) !== (position.reason === "anonymous")) throw new TypeError("Inconsistent animation point fallback identity.");
    return;
  }
  rejectUnknownProperties(position, ["x", "y"], "animation point position");
  if (identity === undefined || identity.role !== "body" || identity.lineage.kind !== undefined ||
      identity.lineage.rowKeys.length !== 1 || node.type !== "circle") {
    throw new TypeError("Semantic point positions require a circle with exact one-row body identity.");
  }
  for (const channel of ["x", "y"]) preparePositionInterpolation(position[channel], position[channel]);
  if (!pointPositionMatchesNode(position, node)) throw new TypeError("Prepared animation point meaning differs from its concrete endpoint.");
}
