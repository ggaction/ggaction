import { cloneAndFreeze } from "../../core/immutable.js";
import { ownRecord, ownArray } from "../../core/ownData.js";
import { rejectUnknownProperties, validateGeneratedItemLimit } from "../../core/validation.js";
import { mapPartitionSector } from "../hierarchy/partitionMapping.js";
import { validatePartitionMapping } from "../hierarchy/partitionPlot.js";
import { preparePartitionInterpolation, samplePartitionInterpolation } from "../hierarchy/partitionInterpolation.js";

export const PARTITION_ANIMATION_VERSION = 1;
const reasons = new Set(["topology", "visibility", "handedness", "radius-policy", "depth-direction", "partition-edited-geometry", "partition-collapsed-cell"]);
export const isPartitionAnimationFallbackReason = reason => reasons.has(reason);
function closed(value, keys, label) {
  ownRecord(value, label); rejectUnknownProperties(value, keys, label);
  if (keys.some(key => !Object.hasOwn(value, key) || value[key] === undefined)) throw new TypeError(`${label} requires every resolved field.`);
}
function checked(input) {
  closed(input, ["depthReversed", "state"], "Partition animation state");
  if (typeof input.depthReversed !== "boolean") throw new TypeError("Partition depth direction must be boolean.");
  return { depthReversed: input.depthReversed, state: preparePartitionInterpolation(input.state, input.state).from };
}
export function validatePartitionAnimationMeaning(input) { return cloneAndFreeze(checked(input)); }

// Convert stored normalized intervals and an explicit native coordinate frame.
// No hierarchy layout, row lookup, scene inspection or pixel inference occurs.
export function createPartitionAnimationState(input) {
  ownRecord(input, "Native partition animation state");
  rejectUnknownProperties(input, ["nodes", "focusKey", "frame", "mapping", "polar"], "native partition animation state");
  for (const key of ["nodes", "focusKey", "frame", "mapping"]) if (!Object.hasOwn(input, key)) throw new TypeError("Native partition animation state requires resolved nodes and mapping.");
  const mapping = input.mapping;
  validatePartitionMapping(mapping);
  closed(input.frame, ["x", "y", "width", "height"], "Native partition frame");
  const frame = input.frame;
  if (![frame.x, frame.y, frame.width, frame.height, frame.x + frame.width, frame.y + frame.height].every(Number.isFinite) || frame.width <= 0 || frame.height <= 0) throw new RangeError("Native partition frame must be finite and positive.");
  if (Array.isArray(input.nodes)) validateGeneratedItemLimit(input.nodes.length, "Native partition animation nodes");
  ownArray(input.nodes, "Native partition nodes");
  input.nodes.forEach(node => ownRecord(node, "Native partition node"));
  let origin, angle, handedness, kernel;
  const polar = Object.hasOwn(input, "polar"), depthReversed = polar && mapping.reverseV;
  if (polar) {
    closed(input.polar, ["centerX", "centerY", "outerRadius"], "Native partition polar frame");
    const p = input.polar, turn = (mapping.direction === "clockwise" ? 1 : -1) * (mapping.reverseU ? -1 : 1);
    if (![p.centerX, p.centerY, p.outerRadius].every(Number.isFinite)) throw new TypeError("Native partition polar frame must be finite.");
    if (mapping.outerRadius !== "auto" && mapping.outerRadius !== p.outerRadius) throw new TypeError("Native partition radius must equal its resolved mapping.");
    const sector = mapPartitionSector({ u0: 0, u1: 1, v0: 0, v1: 1 }, { innerRadius: mapping.innerRadius, outerRadius: p.outerRadius,
      radiusPolicy: mapping.radiusPolicy, startAngle: mapping.startAngle * Math.PI / 180, sweep: mapping.sweep * Math.PI / 180, direction: mapping.direction });
    const center = (sector.startAngle + sector.endAngle) / 2;
    origin = [p.centerX, p.centerY]; angle = Math.atan2(turn * Math.sin(center), turn * Math.cos(center)); handedness = -turn;
    kernel = { width: 1, height: 1, innerRadius: mapping.innerRadius, outerRadius: p.outerRadius, radiusPolicy: mapping.radiusPolicy, sweep: mapping.sweep * Math.PI / 180 };
  } else {
    const horizontal = mapping.orientation === "horizontal", uSign = mapping.reverseU ? -1 : 1, vSign = mapping.reverseV ? -1 : 1;
    origin = horizontal ? [frame.x + frame.width / 2, frame.y + (mapping.reverseV ? frame.height : 0)]
      : [frame.x + (mapping.reverseV ? frame.width : 0), frame.y + frame.height / 2];
    angle = horizontal ? Math.atan2(0, uSign) : Math.atan2(uSign, 0);
    handedness = (horizontal ? 1 : -1) * uSign * vSign;
    kernel = { width: horizontal ? frame.width : frame.height, height: horizontal ? frame.height : frame.width,
      innerRadius: 0, outerRadius: 1, radiusPolicy: mapping.radiusPolicy, sweep: mapping.sweep * Math.PI / 180 };
  }
  const state = { nodes: input.nodes.map(node => ({ ...node,
    ...(depthReversed && node.visible ? { v0: 1 - node.v1, v1: 1 - node.v0 } : {}) })),
    focusKey: input.focusKey, bend: polar ? 1 : 0,
    frame: { origin, angle, handedness, kernel, gap: mapping.padding } };
  return cloneAndFreeze(checked({ depthReversed, state }));
}

// A rectangular endpoint may use the other endpoint's radial depth convention.
// Reflecting its basis and intervals together preserves its actual native image.
function alignRectangle(input, depthReversed, other) {
  if (input.state.bend !== 0) return input;
  const state = input.state, frame = state.frame, changed = input.depthReversed !== depthReversed;
  const height = frame.kernel.height, angle = frame.angle;
  return { depthReversed, state: { ...state,
    nodes: changed ? state.nodes.map(node => node.visible ? { ...node, v0: 1 - node.v1, v1: 1 - node.v0 } : node) : state.nodes,
    frame: { ...frame,
      origin: changed ? [frame.origin[0] - frame.handedness * Math.sin(angle) * height,
        frame.origin[1] + frame.handedness * Math.cos(angle) * height] : frame.origin,
      handedness: changed ? -frame.handedness : frame.handedness,
      kernel: { ...frame.kernel, innerRadius: other.frame.kernel.innerRadius, outerRadius: other.frame.kernel.outerRadius,
        radiusPolicy: other.frame.kernel.radiusPolicy, sweep: other.frame.kernel.sweep } } } };
}
function alignPolar(input, other) {
  if (input.state.bend !== 1) return input;
  return { ...input, state: { ...input.state, frame: { ...input.state.frame,
    kernel: { ...input.state.frame.kernel, width: other.frame.kernel.width, height: other.frame.kernel.height } } } };
}
export function preparePartitionAnimationState(inputFrom, inputTo) {
  let from = checked(inputFrom), to = checked(inputTo);
  const depthDirections = [from.depthReversed, to.depthReversed];
  const depthReversed = from.state.bend === 0 ? to.depthReversed : from.depthReversed;
  const reason = from.state.bend !== 0 && to.state.bend !== 0 && from.depthReversed !== to.depthReversed ? "depth-direction" : undefined;
  // Align unused native dimensions only; an interrupted curved state keeps all
  // of its current dimensions rather than snapping back to a native endpoint.
  const a = from.state, b = to.state;
  from = alignRectangle(from, depthReversed, b); to = alignRectangle(to, depthReversed, a);
  from = alignPolar(from, b); to = alignPolar(to, a);
  return cloneAndFreeze({ kind: "partition-animation", version: PARTITION_ANIMATION_VERSION, depthReversed, depthDirections,
    ...(reason ? { reason } : {}), track: preparePartitionInterpolation(from.state, to.state) });
}
export function samplePartitionAnimationState(plan, progress) {
  ownRecord(plan, "Partition animation plan");
  rejectUnknownProperties(plan, ["kind", "version", "depthReversed", "depthDirections", "reason", "track"], "partition animation plan");
  if (plan.kind !== "partition-animation" || plan.version !== PARTITION_ANIMATION_VERSION || typeof plan.depthReversed !== "boolean" ||
      Object.hasOwn(plan, "reason") && plan.reason !== "depth-direction") throw new TypeError("Unsupported partition animation state plan.");
  const sample = samplePartitionInterpolation(plan.track, progress);
  ownArray(plan.depthDirections, "Partition animation depth directions");
  const directions = plan.depthDirections;
  if (directions.length !== 2 || directions.some(value => typeof value !== "boolean") ||
      plan.depthReversed !== (plan.track.from.bend === 0 ? directions[1] : directions[0]) ||
      Object.hasOwn(plan, "reason") !== (plan.track.from.bend !== 0 && plan.track.to.bend !== 0 && directions[0] !== directions[1])) {
    throw new TypeError("Partition animation depth decisions are inconsistent.");
  }
  return plan.reason ? cloneAndFreeze({ mode: "crossfade", reason: plan.reason, from: plan.track.from, to: plan.track.to, weights: [1 - progress, progress] })
    : sample.mode === "crossfade" ? sample : cloneAndFreeze({ mode: "partition", state: { depthReversed: plan.depthReversed, state: sample.state } });
}
