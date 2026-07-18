import {
  mapOrdinalPositionValues,
  readScaleField
} from "../grammar/scales.js";
import { RECT_MODES, resolveRectMode } from "../grammar/rects.js";
import { DEFAULT_RECT_MARK } from "./rectConfig.js";
import { mapScaleConsumerValues } from "./scales/map.js";

function optionalValues(rows, encoding) {
  return readScaleField(rows, encoding.field, encoding.fieldType, {
    allowUnknown: true
  });
}

function requiredChannels(layer, mode) {
  return mode === RECT_MODES.ranged
    ? ["x", "x2", "y", "y2", ...(layer.encoding?.color ? ["color"] : [])]
    : ["x", "y", ...(layer.encoding?.color ? ["color"] : [])];
}

export function resolveRectConsumerValues(layer, dataset, channel) {
  const requested = optionalValues(dataset.values, layer.encoding[channel]);
  const mode = resolveRectMode(layer);
  if (mode === undefined) return requested;
  const complete = requiredChannels(layer, mode).map(candidate =>
    optionalValues(dataset.values, layer.encoding[candidate])
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
  const x = mappedEncoding(program, layer, dataset, "x");
  const y = mappedEncoding(program, layer, dataset, "y");
  const x2 = mode === RECT_MODES.ranged
    ? mappedEncoding(program, layer, dataset, "x2")
    : undefined;
  const y2 = mode === RECT_MODES.ranged
    ? mappedEncoding(program, layer, dataset, "y2")
    : undefined;
  const color = layer.encoding?.color === undefined
    ? undefined
    : mappedEncoding(program, layer, dataset, "color").values;
  const config = program.markConfigs[layer.id] ?? DEFAULT_RECT_MARK;

  return dataset.values.flatMap((row, index) => {
    const fill = color === undefined ? config.fill : color[index];
    if (
      !Number.isFinite(x.values[index]) ||
      !Number.isFinite(y.values[index]) ||
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
      const endX = x2.values[index];
      const endY = y2.values[index];
      if (!Number.isFinite(endX) || !Number.isFinite(endY)) return [];
      geometry = {
        x: Math.min(x.values[index], endX),
        y: Math.min(y.values[index], endY),
        width: Math.abs(endX - x.values[index]),
        height: Math.abs(endY - y.values[index])
      };
      if (geometry.width <= 0 || geometry.height <= 0) return [];
    }
    return [{
      row,
      sourceIndex: index,
      channels: Object.fromEntries(
        ["x", "y", "x2", "y2", "color"].flatMap(channel => {
          const encoding = layer.encoding?.[channel];
          return encoding?.field === undefined
            ? []
            : [[channel, row[encoding.field]]];
        })
      ),
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
