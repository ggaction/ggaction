import {
  BAR_GRAINS,
  inferBarColorLayout
} from "../../../grammar/bars/policy.js";
import { validateColorLayout } from "../../../grammar/seriesLayout.js";

export const COLOR_ENCODING_OPTIONS = Object.freeze([
  "field", "target", "fieldType", "scale", "palette", "layout", "aggregate", "temporalUnit"
]);

export function resolveColorScaleOptions(args) {
  const options = args.scale ?? {};
  if (args.palette === undefined) return options;
  if (options.palette !== undefined || options.range !== undefined) {
    throw new Error(
      "encodeColor palette cannot be combined with scale.palette or scale.range."
    );
  }
  return { ...options, palette: args.palette };
}

export function assertNoConstantColor(program, layer) {
  if (layer.mark.type === "text" && layer.source !== undefined) {
    throw new Error("Source-owned text uses inheritColor or constant fill; field color requires row-backed text.");
  }
  const config = program.markConfigs[layer.id];
  const hasConstant = {
    point: config?.fill !== undefined,
    line: config?.stroke !== undefined,
    area: config?.errorBand?.fill !== undefined,
    bar: config?.barAppearance?.fill !== undefined,
    arc: config?.fill !== undefined,
    rect: config?.fillExplicit === true,
    text: config?.fillExplicit === true
  }[layer.mark.type] ?? false;
  if (hasConstant) {
    throw new Error(
      `encodeColor cannot replace constant appearance on ${layer.mark.type} mark "${layer.id}".`
    );
  }
}

export function isRangedArea(layer) {
  return layer.mark.type === "area" && (
    layer.encoding?.x2 !== undefined ||
    layer.encoding?.y2 !== undefined
  );
}

export function resolveColorLayout(layer, requested, barGrain) {
  const existing = layer.encoding?.color === undefined
    ? undefined
    : layer.encoding.color.layout ?? (
        layer.mark.type === "bar"
          ? inferBarColorLayout(layer)
          : layer.mark.type === "area"
            ? "overlay"
            : undefined
      );
  if (requested !== undefined) validateColorLayout(requested);
  const layout = requested ?? layer.layout?.mode ?? existing ?? (
    layer.mark.type === "bar"
      ? barGrain === BAR_GRAINS.histogram
        ? "stack"
        : [BAR_GRAINS.ranged, BAR_GRAINS.centered].includes(barGrain) ? "overlay" : "group"
      : layer.mark.type === "area"
        ? "overlay"
        : undefined
  );

  if (["point", "line", "rect", "text"].includes(layer.mark.type) && layout !== undefined) {
    throw new Error(`Color layout is not supported for ${layer.mark.type} marks.`);
  }
  if (barGrain === BAR_GRAINS.centered && layout !== "overlay") {
    throw new Error("Numeric-center bars support only overlay layout.");
  }
  if (layer.mark.type === "area" && layout === "group") {
    throw new Error('Area color layout does not support "group".');
  }
  if (layer.mark.type === "bar" && layout === "center") {
    throw new Error("Centered bars are not supported.");
  }
  if (
    layer.mark.type === "arc" &&
    layout !== undefined &&
    layout !== "overlay"
  ) {
    throw new Error('Arc color layout currently supports only "overlay".');
  }
  if (isRangedArea(layer) && layer.encoding?.x2?.datum === undefined && layer.encoding?.y2?.datum === undefined &&
    layer.encoding?.x?.datum === undefined && layer.encoding?.y?.datum === undefined && layout !== "overlay") {
    throw new Error('Ranged area color encoding supports only "overlay" layout.');
  }
  return layout;
}
