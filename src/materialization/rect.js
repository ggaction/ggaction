import { hasPositionBinding } from "../core/encodingBindings.js";
import { resolveRowEncodingValues } from "./rowEncoding.js";
import {
  mapOrdinalPositionValues,
  readScaleField
} from "../grammar/scales/index.js";
import { normalizePositionDatum } from "../grammar/positionDatum.js";
import { resolveCoordinateBounds } from "./coordinateBounds.js";
import { RECT_MODES, resolveRectMode, rectUsesFields } from "../grammar/rects.js";
import { DEFAULT_RECT_MARK } from "./rectConfig.js";
import { mapScaleConsumerValues } from "./scales/map.js";
import { materializeRectItem } from "../grammar/roundedRect.js";
import { requestedStrokeDetails } from "../grammar/strokeStyle.js";

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
  return [
    ...position,
    ...(layer.encoding?.color ? ["color"] : []),
    ...["stroke", "opacity", "strokeWidth"].filter(channel => layer.encoding?.[channel])
  ];
}

export function resolveRectConsumerValues(layer, dataset, channel) {
  const length = rectUsesFields(layer) ? dataset.values.length : 1;
  const requested = optionalValues(dataset.values, layer.encoding[channel], length, channel);
  const mode = resolveRectMode(layer);
  if (mode === undefined) return requested;
  const complete = requiredChannels(layer, mode).filter(candidate => layer.encoding?.[candidate] !== undefined).map(candidate =>
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

function mappedEncoding(program, layer, dataset, channel, resolvers) {
  if (layer.conditionals?.[channel] !== undefined) {
    const mapped = resolveRowEncodingValues(program, layer, dataset, channel, resolvers, { includeScale: true });
    return { values: mapped.map(item => item.value), scales: mapped.map(item => item.scale) };
  }
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

function appearance(config, fill, stroke) {
  return {
    fill,
    opacity: config.opacity,
    stroke: stroke ?? (config.stroke === false ? "transparent" : config.stroke),
    strokeWidth: stroke === undefined && config.stroke === false
      ? 0
      : config.strokeWidth ?? 1,
    ...requestedStrokeDetails(config, "Rect mark")
  };
}

export function resolveRectRows(program, layer, dataset, resolvers) {
  const mode = resolveRectMode(layer);
  if (mode === undefined) return [];
  const bounds = resolveCoordinateBounds(program, layer.coordinate);
  const x = !hasPositionBinding(layer, "x") ? undefined : mappedEncoding(program, layer, dataset, "x", resolvers);
  const y = !hasPositionBinding(layer, "y") ? undefined : mappedEncoding(program, layer, dataset, "y", resolvers);
  const x2 = !hasPositionBinding(layer, "x2") ? undefined : mappedEncoding(program, layer, dataset, "x2", resolvers);
  const y2 = !hasPositionBinding(layer, "y2") ? undefined : mappedEncoding(program, layer, dataset, "y2", resolvers);
  const color = layer.encoding?.color === undefined
    ? undefined
    : mappedEncoding(program, layer, dataset, "color").values;
  const stroke = layer.encoding?.stroke === undefined
    ? undefined
    : mappedEncoding(program, layer, dataset, "stroke").values;
  const opacity = layer.encoding?.opacity === undefined ? undefined
    : mappedEncoding(program, layer, dataset, "opacity").values;
  const strokeWidth = layer.encoding?.strokeWidth === undefined ? undefined
    : mappedEncoding(program, layer, dataset, "strokeWidth").values;
  const config = program.markConfigs[layer.id] ?? DEFAULT_RECT_MARK;

  const rows = rectUsesFields(layer) ? dataset.values : [{}];
  return rows.flatMap((row, index) => {
    const fill = color === undefined ? config.fill : color[index];
    if (
      (x !== undefined && !Number.isFinite(x.values[index])) ||
      (y !== undefined && !Number.isFinite(y.values[index])) ||
      typeof fill !== "string" ||
      (stroke !== undefined && typeof stroke[index] !== "string") ||
      (opacity !== undefined && !Number.isFinite(opacity[index])) ||
      (strokeWidth !== undefined && !Number.isFinite(strokeWidth[index]))
    ) return [];

    let geometry;
    if (mode === RECT_MODES.discrete) {
      const width = (x.scales?.[index] ?? x.scale).bandwidth;
      const height = (y.scales?.[index] ?? y.scale).bandwidth;
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
      properties: { ...geometry, ...appearance(config, fill, stroke?.[index]),
        ...(opacity === undefined ? {} : { opacity: opacity[index] }),
        ...(strokeWidth === undefined ? {} : { strokeWidth: strokeWidth[index] }) }
    }];
  });
}

export function resolveRectGraphicItems(program, layer, dataset, resolvers) {
  const radius = program.markConfigs[layer.id] ?? {};
  return resolveRectRows(program, layer, dataset, resolvers).map(item =>
    materializeRectItem(item.properties, radius)
  );
}
