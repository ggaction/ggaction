import { cloneAndFreeze } from "../core/immutable.js";
import {
  mapContinuousScaleValues,
  mapOrdinalPositionValues,
  readNominalField,
  readQuantitativeField
} from "./scales/index.js";
import { buildAreaCurvePathCommands } from "./curveCommands.js";
import { buildLinearPathCommands } from "./pathCommands.js";

function sameKey(left, right) {
  const leftEntries = Object.entries(left);
  const rightEntries = Object.entries(right);
  return leftEntries.length === rightEntries.length && leftEntries.every(
    ([field, value]) => Object.hasOwn(right, field) && Object.is(right[field], value)
  );
}

function seriesSide(placement, splitValue) {
  if (placement.split === undefined) return placement.side;
  const domain = placement.split.domain ?? placement.resolvedSplitDomain;
  const index = domain.findIndex(value => Object.is(value, splitValue));
  if (index < 0) {
    throw new Error(`Density split value "${splitValue}" is outside its domain.`);
  }
  if (placement.channel === "x") return index === 0 ? "left" : "right";
  return index === 0 ? "top" : "bottom";
}

export function deriveCategoricalDensitySeries(rows, layer, transform) {
  const placement = transform?.placement;
  if (layer?.mark?.type !== "area" || placement?.type !== "category") {
    throw new Error("Categorical density series require a category-placed area.");
  }
  const categoryEncoding = layer.encoding?.[placement.channel];
  const valueChannel = placement.channel === "x" ? "y" : "x";
  const valueEncoding = layer.encoding?.[valueChannel];
  if (
    categoryEncoding?.field !== placement.categoryField ||
    !["nominal", "ordinal"].includes(categoryEncoding.fieldType) ||
    valueEncoding?.field !== transform.as?.[0] ||
    valueEncoding.fieldType !== "quantitative"
  ) {
    throw new Error(
      `Categorical density area mark "${layer.id}" requires its category and value encodings.`
    );
  }
  const categories = readNominalField(rows, placement.categoryField);
  const values = readQuantitativeField(rows, transform.as[0]);
  const densities = readQuantitativeField(rows, transform.as[1]);
  const splits = placement.split === undefined
    ? rows.map(() => undefined)
    : readNominalField(rows, placement.split.field);
  const series = [];
  for (let index = 0; index < rows.length; index += 1) {
    const key = {
      ...(transform.groupBy === undefined
        ? {}
        : { [transform.groupBy]: categories[index] }),
      ...(placement.split === undefined
        ? {}
        : { [placement.split.field]: splits[index] })
    };
    let current = series.find(item => sameKey(item.key, key));
    if (current === undefined) {
      current = {
        category: categories[index],
        split: splits[index],
        key,
        values: []
      };
      series.push(current);
    }
    current.values.push({
      value: values[index],
      density: densities[index]
    });
  }
  if (series.length === 0) {
    throw new Error(`Categorical density area mark "${layer.id}" has no values.`);
  }
  const resolvedSplitDomain = placement.split === undefined
    ? undefined
    : transform.resolved?.splitDomain ?? placement.split.domain;
  if (placement.split !== undefined && resolvedSplitDomain === undefined) {
    throw new Error("Categorical density split requires a resolved two-value domain.");
  }
  const resolvedPlacement = {
    ...placement,
    ...(resolvedSplitDomain === undefined ? {} : { resolvedSplitDomain })
  };
  return cloneAndFreeze({
    mode: placement.channel === "x" ? "category-x" : "category-y",
    placement: resolvedPlacement,
    series: series.map(item => ({
      ...item,
      side: seriesSide(resolvedPlacement, item.split),
      values: item.values.sort((left, right) => left.value - right.value)
    }))
  });
}

function maximumFor(derived, series) {
  const candidates = derived.placement.width.resolve === "shared"
    ? derived.series
    : derived.series.filter(candidate => Object.is(
        candidate.category,
        series.category
      ));
  let maximum = -Infinity;
  for (const candidate of candidates) {
    for (const value of candidate.values) {
      maximum = Math.max(maximum, value.density);
    }
  }
  if (!Number.isFinite(maximum) || maximum <= 0) {
    throw new Error("Categorical density width requires a positive maximum.");
  }
  return maximum;
}

function pathBoundaries(series, center, halfWidth, maximum, valueScale, channel) {
  const valuePositions = mapContinuousScaleValues(
    series.values.map(value => value.value),
    valueScale
  );
  const widths = series.values.map(value => halfWidth * value.density / maximum);
  const horizontal = channel === "x";
  const direction = {
    left: -1,
    right: 1,
    top: -1,
    bottom: 1
  }[series.side];
  const point = (valuePosition, width) => horizontal
    ? { x: center + width, y: valuePosition }
    : { x: valuePosition, y: center + width };
  if (series.side === "both") {
    return {
      lower: valuePositions.map((value, index) => point(value, -widths[index])),
      upper: valuePositions.map((value, index) => point(value, widths[index]))
    };
  }
  const baseline = valuePositions.map(value => point(value, 0));
  const outer = valuePositions.map((value, index) =>
    point(value, direction * widths[index])
  );
  return {
    lower: baseline,
    upper: outer,
    outline: [baseline[0], ...outer, baseline.at(-1)]
  };
}

export function buildCategoricalDensityPaths(
  derived,
  { categoryScale, valueScale, curve = "linear" } = {}
) {
  if (!Number.isFinite(categoryScale?.bandwidth) || categoryScale.bandwidth <= 0) {
    throw new Error("Categorical density placement requires a positive band scale.");
  }
  const halfWidth = categoryScale.bandwidth * derived.placement.width.band / 2;
  const centers = mapOrdinalPositionValues(
    derived.series.map(series => series.category),
    categoryScale
  );
  return cloneAndFreeze(derived.series.map((series, index) => {
    const boundaries = pathBoundaries(
      series,
      centers[index],
      halfWidth,
      maximumFor(derived, series),
      valueScale,
      derived.placement.channel
    );
    if (curve !== "linear") {
      return buildAreaCurvePathCommands(
        boundaries.lower,
        boundaries.upper,
        curve,
        derived.placement.channel === "x" ? { independentAxis: "y" } : {}
      );
    }
    return buildLinearPathCommands(
      boundaries.outline ?? [
        ...boundaries.lower,
        ...[...boundaries.upper].reverse()
      ],
      { close: true }
    );
  }));
}
