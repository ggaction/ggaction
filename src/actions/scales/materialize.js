import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateKeys } from "../../core/validation.js";
import { resolveHistogramBins } from "../../grammar/histogram.js";
import { resolveGraphicBounds } from "../../layout/canvas.js";
import { normalizeOffsetPadding } from "../../grammar/bars/geometry.js";
import {
  BAR_GRAINS,
  resolveBarChannels,
  resolveBarGrain
} from "../../grammar/bars/policy.js";
import {
  mapContinuousScaleValues,
  mapDiscretizedColors,
  mapSequentialColors,
  mapOrdinalValues,
  resolveColorRange,
  resolveDiscretizedColorScale,
  resolveContinuousDomain,
  resolveOrdinalDomain,
  resolveOrdinalOffsetScale,
  resolveOrdinalPositionScale,
  resolveDiscretePositionScale,
  resolveScaleRange,
  resolveOpacityRange,
  resolveSequentialColorStops,
  resolveShapeRange,
  resolveSizeRange,
  resolveStrokeDashRange,
  validateLinearScaleType,
  validateOrdinalScaleType,
  validateTimeScaleType,
  isDiscretePositionScaleType,
  isTransformedScaleType,
  normalizeTransformParameters,
  resolveTransformedDomain,
  SCALE_ROLES,
  validateScaleTypeForRole
} from "../../grammar/scales.js";
import {
  findScale,
  findScaleConsumers,
  resolveConsumerValues,
  resolveSeriesLayoutScaleValues
} from "./consumers.js";
import {
  applyMaterializationPlan,
  planScaleGuideRematerialization
} from "../../materialization/dependencies.js";

const OPTIONS = Object.freeze(["id", "guides"]);

function resolveTemporalBarBand(consumers, domain, range, values) {
  const temporalBars = consumers.filter(consumer => {
    const channels = resolveBarChannels(consumer.layer);
    return resolveBarGrain(consumer.layer) === BAR_GRAINS.aggregate &&
      channels?.category === consumer.channel &&
      consumer.encoding.fieldType === "temporal";
  });
  if (temporalBars.length === 0) return undefined;
  if (temporalBars.length !== consumers.length) {
    throw new Error("A temporal bar position scale cannot share a non-bar layout policy.");
  }
  const ordered = [...new Set(values)].sort((left, right) => left - right);
  if (ordered.length < 2) {
    throw new Error("Temporal bar position requires at least two distinct values.");
  }
  const minimumGap = Math.min(
    ...ordered.slice(1).map((value, index) => value - ordered[index])
  );
  const domainSpan = Math.abs(domain[1] - domain[0]);
  if (!(minimumGap > 0) || !(domainSpan > 0)) {
    throw new Error("Temporal bar position requires an increasing time domain.");
  }
  const direction = Math.sign(range[1] - range[0]) || 1;
  const estimatedBandwidth = Math.abs(range[1] - range[0]) * minimumGap /
    (domainSpan + minimumGap);
  const resolvedRange = [
    range[0] + direction * estimatedBandwidth / 2,
    range[1] - direction * estimatedBandwidth / 2
  ];
  const positions = ordered.map(value =>
    resolvedRange[0] +
      (value - domain[0]) / (domain[1] - domain[0]) *
      (resolvedRange[1] - resolvedRange[0])
  );
  const bandwidth = Math.min(
    ...positions.slice(1).map((value, index) => Math.abs(value - positions[index]))
  );
  return {
    bandwidth,
    range: resolvedRange
  };
}

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
    if (args.guides !== undefined && typeof args.guides !== "boolean") {
      throw new TypeError("rematerializeScale guides must be a boolean.");
    }
    const id = validateUserId(args.id, "Scale id");
    const scale = findScale(this, id);
    const consumers = findScaleConsumers(this, id);

    if (consumers.length === 0) {
      throw new Error(`Scale "${id}" has no supported consumers.`);
    }
    const channels = new Set(
      consumers.map(consumer =>
        consumer.channel === "x2"
          ? "x"
          : consumer.channel === "y2" ? "y" : consumer.channel
      )
    );
    if (channels.size !== 1) {
      throw new Error(`Scale "${id}" cannot be shared across channels.`);
    }

    const channel = consumers[0].channel === "x2"
      ? "x"
      : consumers[0].channel === "y2" ? "y" : consumers[0].channel;
    const valuesByConsumer = consumers.map(consumer => ({
      consumer,
      values: resolveConsumerValues(this, consumer)
    }));
    const allValues = valuesByConsumer
      .flatMap(item => item.values)
      .filter(value => value !== undefined);
    const isSequentialColor = channel === "color" && scale.type === "sequential";
    const isDiscretizedColor = channel === "color" &&
      ["quantize", "quantile", "threshold"].includes(scale.type);
    const isOrdinalAppearance =
      ["color", "strokeDash", "shape"].includes(channel) &&
      scale.type === "ordinal";
    const isOrdinalOffset = channel === "xOffset";
    const isOrdinalPosition =
      !isOrdinalAppearance && !isOrdinalOffset && scale.type === "ordinal";
    const isDiscretePosition =
      !isOrdinalAppearance && !isOrdinalOffset &&
      isDiscretePositionScaleType(scale.type);
    const binnedBars = valuesByConsumer.filter(
      ({ consumer }) =>
        consumer.layer.mark?.type === "bar" &&
        consumer.encoding.bin !== undefined
    );
    const seriesLayouts = valuesByConsumer.map(({ consumer }) =>
      resolveSeriesLayoutScaleValues(this, consumer)
    );
    let domain;

    let discretizedScale;
    if (isDiscretizedColor) {
      discretizedScale = resolveDiscretizedColorScale({
        type: scale.type,
        domain: scale.domain,
        range: scale.range,
        values: allValues
      });
      domain = discretizedScale.domain;
    } else if (binnedBars.length > 0) {
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
    } else if (seriesLayouts.some(Boolean)) {
      const activeLayouts = seriesLayouts.filter(Boolean);
      const layouts = new Set(activeLayouts.map(item => item.layout));
      if (layouts.size !== 1) {
        throw new Error(`Series layout scale "${id}" requires one layout policy.`);
      }
      const layoutConsumers = valuesByConsumer.filter(
        (_, index) => seriesLayouts[index] !== undefined
      );
      const directConsumers = valuesByConsumer.filter(
        (_, index) => seriesLayouts[index] === undefined
      );
      const compatibleDirect = directConsumers.every(({ consumer }) =>
        layoutConsumers.every(({ consumer: layoutConsumer }) => {
          const aggregate = layoutConsumer.encoding.aggregate;
          return aggregate !== "count" &&
            consumer.encoding.fieldType === "quantitative" &&
            consumer.encoding.field === layoutConsumer.encoding.field;
        })
      );
      if (!compatibleDirect) {
        throw new Error(
          `Series layout scale "${id}" cannot be shared with another policy.`
        );
      }
      const layout = activeLayouts[0].layout;
      const values = [
        ...activeLayouts.flatMap(item => item.values),
        ...directConsumers.flatMap(item => item.values)
      ];
      domain = resolveContinuousDomain({
        domain: scale.domain,
        values,
        type: scale.type,
        nice: layout === "fill" && scale.domain === "auto"
          ? false
          : scale.nice,
        zero: layout === "fill" && scale.domain === "auto"
          ? false
          : scale.zero
      });
    } else {
      domain = isOrdinalAppearance || isOrdinalOffset || isOrdinalPosition ||
        isDiscretePosition
        ? resolveOrdinalDomain(scale.domain, allValues)
        : isTransformedScaleType(scale.type)
          ? resolveTransformedDomain({
              type: scale.type,
              domain: scale.domain,
              values: allValues,
              nice: scale.nice ?? false,
              zero: scale.zero ?? false,
              ...(scale.base === undefined ? {} : { base: scale.base }),
              ...(scale.exponent === undefined ? {} : { exponent: scale.exponent }),
              ...(scale.constant === undefined ? {} : { constant: scale.constant })
            })
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
      range = isDiscretizedColor
        ? discretizedScale.range
        : isSequentialColor
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

    let resolvedScale = isDiscretizedColor
      ? discretizedScale
      : isOrdinalOffset
      ? resolveOrdinalOffsetScale({
          domain: scale.domain,
          values: allValues,
          range: scale.range,
          parentBandwidth: (() => {
            const bandwidths = consumers.map(consumer => {
              if (consumer.layer.encoding?.x?.bin !== undefined) return 1;
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
          })(),
          ...(() => {
            const paddings = consumers.map(consumer => normalizeOffsetPadding(
              this.markConfigs[consumer.layer.id]?.xOffset
            ));
            const signatures = new Set(
              paddings.map(padding => JSON.stringify(padding))
            );
            if (signatures.size !== 1) {
              throw new Error(
                `xOffset scale "${id}" requires one shared padding policy.`
              );
            }
            return paddings[0];
          })()
        })
      : isDiscretePosition
        ? resolveDiscretePositionScale({
            type: scale.type,
            domain: scale.domain,
            values: allValues,
            range: scale.range,
            channel,
            bounds: resolveGraphicBounds(this),
            ...(scale.type === "band"
              ? {
                  paddingInner: scale.paddingInner,
                  paddingOuter: scale.paddingOuter
                }
              : { padding: scale.padding }),
            align: scale.align,
            unknown: scale.unknown
          })
        : isOrdinalPosition
        ? resolveOrdinalPositionScale({
            domain: scale.domain,
            values: allValues,
            range: scale.range,
            channel,
            bounds: resolveGraphicBounds(this),
            unknown: scale.unknown
          })
        : {
            type: isSequentialColor
              ? "sequential"
              : isOrdinalAppearance
                ? validateOrdinalScaleType(scale.type)
                : scale.type === "time"
                  ? validateTimeScaleType(scale.type)
                  : isTransformedScaleType(scale.type)
                    ? validateScaleTypeForRole(
                        scale.type,
                        SCALE_ROLES.quantitativePosition
                      )
                    : validateLinearScaleType(scale.type),
            domain,
            range,
            ...(scale.clamp === undefined ? {} : { clamp: scale.clamp }),
            ...(scale.type === "log"
              ? { base: normalizeTransformParameters("log", {
                  ...(scale.base === undefined ? {} : { base: scale.base })
                }).base }
              : scale.type === "pow"
                ? { exponent: normalizeTransformParameters("pow", {
                    ...(scale.exponent === undefined
                      ? {}
                      : { exponent: scale.exponent })
                  }).exponent }
                : scale.type === "symlog"
                  ? { constant: normalizeTransformParameters("symlog", {
                      ...(scale.constant === undefined
                        ? {}
                        : { constant: scale.constant })
                    }).constant }
                  : {}),
            ...(isSequentialColor ? { interpolate: scale.interpolate ?? "rgb" } : {}),
            ...(Object.hasOwn(scale, "unknown")
              ? { unknown: scale.unknown }
              : {})
          };
    if (Object.hasOwn(scale, "unknown") && !Object.hasOwn(resolvedScale, "unknown")) {
      resolvedScale = { ...resolvedScale, unknown: scale.unknown };
    }
    if (scale.type === "time" && ["x", "y"].includes(channel)) {
      const temporalBarBand = resolveTemporalBarBand(
        consumers,
        domain,
        range,
        allValues
      );
      if (temporalBarBand !== undefined) {
        resolvedScale = {
          ...resolvedScale,
          range: temporalBarBand.range,
          bandwidth: temporalBarBand.bandwidth
        };
      }
    }
    if (scale.reverse === true) {
      const range = [...resolvedScale.range].reverse();
      const direction = Math.sign(range[1] - range[0]) || 1;
      const offset = resolvedScale.start === undefined
        ? undefined
        : Math.abs(resolvedScale.start - resolvedScale.range[0]);
      resolvedScale = {
        ...resolvedScale,
        range,
        ...(resolvedScale.step === undefined
          ? {}
          : { step: -resolvedScale.step }),
        ...(offset === undefined ? {} : { start: range[0] + direction * offset })
      };
    }
    let next = this._withResolvedScale(id, resolvedScale);

    for (const { consumer, values } of valuesByConsumer) {
      if (
        consumer.layer.mark?.type === "point" &&
        ["x", "y"].includes(channel)
      ) {
        next = next.rematerializePointMark({ id: consumer.layer.id });
        continue;
      }
      if (
        ["line", "bar", "area", "rule"].includes(consumer.layer.mark?.type) ||
        (consumer.layer.mark?.type === "point" &&
          ["x", "y"].includes(channel) && isOrdinalPosition) ||
        (consumer.layer.mark?.type === "point" && ["size", "shape"].includes(channel))
      ) continue;
      next = next.editGraphics({
        target: consumer.layer.id,
        property: channel === "color" ? "fill" : channel,
        value: isDiscretizedColor
          ? mapDiscretizedColors(values, resolvedScale)
          : isSequentialColor
          ? mapSequentialColors(values, resolvedScale.domain, resolvedScale.range, {
              interpolation: resolvedScale.interpolate,
              clamp: resolvedScale.clamp ?? false,
              ...(Object.hasOwn(resolvedScale, "unknown")
                ? { unknown: resolvedScale.unknown }
                : {})
            })
          : isOrdinalAppearance
            ? mapOrdinalValues(values, domain, resolvedScale.range, {
                ...(Object.hasOwn(resolvedScale, "unknown")
                  ? { unknown: resolvedScale.unknown }
                  : {})
              })
            : mapContinuousScaleValues(values, resolvedScale)
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
