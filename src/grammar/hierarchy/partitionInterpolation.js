import { cloneAndFreeze } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateGeneratedItemLimit, validateWorkLimit, validateUnitInterval, validateNonNegativeFinite } from "../../core/validation.js";
import { interpolateNumber, interpolateRotation } from "../animation/values.js";
import { validatePartitionInterval } from "./partitionMapping.js";
import { mapPartitionBendPoint } from "./partitionAdapter.js";

export const PARTITION_INTERPOLATION_VERSION = 1;
const BOUNDS = ["u0", "u1", "v0", "v1"];
const KERNEL = ["width", "height", "innerRadius", "outerRadius", "radiusPolicy", "sweep"];
function record(value, keys, label) {
  ownRecord(value, label); rejectUnknownProperties(value, keys, label);
  if (keys.some(key => (!Object.hasOwn(value, key) || value[key] === undefined))) throw new TypeError(`${label} requires every resolved field.`);
}
function state(input, budget = { work: 0 }) {
  record(input, ["nodes", "focusKey", "bend", "frame"], "Partition interpolation state");
  validateUnitInterval(input.bend, "Partition interpolation bend");
  const frame = input.frame;
  record(frame, ["origin", "angle", "handedness", "kernel", "gap"], "Partition interpolation frame");
  record(frame.kernel, KERNEL, "Partition interpolation kernel");
  const { gap, ...basis } = frame;
  mapPartitionBendPoint(basis, { u: .5, v: .5, bend: input.bend });
  ownArray(gap, "Partition interpolation gaps");
  if (gap.length !== 2) throw new TypeError("Partition interpolation gaps require two distances.");
  gap.forEach(value => validateNonNegativeFinite(value, "Partition interpolation gap"));
  if (Array.isArray(input.nodes)) validateGeneratedItemLimit(input.nodes.length, "Partition interpolation nodes");
  ownArray(input.nodes, "Partition interpolation nodes");
  budget.work += input.nodes.length * 64;
  validateWorkLimit(budget.work, "Partition interpolation work");
  const seen = new Set(), active = new Set(), stack = [];
  for (const node of input.nodes) {
    record(node, ["key", "parentKey", ...BOUNDS, "visible"], "Partition interpolation node");
    if (typeof node.key !== "string" || !node.key || seen.has(node.key) ||
        node.parentKey !== null && (typeof node.parentKey !== "string" || !node.parentKey)) throw new TypeError("Partition node keys must be unique strings with explicit parents.");
    validateWorkLimit(budget.work += node.key.length + (node.parentKey?.length ?? 0), "Partition interpolation work");
    if (node.parentKey !== null && !active.has(node.parentKey)) throw new TypeError("Partition nodes require an acyclic parent preorder.");
    while (stack.length && stack.at(-1) !== node.parentKey) active.delete(stack.pop());
    seen.add(node.key); active.add(node.key); stack.push(node.key);
    validatePartitionInterval(Object.fromEntries(BOUNDS.map(key => [key, node[key]])));
    if (typeof node.visible !== "boolean") throw new TypeError("Partition visibility must be boolean.");
  }
  if (input.focusKey !== null && !seen.has(input.focusKey)) throw new TypeError("Partition focus must identify an existing node or be null.");
  return cloneAndFreeze(input);
}

export function preparePartitionInterpolation(inputFrom, inputTo) {
  const budget = { work: 0 };
  const from = state(inputFrom, budget), to = state(inputTo, budget);
  const reason = from.nodes.length !== to.nodes.length || from.nodes.some((node, i) => node.key !== to.nodes[i].key || node.parentKey !== to.nodes[i].parentKey) ? "topology"
    : from.nodes.some((node, i) => node.visible !== to.nodes[i].visible) ? "visibility"
      : from.frame.handedness !== to.frame.handedness ? "handedness"
        : from.frame.kernel.radiusPolicy !== to.frame.kernel.radiusPolicy ? "radius-policy" : undefined;
  return cloneAndFreeze({ kind: "partition", version: PARTITION_INTERPOLATION_VERSION, mode: reason === undefined ? "partition" : "crossfade",
    from, to, ...(reason === undefined ? {} : { reason }) });
}

export function samplePartitionInterpolation(input, progress) {
  ownRecord(input, "Partition interpolation track");
  rejectUnknownProperties(input, ["kind", "version", "mode", "from", "to", "reason"], "partition interpolation track");
  if (input.kind !== "partition" || input.version !== PARTITION_INTERPOLATION_VERSION) throw new TypeError("Unsupported partition interpolation kind or version.");
  const plan = preparePartitionInterpolation(input.from, input.to);
  if (input.mode !== plan.mode || input.reason !== plan.reason || Object.hasOwn(input, "reason") !== Object.hasOwn(plan, "reason")) throw new TypeError("Partition interpolation compatibility decision is inconsistent.");
  validateUnitInterval(progress, "Partition interpolation progress");
  const { from, to } = plan;
  if (plan.mode === "crossfade") return cloneAndFreeze({ mode: plan.mode, reason: plan.reason, from, to, weights: [1 - progress, progress] });
  if (progress === 0 || progress === 1) return cloneAndFreeze({ mode: "partition", state: progress === 0 ? from : to });
  const mix = (a, b) => interpolateNumber(a, b, progress);
  const result = { focusKey: from.focusKey, bend: mix(from.bend, to.bend),
    nodes: from.nodes.map((node, i) => ({ ...node, ...Object.fromEntries(BOUNDS.map(key => [key, mix(node[key], to.nodes[i][key])])) })),
    frame: { origin: from.frame.origin.map((value, i) => mix(value, to.frame.origin[i])),
      angle: interpolateRotation(from.frame.angle, to.frame.angle, progress), handedness: from.frame.handedness,
      kernel: Object.fromEntries(KERNEL.map(key => [key, key === "radiusPolicy" ? from.frame.kernel[key] : mix(from.frame.kernel[key], to.frame.kernel[key])])),
      gap: from.frame.gap.map((value, i) => mix(value, to.frame.gap[i])) } };
  return cloneAndFreeze({ mode: "partition", state: state(result) });
}
