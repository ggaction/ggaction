import {
  mapOrdinalPositionValues,
  readScaleField
} from "../grammar/scales/index.js";
import { normalizePositionDatum } from "../grammar/positionDatum.js";
import { resolveGraphicBounds } from "../layout/canvas.js";
import { RECT_MODES, resolveRectMode, rectUsesFields } from "../grammar/rects.js";
import { DEFAULT_RECT_MARK } from "./rectConfig.js";
import { mapScaleConsumerValues } from "./scales/map.js";

function optionalValues(rows, encoding, length, channel) {
  if (Object.hasOwn(encoding, "datum")) {
    const value = normalizePositionDatum(encoding.datum, encoding.fieldType, channel, encoding.temporalUnit, "Rect");
    return Array.from({ length }, () => value);
  }
  return readScaleField(rows, encoding.field, encoding.fieldType, {
    allowUnknown: true, temporalUnit: encoding.temporalUnit
  });
}

function requiredChannels(layer, mode) {
  const position = mode === RECT_MODES.xSpan ? ["x", "x2"]
    : mode === RECT_MODES.ySpan ? ["y", "y2"]
    : mode === RECT_MODES.ranged ? ["x", "x2", "y", "y2"] : ["x", "y"];
  return [...position, ...(layer.encoding?.color ? ["color"] : [])];
}

export function resolveRectConsumerValues(layer, dataset, channel) {
  const length = rectUsesFields(layer) ? dataset.values.length : 1;
  const requested = optionalValues(dataset.values, layer.encoding[channel], length, channel);
  const mode = resolveRectMode(layer);
  if (mode === undefined) return requested;
  const complete = requiredChannels(layer, mode).map(candidate =>
    optionalValues(dataset.values, layer.encoding[candidate], length, candidate)
  );
  return requested.map((value, index) =>
    complete.every(values => values[index] !== undefined) ? value : undefined
  );
}

function mapOptional(values, scale, channel, categorical = false) {
  return values.map(value => {
    if (value === undefined) return undefined;
    return categorical
      ? mapOrdinalPositionValues([value], scale)[0]
      : mapScaleConsumerValues([value], scale, channel)[0];
  });
}

function mappedEncoding(program, layer, dataset, channel) {
  const encoding = layer.encoding[channel];
  const scale = program.resolvedScales[encoding.scale];
  if (scale === undefined) {
    throw new Error(
      `Rect mark "${layer.id}" requires resolved ${channel} scale "${encoding.scale}".`
    );
  }
  const values = resolveRectConsumerValues(layer, dataset, channel);
  const categorical = ["nominal", "ordinal"].includes(encoding.fieldType) &&
    ["x", "y"].includes(channel);
  return {
    values: mapOptional(values, scale, channel, categorical),
    scale
  };
}

function appearance(config, fill) {
  return {
    fill,
    opacity: config.opacity,
    stroke: config.stroke === false ? "transparent" : config.stroke,
    strokeWidth: config.stroke === false ? 0 : config.strokeWidth
  };
}

export function resolveRectRows(program, layer, dataset) {
  const mode = resolveRectMode(layer);
  if (mode === undefined) return [];
  const bounds = resolveGraphicBounds(program);
  const x = layer.encoding.x === undefined ? undefined : mappedEncoding(program, layer, dataset, "x");
  const y = layer.encoding.y === undefined ? undefined : mappedEncoding(program, layer, dataset, "y");
  const x2 = layer.encoding.x2 === undefined ? undefined : mappedEncoding(program, layer, dataset, "x2");
  const y2 = layer.encoding.y2 === undefined ? undefined : mappedEncoding(program, layer, dataset, "y2");
  const color = layer.encoding?.color === undefined
    ? undefined
    : mappedEncoding(program, layer, dataset, "color").values;
  const config = program.markConfigs[layer.id] ?? DEFAULT_RECT_MARK;

  const rows = rectUsesFields(layer) ? dataset.values : [{}];
  return rows.flatMap((row, index) => {
    const fill = color === undefined ? config.fill : color[index];
    if (
      (x !== undefined && !Number.isFinite(x.values[index])) ||
      (y !== undefined && !Number.isFinite(y.values[index])) ||
      typeof fill !== "string"
    ) return [];

    let geometry;
    if (mode === RECT_MODES.discrete) {
      const width = x.scale.bandwidth;
      const height = y.scale.bandwidth;
      if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
        return [];
      }
      geometry = {
        x: x.values[index] - width / 2,
        y: y.values[index] - height / 2,
        width,
        height
      };
    } else {
      const startX = x?.values[index] ?? bounds.x;
      const startY = y?.values[index] ?? bounds.y;
      const endX = x2?.values[index] ?? bounds.x + bounds.width;
      const endY = y2?.values[index] ?? bounds.y + bounds.height;
      if (!Number.isFinite(endX) || !Number.isFinite(endY)) return [];
      geometry = {
        x: Math.min(startX, endX),
        y: Math.min(startY, endY),
        width: Math.abs(endX - startX),
        height: Math.abs(endY - startY)
      };
      if (geometry.width <= 0 || geometry.height <= 0) return [];
    }
    return [{
      row,
      sourceIndex: index,
      properties: { ...geometry, ...appearance(config, fill) }
    }];
  });
}

export function resolveRectGraphicItems(program, layer, dataset) {
  return resolveRectRows(program, layer, dataset).map(item => ({
    type: "rect",
    properties: item.properties
  }));
}
