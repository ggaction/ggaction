import {
  deriveCenteredAreaSeries,
  deriveAreaSeries,
  deriveDensityAreaSeries,
  layoutDensityAreaSeries
} from "../../../grammar/areaSeries.js";
import {
  mapContinuousScaleValues,
  mapOrdinalPositionValues
} from "../../../grammar/scales/index.js";
import { mapScaleConsumerValues } from
  "../../../materialization/scales/map.js";
import { buildAreaCurvePathCommands } from
  "../../../grammar/curveCommands.js";
import { buildLinearPathCommands } from
  "../../../grammar/pathCommands.js";
import { buildCategoricalDensityPaths } from
  "../../../grammar/categoricalDensity.js";
import { derivePathSeriesFieldValues } from "../../../grammar/pathSeries.js";

function resolveAreaPaths({
  derived,
  densityTransform,
  categoricalDensity,
  xScale,
  yScale,
  densityScale,
  layout,
  curve,
  positions
}) {
  if (categoricalDensity) {
    return buildCategoricalDensityPaths(derived, {
      categoryScale: densityTransform.placement.channel === "x" ? xScale : yScale,
      valueScale: densityTransform.placement.channel === "x" ? yScale : xScale,
      curve,
      positions
    });
  }
  return derived.series.map((series, seriesIndex) => {
    const mapped = positions?.[seriesIndex];
    if (densityTransform === undefined && derived.orientation === "horizontal") {
      const y = mapped?.map(value => value.y) ?? (["point", "band"].includes(yScale.type) ? mapOrdinalPositionValues : mapContinuousScaleValues)(
        series.values.map(value => value.y), yScale
      );
      const lower = mapped?.map(value => value.x) ?? mapContinuousScaleValues(
        series.values.map(value => value.x),
        xScale
      );
      const upper = mapped?.map(value => value.x2) ?? mapContinuousScaleValues(
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
      const y = mapped?.map(value => value.y) ?? (["point", "band"].includes(yScale.type) ? mapOrdinalPositionValues : mapContinuousScaleValues)(
        series.values.map(value => value.y), yScale
      );
      const upper = mapped?.map(value => value.x) ?? mapContinuousScaleValues(
        series.values.map(value => value.x),
        xScale
      );
      const baselines = mapped?.map(value => value.x2) ?? y.map(() => mapContinuousScaleValues([0], densityScale)[0]);
      const baseline = baselines[0];
      if (curve === "linear" && baselines.every(value => value === baseline)) {
        return buildLinearPathCommands([
          { x: baseline, y: y[0] },
          ...y.map((value, index) => ({ x: upper[index], y: value })),
          { x: baseline, y: y.at(-1) }
        ], { close: true });
      }
      return buildAreaCurvePathCommands(
        y.map((value, index) => ({ x: baselines[index], y: value })),
        y.map((value, index) => ({ x: upper[index], y: value })),
        curve,
        { independentAxis: "y" }
      );
    }
    const x = mapped?.map(value => value.x) ?? (["point", "band"].includes(xScale.type) ? mapOrdinalPositionValues : mapContinuousScaleValues)(
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
    const lower = mapped?.map(value => value.y) ?? mapContinuousScaleValues(lowerValues, yScale);
    const upperValues = densityTransform === undefined
      ? derived.mode === "y-center"
        ? series.values.map(value => value.upper)
        : series.values.map(value => value.y2)
      : series.values.map(value => value.upper);
    const upper = mapped?.map(value => value.y2) ?? mapContinuousScaleValues(upperValues, yScale);
    if (densityTransform !== undefined && layout === "overlay") {
      const baseline = lower[0];
      if (curve === "linear" && lower.every(value => value === baseline)) {
        return buildLinearPathCommands([
          { x: x[0], y: baseline },
          ...x.map((value, index) => ({ x: value, y: upper[index] })),
          { x: x.at(-1), y: baseline }
        ], { close: true });
      }
      return buildAreaCurvePathCommands(
        x.map((value, index) => ({ x: value, y: lower[index] })),
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
  config,
  conditional
}) {
  const xScale = resolvedScales[layer.encoding.x.scale];
  const yScale = resolvedScales[layer.encoding.y.scale];
  const centered = densityTransform === undefined &&
    layer.encoding?.y?.stack === "center";
  const rawDerived = conditional?.raw ?? (densityTransform === undefined
    ? centered
      ? deriveCenteredAreaSeries(rows, layer, { xDomain: xScale.domain })
      : deriveAreaSeries(rows, layer, { xDomain: xScale.domain, yDomain: yScale.domain })
    : deriveDensityAreaSeries(rows, layer, densityTransform));
  const colorEncoding = layer.encoding?.color;
  const layout = layer.layout?.mode ?? colorEncoding?.layout ?? "overlay";
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
    derived, densityTransform, categoricalDensity, xScale, yScale, densityScale,
    layout, curve: config.curve ?? "linear", positions: conditional?.positions
  });
  const fills = config.errorBand?.fill !== undefined
    ? paths.map(() => config.errorBand.fill)
    : colorEncoding?.scale === undefined
      ? paths.map(() => config.fill)
      : mapScaleConsumerValues(
          colorEncoding.fieldType !== "quantitative" && (densityTransform !== undefined || centered)
            ? derived.series.map(series => series.key[colorEncoding.field])
            : derivePathSeriesFieldValues(rows, derived.series, colorEncoding.field, "color", colorEncoding),
          resolvedScales[colorEncoding.scale],
          "color"
        );
  const strokeEncoding = layer.encoding?.stroke;
  const strokes = strokeEncoding?.scale === undefined
    ? undefined
    : mapScaleConsumerValues(
        derivePathSeriesFieldValues(
          rows,
          derived.series,
          strokeEncoding.field,
          "stroke",
          strokeEncoding
        ),
        resolvedScales[strokeEncoding.scale],
        "stroke"
      );
  const opacityEncoding = layer.encoding?.opacity;
  const opacities = opacityEncoding?.scale === undefined ? undefined : mapScaleConsumerValues(
    derivePathSeriesFieldValues(rows, derived.series, opacityEncoding.field, "opacity", opacityEncoding),
    resolvedScales[opacityEncoding.scale], "opacity"
  );
  return { paths, fills, strokes, opacities };
}
