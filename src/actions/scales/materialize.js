import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateKeys } from "../../core/validation.js";
import { resolveHistogramBins } from "../../grammar/histogram.js";
import { resolveGraphicBounds } from "../../layout/canvas.js";
import {
  mapLinearValues,
  mapSequentialColors,
  mapOrdinalValues,
  resolveColorRange,
  resolveContinuousDomain,
  resolveOrdinalDomain,
  resolveOrdinalOffsetScale,
  resolveOrdinalPositionScale,
  resolveScaleRange,
  resolveOpacityRange,
  resolveSequentialColorStops,
  resolveShapeRange,
  resolveSizeRange,
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
    const channels = new Set(
      consumers.map(consumer => consumer.channel === "y2" ? "y" : consumer.channel)
    );
    if (channels.size !== 1) {
      throw new Error(`Scale "${id}" cannot be shared across channels.`);
    }

    const channel = consumers[0].channel === "y2" ? "y" : consumers[0].channel;
    const valuesByConsumer = consumers.map(consumer => ({
      consumer,
      values: resolveConsumerValues(this, consumer)
    }));
    const allValues = valuesByConsumer.flatMap(item => item.values);
    const isSequentialColor = channel === "color" && scale.type === "sequential";
    const isOrdinalAppearance =
      ["color", "strokeDash", "shape"].includes(channel) &&
      scale.type === "ordinal";
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
      const binDefinitions = new Set(
        binnedBars.map(({ consumer }) => JSON.stringify(consumer.encoding.bin))
      );
      if (binDefinitions.size !== 1) {
        throw new Error(
          `Binned scale "${id}" requires one shared bin definition.`
        );
      }
      domain = resolveHistogramBins({
        values: allValues,
        bin: binnedBars[0].consumer.encoding.bin,
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
    if (channel === "color") {
      range = isSequentialColor
        ? resolveSequentialColorStops(scale.range)
        : resolveColorRange(scale.range, domain.length);
    }
    else if (channel === "strokeDash") range = resolveStrokeDashRange(scale.range);
    else if (channel === "shape") range = resolveShapeRange(scale.range);
    else if (channel === "size") range = resolveSizeRange(scale.range);
    else if (channel === "opacity") range = resolveOpacityRange(scale.range);
    else if (isOrdinalOffset) range = undefined;
    else {
      range = resolveScaleRange(
        scale.range,
        channel,
        resolveGraphicBounds(this)
      );
    }
    if (channel === "shape" && domain.length > range.length) {
      throw new Error(
        `Shape scale "${id}" requires at least one distinct shape per domain value.`
      );
    }

    let resolvedScale = isOrdinalOffset
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
            bounds: resolveGraphicBounds(this)
          })
        : {
            type: isSequentialColor
              ? "sequential"
              : isOrdinalAppearance
                ? validateOrdinalScaleType(scale.type)
                : scale.type === "time"
                  ? validateTimeScaleType(scale.type)
                  : validateLinearScaleType(scale.type),
            domain,
            range,
            ...(scale.clamp === undefined ? {} : { clamp: scale.clamp }),
            ...(isSequentialColor ? { interpolate: scale.interpolate ?? "rgb" } : {})
          };
    if (scale.reverse === true) {
      resolvedScale = {
        ...resolvedScale,
        range: [...resolvedScale.range].reverse(),
        ...(resolvedScale.step === undefined
          ? {}
          : { step: -resolvedScale.step })
      };
    }
    let next = this._withResolvedScale(id, resolvedScale);

    for (const { consumer, values } of valuesByConsumer) {
      if (
        ["line", "bar", "area"].includes(consumer.layer.mark?.type) ||
        (consumer.layer.mark?.type === "point" && ["size", "shape"].includes(channel))
      ) continue;
      next = next.editGraphics({
        target: consumer.layer.id,
        property: channel === "color" ? "fill" : channel,
        value: isSequentialColor
          ? mapSequentialColors(values, resolvedScale.domain, resolvedScale.range, {
              interpolation: resolvedScale.interpolate,
              clamp: resolvedScale.clamp ?? false
            })
          : isOrdinalAppearance
            ? mapOrdinalValues(values, domain, resolvedScale.range)
            : mapLinearValues(values, resolvedScale.domain, resolvedScale.range, {
                clamp: resolvedScale.clamp ?? false
              })
      });
    }

    const mixedPointIds = [...new Set(
      consumers
        .filter(consumer =>
          consumer.layer.mark?.type === "point" &&
          ["x", "y"].includes(channel) &&
          next.graphicSpec.objects[consumer.layer.id]?.type === "collection"
        )
        .map(consumer => consumer.layer.id)
    )];
    for (const pointId of mixedPointIds) {
      next = next.rematerializePointMark({ id: pointId });
    }

    return applyMaterializationPlan(
      next,
      planScaleGuideRematerialization(next, id)
    );
  }
);
