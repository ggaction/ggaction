import { closedAction } from "../../core/action.js";
import { isPlainObject } from "../../core/immutable.js";
import { validateUserId } from "../../core/identifiers.js";

import { findTransformPolicy } from "../../grammar/transforms.js";
import { applyLayerDataRematerialization } from "../../materialization/dependencies.js";

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

export const replayDerivedData = /* @__PURE__ */ closedAction(
  {
    op: "replayDerivedData",
    description: "Replay one stored derived-data transform for a facet cell."
  }, REPLAY_OPTIONS,
  function (args = {}) {
    const id = validateUserId(args.id, "Facet replay dataset id");
    const source = validateUserId(args.source, "Facet replay source id");
    const resolved = requestedTransform(args.transform);
    let next = this;
    if (resolved.transform.type === "markFilter") {
      const target = resolved.transform.target;
      const { markFilter: previous, ...config } = next.markConfigs[target] ?? {};
      next = next.rebindLayerData({ id: target, data: source })._withMarkConfig(target, config);
      next = applyLayerDataRematerialization(next, target)._withMarkConfig(target, {
        ...config, markFilter: { ...previous, source, dataset: id, empty: false }
      });
    }
    return next
      .createDerivedData({ id, source, transform: [resolved.transform] })
      [resolved.materialize]({ id });
  }
);
