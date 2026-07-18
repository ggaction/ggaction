import { validatePositionFieldCompatibility } from
  "../../../../grammar/positionCompatibility.js";
import { resolveAreaPositionPolicy } from "./area.js";
import { resolveArcPositionPolicy } from "./arc.js";
import { resolveBarPositionPolicy } from "./bar.js";
import { resolveLinePositionPolicy } from "./line.js";
import { resolvePointPositionPolicy } from "./point.js";
import { resolveRulePositionPolicy } from "./rule.js";

const POSITION_POLICIES = Object.freeze({
  area: resolveAreaPositionPolicy,
  arc: resolveArcPositionPolicy,
  bar: resolveBarPositionPolicy,
  line: resolveLinePositionPolicy,
  point: resolvePointPositionPolicy,
  rule: resolveRulePositionPolicy,
  text: resolvePointPositionPolicy,
  rect: resolvePointPositionPolicy
});

export function resolveMarkPositionPolicy(context) {
  const { layer, channel, fieldType } = context;
  validatePositionFieldCompatibility(layer.mark.type, channel, fieldType);
  const policy = POSITION_POLICIES[layer.mark.type];
  if (policy === undefined) {
    throw new Error(`Unsupported position policy for mark "${layer.mark.type}".`);
  }
  return policy(context);
}
