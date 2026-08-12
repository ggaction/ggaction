import {
  deriveLineSeries,
  deriveLineSeriesFieldValues
} from "../../../grammar/lineSeries.js";
import {
  mapContinuousScaleValues,
  mapOrdinalValues,
  normalizeStrokeDashPattern
} from "../../../grammar/scales/index.js";
import { buildCurvePathCommands } from
  "../../../grammar/curveCommands.js";
import { buildPolarLinePathCommands } from
  "../../../grammar/polarLineCommands.js";
import { resolvePolarFrame } from "../../../grammar/polar.js";
import { materializeParallelRows } from
  "../../../grammar/parallelCoordinates.js";
import { mapScaleConsumerValues } from
  "../../../materialization/scales/map.js";

function existingValue(children, index, property, fallback) {
  return children[index]?.properties[property] ?? fallback;
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
  const mapAppearance = (channel, fallback) => {
    const encoding = layer.encoding?.[channel];
    if (encoding?.datum !== undefined) {
      return items.map(() => channel === "strokeDash"
        ? normalizeStrokeDashPattern(encoding.datum)
        : encoding.datum);
    }
    if (encoding?.scale === undefined) return items.map(fallback);
    return mapScaleConsumerValues(
      sourceRows.map(row => row[encoding.field]),
      resolvedScales[encoding.scale],
      channel
    );
  };
  return {
    commands: items.map(item => item.commands),
    strokes: mapAppearance(
      "color",
      (_, index) => config.stroke ??
        existingValue(existingChildren, index, "stroke", defaults.stroke)
    ),
    strokeWidths: mapAppearance(
      "strokeWidth",
      (_, index) => config.strokeWidth ??
        existingValue(existingChildren, index, "strokeWidth", defaults.strokeWidth)
    ),
    strokeDashes: mapAppearance(
      "strokeDash",
      (_, index) => existingValue(existingChildren, index, "strokeDash", [])
    )
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
  const colorEncoding = layer.encoding?.color;
  const dashEncoding = layer.encoding?.strokeDash;
  const widthEncoding = layer.encoding?.strokeWidth;
  const strokes = colorEncoding?.scale === undefined
    ? commands.map((_, index) => config.stroke ??
        existingValue(existingChildren, index, "stroke", defaults.stroke))
    : mapOrdinalValues(
        derived.series.map(series => series.key[colorEncoding.field]),
        resolvedScales[colorEncoding.scale].domain,
        resolvedScales[colorEncoding.scale].range
      );
  const strokeWidths = widthEncoding?.scale === undefined
    ? commands.map((_, index) => config.strokeWidth ??
        existingValue(existingChildren, index, "strokeWidth", defaults.strokeWidth))
    : mapContinuousScaleValues(
        deriveLineSeriesFieldValues(rows, layer, derived, widthEncoding.field),
        resolvedScales[widthEncoding.scale]
      );
  const strokeDashes = dashEncoding?.datum !== undefined
    ? commands.map(() => normalizeStrokeDashPattern(dashEncoding.datum))
    : dashEncoding?.scale === undefined
      ? commands.map((_, index) =>
          existingValue(existingChildren, index, "strokeDash", []))
      : mapOrdinalValues(
          derived.series.map(series => series.key[dashEncoding.field]),
          resolvedScales[dashEncoding.scale].domain,
          resolvedScales[dashEncoding.scale].range
        );
  return { commands, strokes, strokeWidths, strokeDashes };
}
