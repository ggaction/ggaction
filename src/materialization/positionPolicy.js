import { resolveMarkPositionPolicy as resolvePolicy } from "../grammar/positionPolicies/index.js";
import { findSemanticScale } from "../selectors/scales.js";

// The grammar consumes explicit mark and scale state; only this adapter reads
// the program's named resources for both authoring and persisted validation.
export function resolveMarkPositionPolicy({ program, ...context }) {
  const appearanceScales = Object.fromEntries(["color", "strokeDash"].map(channel =>
    [channel, findSemanticScale(program, context.layer.encoding?.[channel]?.scale)]));
  return resolvePolicy({ ...context, markConfig: program.markConfigs[context.layer.id] ?? {}, appearanceScales });
}
