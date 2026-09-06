import { resolveBarChannels } from "../grammar/bars/policy.js";
import { resolveMarkLabelValues } from "../grammar/markLabels.js";
import { formatTextValue } from "../grammar/text.js";
import { normalizePositionDatum } from "../grammar/positionDatum.js";
import { mapOrdinalPositionValues } from "../grammar/scales/index.js";
import { findDataset } from "../selectors/datasets.js";
import { findLayer } from "../selectors/layers.js";
import { resolveMarkItems } from "./selection/policies/index.js";
import { mapScaleConsumerValues } from "./scales/map.js";
import { resolveRowEncodingValues } from "./rowEncoding.js";

function sourceValue(item, source, field) {
  const measure = source.mark.type === "bar" ? resolveBarChannels(source).measure
    : source.mark.type === "arc" ? "radius" : undefined;
  const encoding = source.encoding?.[measure];
  if (encoding?.field === field && encoding.aggregate != null && item.channels[measure] !== undefined) {
    return source.mark.type === "bar"
      ? item.channels[`${measure}2`] ?? item.channels[measure]
      : item.channels[measure];
  }
  if (Object.hasOwn(item.fields, field)) return item.fields[field];
  for (const [channel, encoding] of Object.entries(source.encoding ?? {})) {
    if (encoding?.field !== field || item.channels[channel] === undefined) continue;
    if (source.mark.type === "bar" && item.channels[`${channel}2`] !== undefined) {
      return item.channels[`${channel}2`];
    }
    return item.channels[channel];
  }
  if (item.members.length === 1 && Object.hasOwn(item.members[0], field)) {
    return item.members[0][field];
  }
  return undefined;
}

function barAnchor(program, source, item) {
  const channels = resolveBarChannels(source);
  const measure = channels.measure;
  const endpoint = item.channels[`${measure}2`];
  const scale = program.resolvedScales[source.encoding[measure].scale];
  const mapped = endpoint === undefined || scale === undefined
    ? undefined
    : mapScaleConsumerValues([endpoint], scale, measure)[0];
  return measure === "x"
    ? {
        x: mapped ?? item.properties.x + item.properties.width,
        y: item.properties.y + item.properties.height / 2
      }
    : {
        x: item.properties.x + item.properties.width / 2,
        y: mapped ?? item.properties.y
      };
}

function sourceAnchor(program, source, item) {
  if (source.mark.type === "bar") return barAnchor(program, source, item);
  if (source.mark.type === "rect") {
    return {
      x: item.properties.x + item.properties.width / 2,
      y: item.properties.y + item.properties.height / 2
    };
  }
  if (source.mark.type === "rule") {
    return {
      x: item.properties.x2,
      y: item.properties.y2
    };
  }
  return { x: item.properties.x, y: item.properties.y };
}

function contentValue(encoding, rowOrItem, source) {
  return Object.hasOwn(encoding, "field")
    ? source === undefined
      ? rowOrItem[encoding.field]
      : sourceValue(rowOrItem, source, encoding.field)
    : encoding.datum;
}

function concreteItem(config, position, value, format) {
  const text = formatTextValue(value, format);
  const x = position.x;
  const y = position.y;
  if (text === undefined || !Number.isFinite(x) || !Number.isFinite(y)) {
    return undefined;
  }
  return {
    type: "text",
    properties: {
      x: x + config.dx,
      y: y + config.dy,
      text,
      fill: config.fill,
      opacity: config.opacity,
      fontSize: config.fontSize,
      fontFamily: config.fontFamily,
      fontWeight: config.fontWeight,
      textAlign: config.align,
      textBaseline: config.baseline,
      rotation: config.rotation
    }
  };
}

function relativeLuminance(color) {
  if (typeof color !== "string" || !/^#[0-9a-f]{6}$/i.test(color)) {
    return undefined;
  }
  const channels = [1, 3, 5].map(offset =>
    Number.parseInt(color.slice(offset, offset + 2), 16) / 255
  ).map(value => value <= 0.04045
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4
  );
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function sourceTextConfig(config, source, item) {
  if (
    !["arc", "rect"].includes(source.mark.type) ||
    config.fillExplicit === true
  ) return config;
  const luminance = relativeLuminance(item.properties.fill);
  if (luminance === undefined) return config;
  return {
    ...config,
    fill: luminance >= 0.26 ? "#0f172a" : "#f8fafc"
  };
}

function resolveSourceTextItems(program, layer, config) {
  const source = findLayer(program, layer.source);
  if (source === undefined) {
    throw new Error(`Text mark "${layer.id}" requires source layer "${layer.source}".`);
  }
  const items = resolveMarkItems(program, source.id);
  const values = layer.encoding.text.content === undefined ? undefined
    : resolveMarkLabelValues(source, items, layer.encoding.text);
  return items.flatMap((item, index) => {
    const anchor = sourceAnchor(program, source, item);
    const concrete = concreteItem(
      sourceTextConfig(config, source, item),
      anchor,
      values === undefined ? contentValue(layer.encoding.text, item, source) : values[index],
      layer.encoding.text.format
    );
    return concrete === undefined ? [] : [{ graphic: concrete, anchor }];
  });
}

function resolveRowTextItems(program, layer, config) {
  const dataset = findDataset(program, layer.data);
  if (dataset === undefined) {
    throw new Error(`Text mark "${layer.id}" requires an existing dataset.`);
  }
  const encodings = [layer.encoding?.x, layer.encoding?.y, layer.encoding?.text];
  const length = encodings.some(encoding => encoding !== undefined && Object.hasOwn(encoding, "field"))
    ? dataset.values.length
    : 1;
  const positionValues = channel => {
    const encoding = layer.encoding?.[channel];
    if (encoding === undefined) return undefined;
    if (Object.hasOwn(encoding, "field")) {
      return resolveRowEncodingValues(program, layer, dataset, channel);
    }
    const scale = program.resolvedScales[encoding.scale];
    if (scale === undefined) {
      throw new Error(
        `text mark "${layer.id}" requires resolved ${channel} scale "${encoding.scale}".`
      );
    }
    const datum = normalizePositionDatum(
      encoding.datum,
      encoding.fieldType,
      channel,
      encoding.temporalUnit,
      "Text"
    );
    const mapped = ["nominal", "ordinal"].includes(encoding.fieldType)
      ? mapOrdinalPositionValues([datum], scale)
      : mapScaleConsumerValues([datum], scale, channel);
    return Array.from({ length }, () => mapped[0]);
  };
  const x = positionValues("x");
  const y = positionValues("y");
  if (x === undefined || y === undefined) return [];
  const rows = length === 1 && dataset.values.length === 0
    ? [undefined]
    : dataset.values.slice(0, length);
  return rows.flatMap((row, index) => {
    const concrete = concreteItem(
      config,
      { x: x[index], y: y[index] },
      contentValue(layer.encoding.text, row),
      layer.encoding.text.format
    );
    return concrete === undefined
      ? []
      : [{ graphic: concrete, anchor: { x: x[index], y: y[index] } }];
  });
}

export function resolveTextGraphicEntries(program, layer, config) {
  return layer.source === undefined
    ? resolveRowTextItems(program, layer, config)
    : resolveSourceTextItems(program, layer, config);
}

export function resolveTextGraphicItems(program, layer, config) {
  return resolveTextGraphicEntries(program, layer, config)
    .map(entry => entry.graphic);
}
