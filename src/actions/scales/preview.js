import { resolveScaleRange } from "../../grammar/scales/index.js";
import { resolveArcAutoPositionRange, validateMeasuredRadiusConsumers } from "../../materialization/scales/policies/arc.js";
import { findSemanticScale } from "../../selectors/scales.js";
import { normalizePositionScaleChannel } from "../../core/vocabulary.js";
import { resolveGraphicBounds } from "../../layout/canvas.js";
import {
  resolveDataAspectScalePair,
  resolveScaleConsumerBounds
} from "../../materialization/coordinateBounds.js";
import { resolveScaleMaterialization } from "../../materialization/scales/resolve.js";
import { findScale, findScaleConsumers, resolveConsumerCategoryOrder,
  resolveConsumerValues, resolveSeriesLayoutScaleValues } from "./consumers/index.js";

function resolveScalePreviewAtBounds(program, id, bounds) {
  const scale = findScale(program, id);
  const consumers = findScaleConsumers(program, id);
  if (consumers.length === 0) throw new Error(`Scale "${id}" has no supported consumers.`);
  const consumerChannels = new Set(consumers.map(
    consumer => normalizePositionScaleChannel(consumer.channel)
  ));
  const families = new Set([...consumerChannels].map(
    channel => channel === "stroke" ? "color" : channel
  ));
  if (families.size !== 1) {
    throw new Error(`Scale "${id}" cannot be shared across channels.`);
  }
  const channel = consumerChannels.size === 1
    ? consumerChannels.values().next().value
    : families.values().next().value;
  const valuesByConsumer = consumers.map(consumer => {
    if (program.markConfigs?.[consumer.layer.id]?.markFilter?.empty === true) {
      return { consumer, values: [], categoryOrder: undefined, seriesLayout: undefined };
    }
    return { consumer,
      values: resolveConsumerValues(program, consumer),
      categoryOrder: resolveConsumerCategoryOrder(program, consumer),
      seriesLayout: resolveSeriesLayoutScaleValues(program, consumer) };
  });
  const resolvedScale = resolveScaleMaterialization({ id, scale, channel, consumers, valuesByConsumer,
    bounds: ["color", "stroke", "strokeDash", "strokeWidth", "shape", "size", "opacity", "xOffset", "yOffset"].includes(channel)
      ? undefined : bounds,
    resolvedScales: program.resolvedScales, markConfigs: program.markConfigs, thetaScales: scale.radialMapping === undefined ? undefined : Object.fromEntries(consumers.map(({ layer }) =>
      [layer.id, findSemanticScale(program, layer.encoding?.theta?.scale)])) });
  return { channel, consumers, valuesByConsumer, resolvedScale };
}

function dataAspectScaleIds(program) {
  const ids = new Set();
  for (const coordinate of program.semanticSpec.coordinates) {
    if (coordinate.aspect?.mode !== "data") continue;
    const pair = resolveDataAspectScalePair(program, coordinate);
    ids.add(pair.x);
    ids.add(pair.y);
  }
  return ids;
}

export function resolveScalePreview(program, id) {
  const requestedConsumers = findScaleConsumers(program, id);
  const positionChannels = new Set([
    "x", "y", "x2", "y2", "theta", "radius"
  ]);
  const positional = requestedConsumers.some(consumer =>
    consumer.role === "parallelDimension" ||
    positionChannels.has(consumer.channel)
  );
  const allocated = positional ? resolveGraphicBounds(program) : undefined;
  const provisional = resolveScalePreviewAtBounds(program, id, allocated);
  if (!positional) return provisional;
  const resolvedScales = {
    ...program.resolvedScales,
    [id]: provisional.resolvedScale
  };
  for (const scaleId of dataAspectScaleIds(program)) {
    if (scaleId === id) continue;
    resolvedScales[scaleId] = resolveScalePreviewAtBounds(
      program,
      scaleId,
      allocated
    ).resolvedScale;
  }
  const bounds = resolveScaleConsumerBounds(
    program,
    provisional.consumers,
    { resolvedScales }
  );
  return resolveScalePreviewAtBounds(program, id, bounds);
}

export function validatePendingMeasuredScale(program, scale, consumers) {
  const range = resolveArcAutoPositionRange({ consumers, scale, channel: "radius",
    range: resolveScaleRange(
      scale.range,
      "radius",
      resolveScaleConsumerBounds(program, consumers)
    ), markConfigs: program.markConfigs });
  validateMeasuredRadiusConsumers({ scale, domain: scale.domain, range, consumers,
    markConfigs: program.markConfigs, thetaScales: {} });
}
