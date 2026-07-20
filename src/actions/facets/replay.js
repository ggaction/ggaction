import { action } from "../../core/action.js";
import { isPlainObject } from "../../core/immutable.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateKeys } from "../../core/validation.js";
import { findTransformPolicy } from "../../grammar/transforms.js";
import { hasDataset } from "../../selectors/datasets.js";

const REPLAY_OPTIONS = Object.freeze(["id", "source", "transform"]);

function requestedTransform(transform) {
  if (!isPlainObject(transform)) {
    throw new TypeError("replayDerivedData transform must be a plain object.");
  }
  const policy = findTransformPolicy(transform.type);
  if (policy?.facetTopology === undefined) {
    throw new Error(
      `replayDerivedData does not support transform "${transform.type ?? "unknown"}".`
    );
  }
  return {
    transform: policy.replayTransform?.(transform) ?? transform,
    materialize: policy.materializeOp
  };
}

export const replayDerivedData = action(
  {
    op: "replayDerivedData",
    description: "Replay one stored derived-data transform for a facet cell."
  },
  function (args = {}) {
    validateKeys(args, REPLAY_OPTIONS, "replayDerivedData");
    const id = validateUserId(args.id, "Facet replay dataset id");
    const source = validateUserId(args.source, "Facet replay source id");
    const resolved = requestedTransform(args.transform);
    return this
      .createDerivedData({ id, source, transform: [resolved.transform] })
      [resolved.materialize]({ id });
  }
);
