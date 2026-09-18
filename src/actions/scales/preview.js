import { resolveScaleRange } from "../../grammar/scales/index.js";
import { resolvePolarFrame } from "../../grammar/polar.js";
import { resolveArcAutoPositionRange, validateMeasuredRadiusConsumers } from "../../materialization/scales/policies/arc.js";
import { findSemanticScale } from "../../selectors/scales.js";
import { normalizePositionScaleChannel } from "../../core/vocabulary.js";
import { resolveGraphicBounds } from "../../layout/canvas.js";
import {
  axisScaleBindings,
  resolveCoordinateBounds,
  resolveDataAspectScalePair,
  resolveScaleConsumerBounds
} from "../../materialization/coordinateBounds.js";
import { requireCoordinate } from "../../selectors/coordinates.js";
import {
  rememberResolvedScaleBinding,
  resolveScaleMaterialization
} from "../../materialization/scales/resolve.js";
import { findScale, findScaleConsumers, resolveConsumerCategoryOrder,
  resolveConsumerValues, resolveSeriesLayoutScaleValues } from "./consumers/index.js";

function resolveScalePreviewAtBounds(program, id, bounds) {
  const scale = findScale(program, id);
  const consumers = findScaleConsumers(program, id);
  const axes = axisScaleBindings(program, id);
  if (consumers.length === 0 && axes.length === 0) throw new Error(`Scale "${id}" has no supported consumers.`);
  if (consumers.length === 0 && (!Array.isArray(scale.domain) || scale.domain.length === 0)) {
    throw new Error("Standalone axis scales require an explicit nonempty domain.");
  }
  const consumerChannels = new Set(consumers.map(
    consumer => normalizePositionScaleChannel(consumer.channel)
  ));
  for (const binding of axes) consumerChannels.add(binding.channel);
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
    if (
      program.markConfigs?.[consumer.layer.id]?.markFilter?.empty === true ||
      program.markConfigs?.[consumer.layer.id]?.statisticalReference !== undefined
    ) {
      return {
        consumer,
        values: [],
        categoryOrder: undefined,
        seriesLayout: undefined,
        ...(program.markConfigs?.[consumer.layer.id]?.statisticalReference === undefined
          ? {}
          : { scalePolicy: false })
      };
    }
    return { consumer,
      values: resolveConsumerValues(program, consumer),
      categoryOrder: resolveConsumerCategoryOrder(program, consumer),
      seriesLayout: resolveSeriesLayoutScaleValues(program, consumer) };
  });
  const polarFrame = channel === "radius"
    ? resolveSharedRadiusFrame(program, consumers, bounds)
    : undefined;
  const resolvedScale = resolveScaleMaterialization({ id, scale, channel, consumers, valuesByConsumer,
    bounds: ["color", "stroke", "strokeDash", "strokeWidth", "shape", "size", "opacity", "xOffset", "yOffset"].includes(channel)
      ? undefined : bounds,
    resolvedScales: program.resolvedScales, markConfigs: program.markConfigs, polarFrame,
    thetaScales: scale.radialMapping === undefined ? undefined : Object.fromEntries(consumers.map(({ layer }) =>
      [layer.id, findSemanticScale(program, layer.encoding?.theta?.scale)])) });
  return { channel, consumers, valuesByConsumer, resolvedScale };
}

function resolveSharedRadiusFrame(program, consumers, bounds) {
  const coordinateIds = [...new Set(consumers.map(({ layer }) => layer.coordinate))];
  if (coordinateIds.some(id => id === undefined)) {
    throw new Error("Radius scale consumers require stored Polar coordinates.");
  }
  const frames = coordinateIds.map(id => {
    const coordinate = requireCoordinate(program, id);
    if (coordinate.type !== "polar") {
      throw new Error("Radius scale consumers require Polar coordinates.");
    }
    return resolvePolarFrame(bounds, coordinate.polarFrame);
  });
  if (frames.slice(1).some(
    frame => Math.abs(frame.availableRadius - frames[0].availableRadius) > 1e-9
  )) {
    throw new Error(
      "A radius scale cannot be shared across coordinates with different Polar frames."
    );
  }
  return frames[0];
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
  const axes = axisScaleBindings(program, id);
  if (requestedConsumers.length === 0 && axes.length > 0) {
    const coordinate = requireCoordinate(program, axes[0].coordinate);
    if (coordinate.type !== "cartesian") throw new Error("Standalone axes require a Cartesian coordinate.");
    return resolveScalePreviewAtBounds(program, id, resolveCoordinateBounds(program, coordinate.id));
  }
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
  for (const binding of axes) {
    const guideBounds = resolveCoordinateBounds(program, binding.coordinate, { resolvedScales });
    if (["x", "y", "width", "height"].some(key => Math.abs(guideBounds[key] - bounds[key]) > 1e-9)) {
      throw new Error("Axis and mark scale consumers require matching coordinate bounds.");
    }
  }
  return resolveScalePreviewAtBounds(program, id, bounds);
}

export function restoreResolvedScaleBindings(program) {
  for (const scale of program.semanticSpec.scales) {
    const resolved = program.resolvedScales[scale.id];
    if (resolved === undefined) continue;
    const consumers = findScaleConsumers(program, scale.id);
    const channels = new Set(consumers.map(consumer =>
      normalizePositionScaleChannel(consumer.channel)
    ));
    for (const binding of axisScaleBindings(program, scale.id)) channels.add(binding.channel);
    const families = new Set([...channels].map(channel =>
      channel === "stroke" ? "color" : channel
    ));
    if (families.size === 1) {
      const channel = channels.size === 1
        ? channels.values().next().value
        : families.values().next().value;
      rememberResolvedScaleBinding(resolved, channel, consumers);
    }
  }
  for (const child of Object.values(program.children)) {
    restoreResolvedScaleBindings(child);
  }
  return program;
}

export function validatePendingMeasuredScale(program, scale, consumers) {
  const bounds = resolveScaleConsumerBounds(program, consumers);
  const range = resolveArcAutoPositionRange({ consumers, scale, channel: "radius",
    range: resolveScaleRange(
      scale.range,
      "radius",
      bounds,
      resolveSharedRadiusFrame(program, consumers, bounds)
    ), markConfigs: program.markConfigs });
  validateMeasuredRadiusConsumers({ scale, domain: scale.domain, range, consumers,
    markConfigs: program.markConfigs, thetaScales: {} });
}
