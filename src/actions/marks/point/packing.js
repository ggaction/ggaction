import { action } from "../../../core/action.js";
import { validateUserId } from "../../../core/identifiers.js";
import { validateKeys } from "../../../core/validation.js";
import { normalizePointPackingPolicy } from "../../../grammar/pointPacking.js";
import { findCoordinate } from "../../../selectors/coordinates.js";
import { resolveEligibleLayer } from "../../../selectors/layers.js";

const OPTIONS = Object.freeze([
  "target", "channel", "maxOffset", "padding", "key", "overflow"
]);
const REMOVE_OPTIONS = Object.freeze(["target"]);

function isPackablePoint(program, layer, channel) {
  const packed = layer.encoding?.[channel];
  const fixed = layer.encoding?.[channel === "x" ? "y" : "x"];
  return layer.mark?.type === "point" &&
    ["nominal", "ordinal"].includes(packed?.fieldType) &&
    ["quantitative", "temporal"].includes(fixed?.fieldType) &&
    packed.scale !== undefined && fixed.scale !== undefined &&
    findCoordinate(program, layer.coordinate)?.type === "cartesian";
}

function target(program, requested, channel) {
  return resolveEligibleLayer(program, {
    target: requested === undefined ? undefined : validateUserId(requested, "Point packing target"),
    predicate: layer => isPackablePoint(program, layer, channel),
    label: "point packing"
  });
}

export const packPoints = action(
  { op: "packPoints", description: "Pack point glyphs deterministically within categorical slots." },
  function (args = {}) {
    validateKeys(args, OPTIONS, "packPoints");
    const policy = normalizePointPackingPolicy(args);
    const layer = target(this, args.target, policy.channel);
    if (this.materializationConfigs.jitters?.[layer.id] !== undefined) {
      throw new Error(`Point packing on "${layer.id}" conflicts with point jitter.`);
    }
    return this
      ._withMaterializationConfig(["pointPacking", layer.id], policy)
      .rematerializePointMark({ id: layer.id });
  }
);

export const removePointPacking = action(
  { op: "removePointPacking", description: "Remove point packing and restore semantic positions." },
  function (args = {}) {
    validateKeys(args, REMOVE_OPTIONS, "removePointPacking");
    const requested = args.target === undefined
      ? undefined
      : validateUserId(args.target, "Point packing target");
    const layer = resolveEligibleLayer(this, {
      target: requested,
      predicate: candidate => candidate.mark?.type === "point" &&
        this.materializationConfigs.pointPacking?.[candidate.id] !== undefined,
      label: "point packing"
    });
    return this
      ._withoutMaterializationConfig(["pointPacking", layer.id])
      .rematerializePointMark({ id: layer.id });
  }
);

export function registerPointPackingActions(ProgramClass) {
  ProgramClass.prototype.packPoints = packPoints;
  ProgramClass.prototype.removePointPacking = removePointPacking;
}
