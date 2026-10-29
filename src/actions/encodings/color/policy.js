import { findSemanticScale } from "../../../selectors/scales.js";
import { planColorLegendTransitions, applyColorLegendTransition } from "../../guides/legends/transition.js";
import {
  BAR_GRAINS,
  inferBarColorLayout,
  resolveBarChannels
} from "../../../grammar/bars/policy.js";
import { validateColorLayout } from "../../../grammar/seriesLayout.js";
import { findScaleConsumers } from "../../../materialization/scales/consumers/common.js";
import { resolveReassignmentScaleOptions } from "../shared.js";

export const COLOR_ENCODING_OPTIONS = Object.freeze([
  "value", "field", "target", "fieldType", "scale", "palette", "layout", "aggregate", "temporalUnit"
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

export function resolveColorReassignmentScaleOptions(
  program, layer, channel, fieldType, options = {}
) {
  const previous = layer.encoding?.[channel];
  const requested = resolveReassignmentScaleOptions(previous, options);
  if (options.id !== undefined || previous?.scale === undefined) return requested;
  const categorical = type => ["nominal", "ordinal"].includes(type);
  if (categorical(previous.fieldType) === categorical(fieldType)) return requested;
  const otherConsumer = consumer => consumer.layer.id !== layer.id ||
    consumer.channel !== channel;
  if (!findScaleConsumers(program, previous.scale).some(otherConsumer)) return requested;
  // Re-encoding one mark must not change the scale family of its siblings.
  // Explicit scale IDs still opt into normal shared-resource validation.
  const id = `${layer.id}-${channel}-${fieldType}`;
  if (findScaleConsumers(program, id).some(otherConsumer)) {
    throw new Error(`Color reassignment requires scale.id because "${id}" has other consumers.`);
  }
  return { ...options, id };
}

export function withoutConstantColor(program, layer) {
  const previous = program.markConfigs[layer.id];
  const explicit = { point: previous?.fill !== undefined, line: previous?.stroke !== undefined,
    bar: previous?.barAppearance?.fill !== undefined, area: previous?.errorBand?.fill !== undefined,
    arc: previous?.fill !== undefined, rect: previous?.fillExplicit === true,
    text: previous?.fillExplicit === true }[layer.mark.type];
  if (!explicit) return program;
  const config = { ...previous };
  if (layer.mark.type === "bar") {
    config.barAppearance = { ...config.barAppearance };
    delete config.barAppearance.fill;
  } else if (layer.mark.type === "line") {
    delete config.stroke;
  } else {
    if (["point", "arc"].includes(layer.mark.type)) delete config.fill;
    if (["rect", "text"].includes(layer.mark.type)) config.fillExplicit = false;
    if (config.errorBand !== undefined) {
      config.errorBand = { ...config.errorBand };
      delete config.errorBand.fill;
    }
  }
  return program._withMarkConfig(layer.id, config);
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

export function resolveColorLayout(layer, requested, barGrain, field) {
  const category = layer.encoding?.[resolveBarChannels(layer)?.category];
  // Coloring the category does not introduce another partition. An explicit
  // group or a stored/requested layout still owns series placement.
  const categoryColorOnly = barGrain === BAR_GRAINS.aggregate &&
    ["nominal", "ordinal"].includes(category?.fieldType) &&
    category.field === field && layer.encoding?.group === undefined;
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
        : [BAR_GRAINS.ranged, BAR_GRAINS.centered].includes(barGrain) || categoryColorOnly ? "overlay" : "group"
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
  if (layer.mark.type === "bar" && layout === "wiggle") throw new Error("Wiggle is supported only for vertical area series.");
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

// A new scale identity can also change the existing target's legend family.
// Keep the same transition validation/style policy used by in-place scale edits.
export function withColorLegendReassignment(program, layer, scale, apply) {
  const previous = findSemanticScale(program, layer.encoding?.color?.scale);
  if (previous === undefined || previous.id === scale.id) return apply(program);
  const plans = planColorLegendTransitions(program, previous, scale.type, { channel: "color", target: layer.id });
  let next = program;
  for (const plan of plans) next = next.removeLegend({ target: layer.id, channels: ["color"] });
  next = apply(next);
  for (const plan of plans) next = applyColorLegendTransition(next, plan);
  return next;
}
