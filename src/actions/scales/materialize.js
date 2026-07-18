import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { normalizePositionScaleChannel } from "../../core/vocabulary.js";
import { validateKeys } from "../../core/validation.js";
import { resolveGraphicBounds } from "../../layout/canvas.js";
import {
  applyMaterializationPlan,
  planScaleGuideRematerialization
} from "../../materialization/dependencies.js";
import {
  canDeferScaleConsumerApplication,
  getScaleConsumerMaterializationMode
} from "../../materialization/marks.js";
import { mapScaleConsumerValues } from
  "../../materialization/scales/map.js";
import { resolveScaleMaterialization } from
  "../../materialization/scales/resolve.js";
import {
  findScale,
  findScaleConsumers,
  resolveConsumerValues,
  resolveSeriesLayoutScaleValues
} from "./consumers.js";

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

function resolveScaleChannel(id, consumers) {
  const channels = new Set(
    consumers.map(consumer => normalizePositionScaleChannel(consumer.channel))
  );
  if (channels.size !== 1) {
    throw new Error(`Scale "${id}" cannot be shared across channels.`);
  }
  return normalizePositionScaleChannel(consumers[0].channel);
}

export const rematerializeScale = action(
  {
    op: "rematerializeScale",
    description: "Recompute every concrete consumer of a scale."
  },
  function (args = {}) {
    validateOptions(args);
    const id = validateUserId(args.id, "Scale id");
    const scale = findScale(this, id);
    const consumers = findScaleConsumers(this, id);
    if (consumers.length === 0) {
      throw new Error(`Scale "${id}" has no supported consumers.`);
    }
    const channel = resolveScaleChannel(id, consumers);
    const valuesByConsumer = consumers.map(consumer => ({
      consumer,
      values: resolveConsumerValues(this, consumer),
      seriesLayout: resolveSeriesLayoutScaleValues(this, consumer)
    }));
    const resolvedScale = resolveScaleMaterialization({
      id,
      scale,
      channel,
      consumers,
      valuesByConsumer,
      bounds: ["color", "strokeDash", "shape", "size", "opacity", "xOffset", "yOffset"]
        .includes(channel)
        ? undefined
        : resolveGraphicBounds(this),
      resolvedScales: this.resolvedScales,
      markConfigs: this.markConfigs
    });
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
          next = next.rematerializePointMark({ id: consumer.layer.id });
        }
        continue;
      }
      if (materializationMode === "defer") continue;
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
