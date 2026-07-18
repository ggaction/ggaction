import { resolveBarChannels } from "../grammar/bars/policy.js";
import { formatTextValue } from "../grammar/text.js";
import { findDataset } from "../selectors/datasets.js";
import { findLayer } from "../selectors/layers.js";
import { resolveMarkItems } from "./selection/policies/index.js";
import { mapScaleConsumerValues } from "./scales/map.js";
import { resolveRowEncodingValues } from "./rowEncoding.js";

function sourceValue(item, source, field) {
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

function resolveSourceTextItems(program, layer, config) {
  const source = findLayer(program, layer.source);
  if (source === undefined) {
    throw new Error(`Text mark "${layer.id}" requires source layer "${layer.source}".`);
  }
  const items = resolveMarkItems(program, source.id);
  return items.flatMap(item => {
    const concrete = concreteItem(
      config,
      sourceAnchor(program, source, item),
      contentValue(layer.encoding.text, item, source),
      layer.encoding.text.format
    );
    return concrete === undefined ? [] : [concrete];
  });
}

function resolveRowTextItems(program, layer, config) {
  const dataset = findDataset(program, layer.data);
  if (dataset === undefined) {
    throw new Error(`Text mark "${layer.id}" requires an existing dataset.`);
  }
  const x = resolveRowEncodingValues(program, layer, dataset, "x");
  const y = resolveRowEncodingValues(program, layer, dataset, "y");
  if (x === undefined || y === undefined) return [];
  return dataset.values.flatMap((row, index) => {
    const concrete = concreteItem(
      config,
      { x: x[index], y: y[index] },
      contentValue(layer.encoding.text, row),
      layer.encoding.text.format
    );
    return concrete === undefined ? [] : [concrete];
  });
}

export function resolveTextGraphicItems(program, layer, config) {
  return layer.source === undefined
    ? resolveRowTextItems(program, layer, config)
    : resolveSourceTextItems(program, layer, config);
}
