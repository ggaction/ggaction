import { identifyItems } from "./selection/items/common.js";
import { resolveItemPositionBindings } from "./conditionalPositionBindings.js";
import { resolveBarChannels } from "../grammar/bars/policy.js";
import { resolveMarkLabelValues } from "../grammar/markLabels.js";
import { formatTextValue } from "../grammar/text.js";
import { findLayer } from "../selectors/layers.js";

export function sourceValue(item, source, field) {
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
  if (["line", "trail"].includes(source.mark.type) && item.members.length > 0) {
    const endpoint = item.members.at(-1);
    if (Object.hasOwn(endpoint, field)) return endpoint[field];
  }
  return undefined;
}

export function contentValue(encoding, rowOrItem, source) {
  return Object.hasOwn(encoding, "field")
    ? source === undefined
      ? rowOrItem[encoding.field]
      : sourceValue(rowOrItem, source, encoding.field)
    : encoding.datum;
}

// Both ordinary and conditional text resolve at the same final source grain.
export function textEncodingValues(program, layer, encoding, items, sources, { mapped = true, resolvers } = {}) {
  const source = layer.source === undefined ? undefined : findLayer(program, layer.source);
  let values;
  if (encoding.content !== undefined && resolvers !== undefined) {
    const population = resolvers.resolveMarkItems(program, source.id, "item", { channels: [] });
    const populationSources = resolveTextSourceBindings(program, layer, population, resolvers);
    const resolved = resolveMarkLabelValues(source, population, encoding, { sources: populationSources });
    const labels = identifyItems(program, layer, "text", population.map(item => ({
      semanticIdentity: ["label", item.key], members: item.members, memberKeys: item.rowKeys
    })));
    const byKey = new Map(population.flatMap((item, index) => [[item.key, resolved[index]], [labels[index].key, resolved[index]]]));
    values = items.map(item => {
      if (!byKey.has(item.key)) throw new Error("Text content requires one exact source item identity.");
      return byKey.get(item.key);
    });
  } else values = encoding.content === undefined
    ? items.map((item, index) => contentValue(encoding, source === undefined ? item.fields : item, sources?.[index] ?? source))
    : resolveMarkLabelValues(source, items, encoding, { sources });
  const formatted = values.map(value => formatTextValue(value, encoding.format));
  return mapped ? formatted : values;
}

export function resolveTextSourceBindings(program, layer, items, resolvers) {
  const source = layer.source === undefined ? undefined : findLayer(program, layer.source);
  // Path labels use the native series endpoint and raw endpoint fields; the
  // positional predicates belong to vertices, not the whole series item.
  return source === undefined || ["line", "area", "trail"].includes(source.mark.type) ? undefined
    : resolveItemPositionBindings(program, source, items, resolvers);
}
