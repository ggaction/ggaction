import { resolveScaleRange } from "../../grammar/scales/index.js";
import { resolveArcAutoPositionRange, validateMeasuredRadiusConsumers } from "../../materialization/scales/policies/arc.js";
import { findSemanticScale } from "../../selectors/scales.js";
import { normalizePositionScaleChannel } from "../../core/vocabulary.js";
import { resolveGraphicBounds } from "../../layout/canvas.js";
import { resolveScaleMaterialization } from "../../materialization/scales/resolve.js";
import { findScale, findScaleConsumers, resolveConsumerCategoryOrder,
  resolveConsumerValues, resolveSeriesLayoutScaleValues } from "./consumers/index.js";

export function resolveScalePreview(program, id) {
  const scale = findScale(program, id);
  const consumers = findScaleConsumers(program, id);
  if (consumers.length === 0) throw new Error(`Scale "${id}" has no supported consumers.`);
  const channels = new Set(consumers.map(consumer => normalizePositionScaleChannel(consumer.channel)));
  if (channels.size !== 1) throw new Error(`Scale "${id}" cannot be shared across channels.`);
  const channel = channels.values().next().value;
  const valuesByConsumer = consumers.map(consumer => ({ consumer,
    values: resolveConsumerValues(program, consumer),
    categoryOrder: resolveConsumerCategoryOrder(program, consumer),
    seriesLayout: resolveSeriesLayoutScaleValues(program, consumer) }));
  const resolvedScale = resolveScaleMaterialization({ id, scale, channel, consumers, valuesByConsumer,
    bounds: ["color", "strokeDash", "strokeWidth", "shape", "size", "opacity", "xOffset", "yOffset"].includes(channel)
      ? undefined : resolveGraphicBounds(program),
    resolvedScales: program.resolvedScales, markConfigs: program.markConfigs, thetaScales: scale.radialMapping === undefined ? undefined : Object.fromEntries(consumers.map(({ layer }) =>
      [layer.id, findSemanticScale(program, layer.encoding?.theta?.scale)])) });
  return { channel, consumers, valuesByConsumer, resolvedScale };
}

export function validatePendingMeasuredScale(program, scale, consumers) {
  const range = resolveArcAutoPositionRange({ consumers, scale, channel: "radius",
    range: resolveScaleRange(scale.range, "radius", resolveGraphicBounds(program)), markConfigs: program.markConfigs });
  validateMeasuredRadiusConsumers({ scale, domain: scale.domain, range, consumers,
    markConfigs: program.markConfigs, thetaScales: {} });
}
