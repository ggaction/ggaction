import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateKeys } from "../../core/validation.js";
import { resolveHistogramBins } from "../../grammar/histogram.js";
import {
  mapLinearValues,
  mapOrdinalValues,
  resolveColorRange,
  resolveContinuousDomain,
  resolveOrdinalDomain,
  resolveOrdinalOffsetScale,
  resolveOrdinalPositionScale,
  resolveScaleRange,
  resolveStrokeDashRange,
  validateLinearScaleType,
  validateOrdinalScaleType,
  validateTimeScaleType
} from "../../grammar/scales.js";
import {
  findScale,
  findScaleConsumers,
  resolveConsumerValues,
  resolveHistogramCountValues
} from "./consumers.js";
import {
  applyMaterializationPlan,
  planScaleGuideRematerialization
} from "../../materialization/dependencies.js";

const OPTIONS = Object.freeze(["id"]);

function validateOptions(args) {
  validateKeys(args, OPTIONS, "rematerializeScale");
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
    const channels = new Set(consumers.map(consumer => consumer.channel));
    if (channels.size !== 1) {
      throw new Error(`Scale "${id}" cannot be shared across channels.`);
    }

    const channel = consumers[0].channel;
    const valuesByConsumer = consumers.map(consumer => ({
      consumer,
      values: resolveConsumerValues(this, consumer)
    }));
    const allValues = valuesByConsumer.flatMap(item => item.values);
    const isOrdinalAppearance = channel === "color" || channel === "strokeDash";
    const isOrdinalOffset = channel === "xOffset";
    const isOrdinalPosition =
      !isOrdinalAppearance && !isOrdinalOffset && scale.type === "ordinal";
    const binnedBars = valuesByConsumer.filter(
      ({ consumer }) =>
        consumer.layer.mark?.type === "bar" &&
        consumer.encoding.bin !== undefined
    );
    const countBars = valuesByConsumer.filter(
      ({ consumer }) =>
        consumer.layer.mark?.type === "bar" &&
        consumer.channel === "y" &&
        consumer.encoding.aggregate === "count" &&
        consumer.encoding.stack === "zero"
    );
    let domain;

    if (binnedBars.length > 0) {
      if (channel !== "x" || binnedBars.length !== valuesByConsumer.length) {
        throw new Error(
          `Binned scale "${id}" cannot be shared with an unbinned consumer.`
        );
      }
      const maxBins = new Set(
        binnedBars.map(({ consumer }) => consumer.encoding.bin.maxBins)
      );
      if (maxBins.size !== 1) {
        throw new Error(
          `Binned scale "${id}" requires one shared maxBins value.`
        );
      }
      domain = resolveHistogramBins({
        values: allValues,
        maxBins: [...maxBins][0],
        domain: scale.domain,
        nice: scale.nice ?? true,
        zero: scale.zero ?? false
      }).domain;
    } else if (countBars.length > 0) {
      if (channel !== "y" || countBars.length !== valuesByConsumer.length) {
        throw new Error(
          `Histogram count scale "${id}" cannot be shared with another policy.`
        );
      }
      const counts = countBars.flatMap(({ consumer }) =>
        resolveHistogramCountValues(this, consumer)
      );
      domain = resolveContinuousDomain({
        domain: scale.domain,
        values: counts,
        type: scale.type,
        nice: scale.nice,
        zero: scale.zero
      });
    } else {
      domain = isOrdinalAppearance || isOrdinalOffset || isOrdinalPosition
        ? resolveOrdinalDomain(scale.domain, allValues)
        : resolveContinuousDomain({
            domain: scale.domain,
            values: allValues,
            type: scale.type,
            nice: scale.nice,
            zero: scale.zero
          });
    }

    let range;
    if (channel === "color") range = resolveColorRange(scale.range);
    else if (channel === "strokeDash") range = resolveStrokeDashRange(scale.range);
    else if (isOrdinalOffset) range = undefined;
    else {
      range = resolveScaleRange(
        scale.range,
        channel,
        this.context.currentGraphicBounds
      );
    }

    const resolvedScale = isOrdinalOffset
      ? resolveOrdinalOffsetScale({
          domain: scale.domain,
          values: allValues,
          range: scale.range,
          parentBandwidth: (() => {
            const bandwidths = consumers.map(consumer => {
              const xScaleId = consumer.layer.encoding?.x?.scale;
              return this.resolvedScales[xScaleId]?.bandwidth;
            });
            if (
              bandwidths.some(value => !Number.isFinite(value)) ||
              new Set(bandwidths).size !== 1
            ) {
              throw new Error(
                `xOffset scale "${id}" requires one shared resolved x bandwidth.`
              );
            }
            return bandwidths[0];
          })()
        })
      : isOrdinalPosition
        ? resolveOrdinalPositionScale({
            domain: scale.domain,
            values: allValues,
            range: scale.range,
            channel,
            bounds: this.context.currentGraphicBounds
          })
        : {
            type: isOrdinalAppearance
              ? validateOrdinalScaleType(scale.type)
              : scale.type === "time"
                ? validateTimeScaleType(scale.type)
                : validateLinearScaleType(scale.type),
            domain,
            range
          };
    let next = this._withResolvedScale(id, resolvedScale);

    for (const { consumer, values } of valuesByConsumer) {
      if (["line", "bar"].includes(consumer.layer.mark?.type)) continue;
      next = next.editGraphics({
        target: consumer.layer.id,
        property: channel === "color" ? "fill" : channel,
        value: isOrdinalAppearance
          ? mapOrdinalValues(values, domain, range)
          : mapLinearValues(values, domain, range)
      });
    }

    return applyMaterializationPlan(
      next,
      planScaleGuideRematerialization(next, id)
    );
  }
);
