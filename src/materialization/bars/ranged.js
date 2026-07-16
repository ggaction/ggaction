import { mapContinuousScaleValues, mapOrdinalPositionValues, mapOrdinalValues } from "../../grammar/scales.js";
import { resolveBarWidth } from "../../grammar/bars/geometry.js";
import { DEFAULT_BAR_FILL, DEFAULT_BAR_STROKE, DEFAULT_BAR_STROKE_WIDTH } from "./resolve.js";

export function deriveRangedRectangles(required, program, width) {
  const { layer, dataset } = required;
  const vertical = layer.encoding?.y2 !== undefined;
  const categoryChannel = vertical ? "x" : "y";
  const measureChannel = vertical ? "y" : "x";
  const secondaryChannel = `${measureChannel}2`;
  const category = layer.encoding[categoryChannel];
  const primary = layer.encoding[measureChannel];
  const secondary = layer.encoding[secondaryChannel];
  const categoryScale = program.resolvedScales[category.scale];
  const measureScale = program.resolvedScales[primary.scale];
  const centers = mapOrdinalPositionValues(dataset.values.map(row => row[category.field]), categoryScale);
  const first = mapContinuousScaleValues(
    dataset.values.map(row => row[primary.field]),
    measureScale
  );
  const second = mapContinuousScaleValues(
    dataset.values.map(row => row[secondary.field]),
    measureScale
  );
  const band = resolveBarWidth(width, Math.abs(categoryScale.bandwidth ?? categoryScale.step));
  const config = program.markConfigs[layer.id] ?? {};
  const appearance = config.barAppearance ?? {};
  const color = layer.encoding?.color;
  const fills = color === undefined
    ? dataset.values.map(() => appearance.fill ?? config.fill ?? DEFAULT_BAR_FILL)
    : mapOrdinalValues(dataset.values.map(row => row[color.field]), program.resolvedScales[color.scale].domain, program.resolvedScales[color.scale].range);
  return dataset.values.map((_, index) => vertical ? {
    x: centers[index] - band / 2, y: Math.min(first[index], second[index]), width: band,
    height: Math.abs(second[index] - first[index]), fill: fills[index],
    stroke: appearance.stroke === false
      ? "transparent"
      : appearance.stroke ?? (color === undefined ? config.stroke ?? DEFAULT_BAR_STROKE : fills[index]),
    strokeWidth: appearance.stroke === false
      ? 0
      : appearance.strokeWidth ?? config.strokeWidth ?? DEFAULT_BAR_STROKE_WIDTH,
    opacity: appearance.opacity ?? config.opacity ?? 1
  } : {
    x: Math.min(first[index], second[index]), y: centers[index] - band / 2,
    width: Math.abs(second[index] - first[index]), height: band, fill: fills[index],
    stroke: appearance.stroke === false
      ? "transparent"
      : appearance.stroke ?? (color === undefined ? config.stroke ?? DEFAULT_BAR_STROKE : fills[index]),
    strokeWidth: appearance.stroke === false
      ? 0
      : appearance.strokeWidth ?? config.strokeWidth ?? DEFAULT_BAR_STROKE_WIDTH,
    opacity: appearance.opacity ?? config.opacity ?? 1
  });
}
