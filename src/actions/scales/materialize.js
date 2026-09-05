import { resolveScalePreview } from "./preview.js";
import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateKeys } from "../../core/validation.js";
import {
  applyMaterializationPlan,
  planScaleGuideRematerialization
} from "../../materialization/dependencies.js";
import {
  canDeferScaleConsumerApplication,
  getMarkRematerializationStep,
  getScaleConsumerMaterializationMode
} from "../../materialization/marks/index.js";
import { mapScaleConsumerValues } from
  "../../materialization/scales/map.js";
const OPTIONS = Object.freeze(["id", "guides", "marks"]);

function validateOptions(args) {
  validateKeys(args, OPTIONS, "rematerializeScale");
  if (args.guides !== undefined && typeof args.guides !== "boolean") {
    throw new TypeError("rematerializeScale guides must be a boolean.");
  }
  if (args.marks !== undefined && typeof args.marks !== "boolean") {
    throw new TypeError("rematerializeScale marks must be a boolean.");
  }
}

export const rematerializeScale = action(
  {
    op: "rematerializeScale",
    description: "Recompute every concrete consumer of a scale."
  },
  function (args = {}) {
    validateOptions(args);
    const id = validateUserId(args.id, "Scale id");
    const { channel, valuesByConsumer, resolvedScale } = resolveScalePreview(this, id);
    let next = this._withResolvedScale(id, resolvedScale);

    for (const { consumer, values } of valuesByConsumer) {
      if (
        args.marks === false &&
        canDeferScaleConsumerApplication(consumer.layer)
      ) {
        continue;
      }
      const materializationMode = getScaleConsumerMaterializationMode(
        consumer.layer,
        channel
      );
      if (materializationMode === "rematerialize") {
        if (args.marks !== false) {
          const step = getMarkRematerializationStep(consumer.layer);
          if (step !== undefined) next = next[step.op](step.args);
        }
        continue;
      }
      if (materializationMode === "defer") continue;
      if (Object.values(this.materializationConfigs.highlights ?? {})
        .some(config => config.target === consumer.layer.id)) {
        next = next.rematerializePointMark({ id: consumer.layer.id });
        continue;
      }
      next = next.editGraphics({
        target: consumer.layer.id,
        property: channel === "color" ? "fill" : channel,
        value: mapScaleConsumerValues(values, resolvedScale, channel)
      });
    }

    return args.guides === false
      ? next
      : applyMaterializationPlan(
          next,
          planScaleGuideRematerialization(next, id)
        );
  }
);
