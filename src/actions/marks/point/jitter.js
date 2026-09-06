import { action } from "../../../core/action.js";
import { validateUserId } from "../../../core/identifiers.js";
import { validateKeys } from "../../../core/validation.js";
import { normalizePointJitterPolicy } from "../../../grammar/jitter.js";
import { findCoordinate } from "../../../selectors/coordinates.js";
import { resolveEligibleLayer } from "../../../selectors/layers.js";

const JITTER_OPTIONS = Object.freeze([
  "target", "channel", "maxOffset", "seed", "key"
]);
const REMOVE_OPTIONS = Object.freeze(["target"]);

function isCartesianPoint(program, layer, channel) {
  return layer.mark?.type === "point" &&
    layer.encoding?.[channel]?.scale !== undefined &&
    layer.encoding?.[channel === "x" ? "y" : "x"]?.scale !== undefined &&
    findCoordinate(program, layer.coordinate)?.type === "cartesian";
}

function resolveJitterTarget(program, target, channel) {
  const requested = target === undefined
    ? undefined
    : validateUserId(target, "Point jitter target");
  return resolveEligibleLayer(program, {
    target: requested,
    predicate: layer => isCartesianPoint(program, layer, channel),
    label: "point jitter"
  });
}

export const jitterPoints = action(
  {
    op: "jitterPoints",
    description: "Apply deterministic bounded graphical jitter to a point mark."
  },
  function (args = {}) {
    validateKeys(args, JITTER_OPTIONS, "jitterPoints");
    const policy = normalizePointJitterPolicy(args);
    const layer = resolveJitterTarget(this, args.target, policy.channel);
    if (this.materializationConfigs.pointPacking?.[layer.id] !== undefined) {
      throw new Error(`Point jitter on "${layer.id}" conflicts with point packing.`);
    }
    return this
      ._withMaterializationConfig(["jitters", layer.id], policy)
      .rematerializePointMark({ id: layer.id });
  }
);

export const removeJitter = action(
  {
    op: "removeJitter",
    description: "Remove point jitter and restore semantic scale positions."
  },
  function (args = {}) {
    validateKeys(args, REMOVE_OPTIONS, "removeJitter");
    const requested = args.target === undefined
      ? undefined
      : validateUserId(args.target, "Point jitter target");
    const layer = resolveEligibleLayer(this, {
      target: requested,
      predicate: candidate =>
        candidate.mark?.type === "point" &&
        this.materializationConfigs.jitters?.[candidate.id] !== undefined,
      label: "point jitter"
    });
    return this
      ._withoutMaterializationConfig(["jitters", layer.id])
      .rematerializePointMark({ id: layer.id });
  }
);

export function registerPointJitterActions(ProgramClass) {
  ProgramClass.prototype.jitterPoints = jitterPoints;
  ProgramClass.prototype.removeJitter = removeJitter;
}
