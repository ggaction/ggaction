import { isAggregate } from "../aggregate.js";

export const BAR_GRAINS = Object.freeze({
  histogram: "histogram",
  aggregate: "aggregate",
  centered: "centered",
  ranged: "ranged"
});

export const BAR_ORIENTATIONS = Object.freeze({
  vertical: "vertical",
  horizontal: "horizontal"
});

export function isBarCategoryEncoding(encoding) {
  return ["nominal", "ordinal", "temporal"].includes(encoding?.fieldType);
}

function isMeasure(encoding) {
  return encoding?.fieldType === "quantitative" &&
    isAggregate(encoding.aggregate);
}

function hasNumericCenters(layer) {
  return layer.mark.orientation !== undefined && [layer.encoding?.x, layer.encoding?.y].every(
    encoding => encoding?.fieldType === "quantitative" && encoding.bin === undefined && encoding.aggregate === undefined
  );
}

export function resolveBarOrientation(layer) {
  if (layer?.mark?.type !== "bar") return undefined;
  const x = layer.encoding?.x;
  const y = layer.encoding?.y;
  if (hasNumericCenters(layer)) return layer.mark.orientation;
  if (x?.bin !== undefined && y?.aggregate === "count") {
    return BAR_ORIENTATIONS.vertical;
  }
  if (isBarCategoryEncoding(x) && y?.fieldType === "quantitative" && layer.encoding?.y2?.fieldType === "quantitative") {
    return BAR_ORIENTATIONS.vertical;
  }
  if (isBarCategoryEncoding(y) && x?.fieldType === "quantitative" && layer.encoding?.x2?.fieldType === "quantitative") {
    return BAR_ORIENTATIONS.horizontal;
  }
  if (isBarCategoryEncoding(x) && isMeasure(y)) return BAR_ORIENTATIONS.vertical;
  if (isMeasure(x) && isBarCategoryEncoding(y)) return BAR_ORIENTATIONS.horizontal;
  return undefined;
}

export function resolveBarChannels(layer) {
  const orientation = resolveBarOrientation(layer);
  if (orientation === undefined) return undefined;
  return orientation === BAR_ORIENTATIONS.vertical
    ? { orientation, category: "x", measure: "y" }
    : { orientation, category: "y", measure: "x" };
}

export function resolveBarOffsetChannel(layer) {
  const channels = resolveBarChannels(layer);
  return channels === undefined ? undefined : `${channels.category}Offset`;
}

export function resolveBarGrain(layer) {
  if (layer?.mark?.type !== "bar") return undefined;
  const x = layer.encoding?.x;
  const y = layer.encoding?.y;

  if (hasNumericCenters(layer)) return BAR_GRAINS.centered;

  if (
    x?.bin !== undefined &&
    y?.aggregate === "count"
  ) {
    return BAR_GRAINS.histogram;
  }
  if (
    (isBarCategoryEncoding(x) && y?.fieldType === "quantitative" && layer.encoding?.y2?.fieldType === "quantitative") ||
    (isBarCategoryEncoding(y) && x?.fieldType === "quantitative" && layer.encoding?.x2?.fieldType === "quantitative")
  ) return BAR_GRAINS.ranged;
  if (resolveBarOrientation(layer) !== undefined) {
    return BAR_GRAINS.aggregate;
  }
  return undefined;
}

export function inferBarColorLayout(layer) {
  if (layer?.layout?.mode !== undefined) return layer.layout.mode;
  if (layer?.encoding?.color?.layout !== undefined) {
    return layer.encoding.color.layout;
  }
  const grain = resolveBarGrain(layer);
  if (grain === BAR_GRAINS.histogram) return "stack";
  if (grain === BAR_GRAINS.aggregate) return "group";
  if (grain === BAR_GRAINS.ranged || grain === BAR_GRAINS.centered) return "overlay";
  return undefined;
}

export function resolveBarColorLayout(layer) {
  if (layer?.layout?.mode !== undefined) return layer.layout.mode;
  if (layer?.encoding?.color?.layout !== undefined) {
    return layer.encoding.color.layout;
  }
  if (resolveBarGrain(layer) === BAR_GRAINS.centered) return "overlay";
  const channels = resolveBarChannels(layer);
  if (layer?.encoding?.[channels?.measure]?.stack === "normalize") return "fill";
  const offsetChannel = resolveBarOffsetChannel(layer);
  if (layer?.encoding?.[offsetChannel] !== undefined) return "group";
  if (layer?.encoding?.[channels?.measure]?.stack === null) return "overlay";
  return "stack";
}
