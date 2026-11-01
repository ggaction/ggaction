import { ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties } from "../../core/validation.js";
import { guideAnimationKey, normalizeGuideIdentity } from "./guideState.js";
import { guideAnimationOwnerKey } from "./ownerKey.js";

export function axisLabelDecision(identity) {
  normalizeGuideIdentity(identity);
  return { kind: "guide", kernel: "native-axis-label", ownerKey: guideAnimationOwnerKey(identity), guideKey: guideAnimationKey(identity), role: "guide-labels" };
}
export function validateAxisLabelDecision(input, identity) {
  ownRecord(input, "Axis label decision");
  const expected = axisLabelDecision(identity);
  rejectUnknownProperties(input, Object.keys(expected), "axis label decision");
  if (Object.entries(expected).some(([key, value]) => !Object.hasOwn(input, key) || input[key] !== value)) throw new TypeError("Axis label decision differs from its current native identity.");
  return input;
}
