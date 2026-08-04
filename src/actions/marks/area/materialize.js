import {
  deriveCenteredAreaSeries,
  deriveAreaSeries,
  deriveDensityAreaSeries,
  layoutDensityAreaSeries
} from "../../../grammar/areaSeries.js";
import {
  mapContinuousScaleValues,
  mapOrdinalValues
} from "../../../grammar/scales/index.js";
import { buildAreaCurvePathCommands } from
  "../../../grammar/curveCommands.js";
import { buildLinearPathCommands } from
  "../../../grammar/pathCommands.js";
import { buildCategoricalDensityPaths } from
  "../../../grammar/categoricalDensity.js";

function resolveAreaPaths({
  derived,
  densityTransform,
  categoricalDensity,
  xScale,
  yScale,
  densityScale,
  layout,
  curve
}) {
  if (categoricalDensity) {
    return buildCategoricalDensityPaths(derived, {
      categoryScale: densityTransform.placement.channel === "x" ? xScale : yScale,
      valueScale: densityTransform.placement.channel === "x" ? yScale : xScale,
      curve
    });
  }
  return derived.series.map(series => {
    if (densityTransform === undefined && derived.orientation === "horizontal") {
      const y = mapContinuousScaleValues(
        series.values.map(value => value.y),
        yScale
      );
      const lower = mapContinuousScaleValues(
        series.values.map(value => value.x),
        xScale
      );
      const upper = mapContinuousScaleValues(
        series.values.map(value => value.x2),
        xScale
      );
      return buildAreaCurvePathCommands(
        y.map((value, index) => ({ x: lower[index], y: value })),
        y.map((value, index) => ({ x: upper[index], y: value })),
        curve,
        { independentAxis: "y" }
      );
    }
    if (densityTransform !== undefined && derived.mode === "x-density") {
      const y = mapContinuousScaleValues(
        series.values.map(value => value.y),
        yScale
      );
      const upper = mapContinuousScaleValues(
        series.values.map(value => value.x),
        xScale
      );
      const baseline = mapContinuousScaleValues([0], densityScale)[0];
      if (curve === "linear") {
        return buildLinearPathCommands([
          { x: baseline, y: y[0] },
          ...y.map((value, index) => ({ x: upper[index], y: value })),
          { x: baseline, y: y.at(-1) }
        ], { close: true });
      }
      return buildAreaCurvePathCommands(
        y.map(value => ({ x: baseline, y: value })),
        y.map((value, index) => ({ x: upper[index], y: value })),
        curve,
        { independentAxis: "y" }
      );
    }
    const x = mapContinuousScaleValues(
      series.values.map(value => value.x),
      xScale
    );
    const lowerValues = densityTransform === undefined
      ? derived.mode === "y-center"
        ? series.values.map(value => value.lower)
        : series.values.map(value => value.y)
      : derived.mode === "y-density"
        ? series.values.map(value => value.lower)
        : series.values.map(value => value.y);
    const lower = mapContinuousScaleValues(lowerValues, yScale);
    const upperValues = densityTransform === undefined
      ? derived.mode === "y-center"
        ? series.values.map(value => value.upper)
        : series.values.map(value => value.y2)
      : series.values.map(value => value.upper);
    const upper = mapContinuousScaleValues(upperValues, yScale);
    if (densityTransform !== undefined && layout === "overlay") {
      const baseline = mapContinuousScaleValues([0], yScale)[0];
      if (curve === "linear") {
        return buildLinearPathCommands([
          { x: x[0], y: baseline },
          ...x.map((value, index) => ({ x: value, y: upper[index] })),
          { x: x.at(-1), y: baseline }
        ], { close: true });
      }
      return buildAreaCurvePathCommands(
        x.map(value => ({ x: value, y: baseline })),
        x.map((value, index) => ({ x: value, y: upper[index] })),
        curve
      );
    }
    return buildAreaCurvePathCommands(
      x.map((value, index) => ({ x: value, y: lower[index] })),
      x.map((value, index) => ({ x: value, y: upper[index] })),
      curve
    );
  });
}

export function resolveAreaMaterialization({
  rows,
  layer,
  densityTransform,
  resolvedScales,
  config
}) {
  const xScale = resolvedScales[layer.encoding.x.scale];
  const yScale = resolvedScales[layer.encoding.y.scale];
  const centered = densityTransform === undefined &&
    layer.encoding?.y?.stack === "center";
  const rawDerived = densityTransform === undefined
    ? centered
      ? deriveCenteredAreaSeries(rows, layer)
      : deriveAreaSeries(rows, layer)
    : deriveDensityAreaSeries(rows, layer, densityTransform);
  const colorEncoding = layer.encoding?.color;
  const layout = colorEncoding?.layout ?? "overlay";
  const categoricalDensity = densityTransform?.placement?.type === "category";
  const derived = densityTransform === undefined || categoricalDensity
    ? rawDerived
    : layoutDensityAreaSeries(rawDerived, layout);
  const densityScale = densityTransform === undefined || categoricalDensity
    ? undefined
    : derived.mode === "y-density" ? yScale : xScale;
  if (
    densityScale !== undefined &&
    (densityScale.domain[0] > 0 || densityScale.domain[1] < 0)
  ) {
    throw new Error(`Density area mark "${layer.id}" requires a scale domain containing zero.`);
  }
  const paths = resolveAreaPaths({
    derived,
    densityTransform,
    categoricalDensity,
    xScale,
    yScale,
    densityScale,
    layout,
    curve: config.curve ?? "linear"
  });
  const fills = config.errorBand?.fill !== undefined
    ? paths.map(() => config.errorBand.fill)
    : colorEncoding?.scale === undefined
      ? paths.map(() => config.fill)
      : mapOrdinalValues(
          derived.series.map(series => series.key[colorEncoding.field]),
          resolvedScales[colorEncoding.scale].domain,
          resolvedScales[colorEncoding.scale].range
        );
  return { paths, fills };
}
