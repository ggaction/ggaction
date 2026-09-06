import {
  deriveLineSeries
} from "../../../grammar/lineSeries.js";
import {
  mapContinuousScaleValues,
  normalizeStrokeDashPattern
} from "../../../grammar/scales/index.js";
import { buildCurvePathCommands } from
  "../../../grammar/curveCommands.js";
import { buildPolarLinePathCommands } from
  "../../../grammar/polarLineCommands.js";
import { resolvePolarFrame } from "../../../grammar/polar.js";
import { derivePathSeriesFieldValues } from "../../../grammar/pathSeries.js";
import { materializeParallelRows } from
  "../../../grammar/parallelCoordinates.js";
import { mapScaleConsumerValues } from
  "../../../materialization/scales/map.js";

function existingValue(children, index, property, fallback) {
  return children[index]?.properties[property] ?? fallback;
}

function appearanceMapper(layer, scales, fieldValues) {
  return (channel, fallback) => {
    const encoding = layer.encoding?.[channel];
    if (encoding?.datum !== undefined) {
      return fallback.map(() => normalizeStrokeDashPattern(encoding.datum));
    }
    if (encoding?.scale === undefined) return fallback;
    return mapScaleConsumerValues(fieldValues(encoding.field, channel), scales[encoding.scale], channel);
  };
}

export function resolveParallelLineMaterialization({
  rows,
  parallel,
  layer,
  resolvedScales,
  bounds,
  config,
  existingChildren,
  defaults
}) {
  const items = materializeParallelRows(
    rows,
    parallel.dimensions,
    resolvedScales,
    bounds,
    parallel
  );
  const sourceRows = items.map(item => rows[item.sourceRowIndex]);
  const mapAppearance = appearanceMapper(layer, resolvedScales,
    field => sourceRows.map(row => row[field]));
  return {
    commands: items.map(item => item.commands),
    strokes: mapAppearance(
      "color",
      items.map((_, index) => config.stroke ??
        existingValue(existingChildren, index, "stroke", defaults.stroke))
    ),
    strokeWidths: mapAppearance(
      "strokeWidth",
      items.map((_, index) => config.strokeWidth ??
        existingValue(existingChildren, index, "strokeWidth", defaults.strokeWidth))
    ),
    strokeDashes: mapAppearance(
      "strokeDash",
      items.map((_, index) => existingValue(existingChildren, index, "strokeDash", []))
    ),
    opacities: mapAppearance("opacity", config.opacity)
  };
}

export function resolvePositionedLineMaterialization({
  rows,
  layer,
  resolvedScales,
  xBinBoundaries,
  bounds,
  config,
  existingChildren,
  polar,
  defaults
}) {
  const xScaleId = layer.encoding?.x?.scale;
  const yScaleId = layer.encoding?.y?.scale;
  const thetaScaleId = layer.encoding?.theta?.scale;
  const radiusScaleId = layer.encoding?.radius?.scale;
  const lineOptions = polar
    ? { thetaDomain: resolvedScales[thetaScaleId].domain }
    : layer.encoding?.x?.bin === undefined
      ? undefined
      : { xBinBoundaries };
  const derived = deriveLineSeries(rows, layer, lineOptions);
  const commands = polar
    ? derived.series.map(series => buildPolarLinePathCommands({
        series: series.values,
        thetaFieldType: derived.thetaFieldType,
        thetaScale: resolvedScales[thetaScaleId],
        radiusScale: resolvedScales[radiusScaleId],
        frame: resolvePolarFrame(bounds),
        closed: config.closed ?? false
      }))
    : derived.series.map(series => {
        const x = mapContinuousScaleValues(
          series.values.map(value => value.x),
          resolvedScales[xScaleId]
        );
        const y = mapContinuousScaleValues(
          series.values.map(value => value.y),
          resolvedScales[yScaleId]
        );
        return buildCurvePathCommands(
          series.values.map((_, index) => ({ x: x[index], y: y[index] })),
          config.curve ?? "linear"
        );
      });
  const appearance = appearanceMapper(layer, resolvedScales,
    (field, channel) => derivePathSeriesFieldValues(rows, derived.series, field, channel));
  return {
    commands,
    strokes: appearance("color", commands.map((_, index) => config.stroke ??
      existingValue(existingChildren, index, "stroke", defaults.stroke))),
    strokeWidths: appearance("strokeWidth", commands.map((_, index) => config.strokeWidth ??
      existingValue(existingChildren, index, "strokeWidth", defaults.strokeWidth))),
    strokeDashes: appearance("strokeDash", commands.map((_, index) =>
      existingValue(existingChildren, index, "strokeDash", []))),
    opacities: appearance("opacity", config.opacity)
  };
}
