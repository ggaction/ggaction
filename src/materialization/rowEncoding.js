import {
  OFFSET_POSITION_CHANNELS,
  POSITION_CHANNELS
} from "../core/vocabulary.js";
import {
  mapOrdinalOffsetValues,
  mapOrdinalPositionValues,
  readNominalField,
  readQuantitativeField,
  readScaleField,
  readTemporalField
} from "../grammar/scales/index.js";
import {
  finiteMidpoint,
  requireFiniteResult
} from "../grammar/numeric.js";
import { mapScaleConsumerValues } from "./scales/map.js";

export function resolveRowEncodingValues(program, layer, dataset, channel) {
  const encoding = layer.encoding?.[channel];
  if (encoding === undefined) return undefined;
  const scale = program.resolvedScales[encoding.scale];
  if (scale === undefined) {
    throw new Error(
      `${layer.mark.type} mark "${layer.id}" requires resolved ${channel} scale "${encoding.scale}".`
    );
  }
  const categorical = ["nominal", "ordinal"].includes(encoding.fieldType);
  const values = Object.hasOwn(scale, "unknown")
    ? readScaleField(dataset.values, encoding.field, encoding.fieldType, {
        allowUnknown: true
      })
    : categorical
      ? readNominalField(dataset.values, encoding.field)
      : encoding.fieldType === "temporal"
        ? readTemporalField(dataset.values, encoding.field)
        : readQuantitativeField(dataset.values, encoding.field);
  if (categorical && OFFSET_POSITION_CHANNELS.includes(channel)) {
    return mapOrdinalOffsetValues(values, scale);
  }
  return categorical && POSITION_CHANNELS.includes(channel)
    ? mapOrdinalPositionValues(values, scale)
    : mapScaleConsumerValues(values, scale, channel);
}

export function applyOffsetPositionValues({
  base,
  offset,
  parentScale,
  offsetScale,
  channel
}) {
  if (base.length !== offset.length) {
    throw new Error(`${channel} offset values must match the base position grain.`);
  }
  const midpoint = finiteMidpoint(offsetScale.range[0], offsetScale.range[1]);
  const direction = Math.sign(parentScale.step) ||
    Math.sign(parentScale.range[1] - parentScale.range[0]) || 1;
  return Object.freeze(base.map((value, index) => {
    if (!Number.isFinite(value) || !Number.isFinite(offset[index])) {
      return undefined;
    }
    return requireFiniteResult(
      value + direction * (offset[index] - midpoint),
      `${channel} offset position`
    );
  }));
}

export function resolveRowPositionValues(program, layer, dataset, channel) {
  const base = resolveRowEncodingValues(program, layer, dataset, channel);
  if (base === undefined) return undefined;
  const offsetChannel = channel === "x" ? "xOffset" : "yOffset";
  const offsetEncoding = layer.encoding?.[offsetChannel];
  if (offsetEncoding === undefined) return base;
  const offset = resolveRowEncodingValues(
    program,
    layer,
    dataset,
    offsetChannel
  );
  return applyOffsetPositionValues({
    base,
    offset,
    parentScale: program.resolvedScales[layer.encoding[channel].scale],
    offsetScale: program.resolvedScales[offsetEncoding.scale],
    channel
  });
}
