import {
  isContinuousColorScaleType,
  isDiscretePositionScaleType,
  isDiscretizedColorScaleType,
  isOrdinalScaleType,
  isTransformedScaleType,
  normalizeTransformParameters,
  resolveColorRange,
  resolveContinuousDomain,
  resolveDiscretePositionScale,
  resolveDiscretizedColorScale,
  resolveOpacityRange,
  resolveOrdinalDomain,
  resolveOrdinalOffsetScale,
  resolveOrdinalPositionScale,
  resolveScaleRange,
  resolveSequentialColorStops,
  resolveShapeRange,
  resolveSizeRange,
  resolveStrokeDashRange,
  resolveTransformedDomain,
  SCALE_ROLES,
  validateLinearScaleType,
  validateOrdinalScaleType,
  validateScaleTypeForRole,
  validateTimeScaleType
} from "../../grammar/scales/index.js";
import { resolveArcAutoPositionRange } from "./policies/arc.js";
import {
  resolveBinnedBarDomain,
  resolveOffsetScalePolicy,
  resolveTemporalBarBand
} from "./policies/bar.js";
import { resolveSeriesLayoutDomain } from "./policies/series.js";
import { OFFSET_POSITION_CHANNELS } from "../../core/vocabulary.js";

function resolveDefaultDomain({
  scale,
  allValues,
  isOrdinalAppearance,
  isOrdinalOffset,
  isOrdinalPosition,
  isDiscretePosition
}) {
  if (
    isOrdinalAppearance ||
    isOrdinalOffset ||
    isOrdinalPosition ||
    isDiscretePosition
  ) {
    return resolveOrdinalDomain(scale.domain, allValues);
  }
  if (isTransformedScaleType(scale.type)) {
    return resolveTransformedDomain({
      type: scale.type,
      domain: scale.domain,
      values: allValues,
      nice: scale.nice ?? false,
      zero: scale.zero ?? false,
      ...(scale.base === undefined ? {} : { base: scale.base }),
      ...(scale.exponent === undefined ? {} : { exponent: scale.exponent }),
      ...(scale.constant === undefined ? {} : { constant: scale.constant })
    });
  }
  return resolveContinuousDomain({
    domain: scale.domain,
    values: allValues,
    type: scale.type,
    nice: scale.nice,
    zero: scale.zero
  });
}

function resolveRange({
  scale,
  channel,
  domain,
  bounds,
  consumers,
  markConfigs,
  isSequentialColor,
  isDiscretizedColor,
  isOrdinalOffset,
  discretizedScale
}) {
  if (channel === "color") {
    if (isDiscretizedColor) return discretizedScale.range;
    if (isSequentialColor) return resolveSequentialColorStops(scale.range);
    return resolveColorRange(scale.range, domain.length);
  }
  if (channel === "strokeDash") return resolveStrokeDashRange(scale.range);
  if (channel === "shape") return resolveShapeRange(scale.range);
  if (channel === "size") return resolveSizeRange(scale.range);
  if (channel === "opacity") return resolveOpacityRange(scale.range);
  if (isOrdinalOffset) return undefined;
  return resolveArcAutoPositionRange({
    consumers,
    scale,
    channel,
    domain,
    range: resolveScaleRange(scale.range, channel, bounds),
    markConfigs
  });
}

function resolveContinuousScale({
  scale,
  domain,
  range,
  isSequentialColor,
  isOrdinalAppearance
}) {
  return {
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
      ? {
          base: normalizeTransformParameters("log", {
            ...(scale.base === undefined ? {} : { base: scale.base })
          }).base
        }
      : scale.type === "pow"
        ? {
            exponent: normalizeTransformParameters("pow", {
              ...(scale.exponent === undefined
                ? {}
                : { exponent: scale.exponent })
            }).exponent
          }
        : scale.type === "symlog"
          ? {
              constant: normalizeTransformParameters("symlog", {
                ...(scale.constant === undefined
                  ? {}
                  : { constant: scale.constant })
              }).constant
            }
          : {}),
    ...(isSequentialColor ? { interpolate: scale.interpolate ?? "rgb" } : {}),
    ...(Object.hasOwn(scale, "unknown") ? { unknown: scale.unknown } : {})
  };
}

function reverseResolvedScale(scale) {
  const range = [...scale.range].reverse();
  const direction = Math.sign(range[1] - range[0]) || 1;
  const offset = scale.start === undefined
    ? undefined
    : Math.abs(scale.start - scale.range[0]);
  return {
    ...scale,
    range,
    ...(scale.step === undefined ? {} : { step: -scale.step }),
    ...(offset === undefined ? {} : { start: range[0] + direction * offset })
  };
}

export function resolveScaleMaterialization({
  id,
  scale,
  channel,
  consumers,
  valuesByConsumer,
  bounds,
  resolvedScales,
  markConfigs
}) {
  const allValues = valuesByConsumer
    .flatMap(item => item.values)
    .filter(value => value !== undefined);
  const isSequentialColor = channel === "color" &&
    isContinuousColorScaleType(scale.type);
  const isDiscretizedColor = channel === "color" &&
    isDiscretizedColorScaleType(scale.type);
  const isOrdinalAppearance =
    ["color", "strokeDash", "shape"].includes(channel) &&
    isOrdinalScaleType(scale.type);
  const isOrdinalOffset = OFFSET_POSITION_CHANNELS.includes(channel);
  const isOrdinalPosition =
    !isOrdinalAppearance && !isOrdinalOffset && isOrdinalScaleType(scale.type);
  const isDiscretePosition =
    !isOrdinalAppearance &&
    !isOrdinalOffset &&
    isDiscretePositionScaleType(scale.type);

  let discretizedScale;
  if (isDiscretizedColor) {
    discretizedScale = resolveDiscretizedColorScale({
      type: scale.type,
      domain: scale.domain,
      range: scale.range,
      values: allValues
    });
  }
  const binnedDomain = isDiscretizedColor
    ? undefined
    : resolveBinnedBarDomain({
        valuesByConsumer,
        channel,
        scale,
        id,
        allValues
      });
  const seriesLayouts = valuesByConsumer.map(item => item.seriesLayout);
  const seriesDomain = isDiscretizedColor || binnedDomain !== undefined
    ? undefined
    : resolveSeriesLayoutDomain({
        id,
        scale,
        valuesByConsumer,
        seriesLayouts
      });
  const domain = isDiscretizedColor
    ? discretizedScale.domain
    : binnedDomain ?? seriesDomain ?? resolveDefaultDomain({
        scale,
        allValues,
        isOrdinalAppearance,
        isOrdinalOffset,
        isOrdinalPosition,
        isDiscretePosition
      });
  const range = resolveRange({
    scale,
    channel,
    domain,
    bounds,
    consumers,
    markConfigs,
    isSequentialColor,
    isDiscretizedColor,
    isOrdinalOffset,
    discretizedScale
  });
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
          ...resolveOffsetScalePolicy({
            consumers,
            resolvedScales,
            markConfigs,
            id,
            channel
          }),
          channel
        })
      : isDiscretePosition
        ? resolveDiscretePositionScale({
            type: scale.type,
            domain: scale.domain,
            values: allValues,
            range: channel === "theta" && consumers.every(
              consumer => consumer.layer.mark?.type === "arc"
            ) ? range : scale.range,
            channel,
            bounds,
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
              bounds,
              unknown: scale.unknown
            })
          : resolveContinuousScale({
              scale,
              domain,
              range,
              isSequentialColor,
              isOrdinalAppearance
            });
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
  return scale.reverse === true
    ? reverseResolvedScale(resolvedScale)
    : resolvedScale;
}
