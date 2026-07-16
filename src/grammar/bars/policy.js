import { isAggregate } from "../aggregate.js";

export const BAR_GRAINS = Object.freeze({
  histogram: "histogram",
  aggregate: "aggregate",
  ranged: "ranged"
});

export const BAR_ORIENTATIONS = Object.freeze({
  vertical: "vertical",
  horizontal: "horizontal"
});

function isCategory(encoding) {
  return ["nominal", "ordinal", "temporal"].includes(encoding?.fieldType);
}

function isMeasure(encoding) {
  return encoding?.fieldType === "quantitative" &&
    isAggregate(encoding.aggregate);
}

export function resolveBarOrientation(layer) {
  if (layer?.mark?.type !== "bar") return undefined;
  const x = layer.encoding?.x;
  const y = layer.encoding?.y;
  if (x?.bin !== undefined && y?.aggregate === "count") {
    return BAR_ORIENTATIONS.vertical;
  }
  if (isCategory(x) && y?.fieldType === "quantitative" && layer.encoding?.y2?.fieldType === "quantitative") {
    return BAR_ORIENTATIONS.vertical;
  }
  if (isCategory(y) && x?.fieldType === "quantitative" && layer.encoding?.x2?.fieldType === "quantitative") {
    return BAR_ORIENTATIONS.horizontal;
  }
  if (isCategory(x) && isMeasure(y)) return BAR_ORIENTATIONS.vertical;
  if (isMeasure(x) && isCategory(y)) return BAR_ORIENTATIONS.horizontal;
  return undefined;
}

export function resolveBarChannels(layer) {
  const orientation = resolveBarOrientation(layer);
  if (orientation === undefined) return undefined;
  return orientation === BAR_ORIENTATIONS.vertical
    ? { orientation, category: "x", measure: "y" }
    : { orientation, category: "y", measure: "x" };
}

export function resolveBarGrain(layer) {
  if (layer?.mark?.type !== "bar") return undefined;
  const x = layer.encoding?.x;
  const y = layer.encoding?.y;

  if (
    x?.bin !== undefined &&
    y?.aggregate === "count"
  ) {
    return BAR_GRAINS.histogram;
  }
  if (
    (isCategory(x) && y?.fieldType === "quantitative" && layer.encoding?.y2?.fieldType === "quantitative") ||
    (isCategory(y) && x?.fieldType === "quantitative" && layer.encoding?.x2?.fieldType === "quantitative")
  ) return BAR_GRAINS.ranged;
  if (resolveBarOrientation(layer) !== undefined) {
    return BAR_GRAINS.aggregate;
  }
  return undefined;
}

export function inferBarColorLayout(layer) {
  if (layer?.encoding?.color?.layout !== undefined) {
    return layer.encoding.color.layout;
  }
  const grain = resolveBarGrain(layer);
  if (grain === BAR_GRAINS.histogram) return "stack";
  if (grain === BAR_GRAINS.aggregate) return "group";
  if (grain === BAR_GRAINS.ranged) return "overlay";
  return undefined;
}

export function resolveBarColorLayout(layer) {
  if (layer?.encoding?.color?.layout !== undefined) {
    return layer.encoding.color.layout;
  }
  const channels = resolveBarChannels(layer);
  if (layer?.encoding?.[channels?.measure]?.stack === "normalize") return "fill";
  if (layer?.encoding?.xOffset !== undefined) return "group";
  if (layer?.encoding?.[channels?.measure]?.stack === null) return "overlay";
  return "stack";
}
