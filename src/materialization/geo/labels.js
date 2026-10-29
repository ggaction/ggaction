import { formatTextValue, validateTextFormat } from "../../grammar/text.js";
import { getPositionChannelDefinition } from "../../core/vocabulary.js";
import { isGeoLabelSource } from "../../grammar/geo/mark.js";
import { findLayer } from "../../selectors/layers.js";
import { geoSourceDataset } from "./featureDataset.js";

export function geoLabelSource(program, layer) {
  const source = layer.mark?.type === "text" && layer.source !== undefined ? findLayer(program, layer.source) : undefined;
  return isGeoLabelSource(source) ? source : undefined;
}

export function geoLabelDataset(program, layer) {
  const source = geoLabelSource(program, layer);
  return source === undefined ? undefined : geoSourceDataset(program, source);
}

export function sourceTextItemKey(layer, key) {
  return JSON.stringify([[], layer.id, "text", ["label", key]]);
}

export function identifyGeoLabelItems(layer, definitions) {
  return definitions.map(definition => {
    const item = definition.sourceItem;
    return { ...definition, key: sourceTextItemKey(layer, item.key), topology: "text", memberKeys: [],
      rows: item.rows, lineage: item.lineage,
      ...(item.representationKeys === undefined ? {} : { representationKeys: item.representationKeys.map(key => sourceTextItemKey(layer, key)) }) };
  });
}

export function validateGeoLabelBinding(program, layer) {
  const source = geoLabelSource(program, layer);
  if (source === undefined) throw new TypeError("Geographic Text requires a feature or graticule source.");
  if (layer.data !== undefined || layer.transform !== undefined || layer.coordinate !== source.coordinate ||
      [...Object.keys(layer.encoding ?? {}), ...Object.keys(layer.conditionals ?? {})].some(channel => getPositionChannelDefinition(channel) !== undefined || ["dx", "dy"].includes(channel))) {
    throw new TypeError("Geographic labels inherit their source coordinate and cannot own data or position encodings.");
  }
  const encoding = layer.encoding?.text;
  if (encoding !== undefined) {
    const format = validateTextFormat(encoding.format);
    if (encoding.content !== undefined) throw new TypeError("Geographic labels require field or constant text.");
    const { values } = geoLabelDataset(program, layer);
    if (encoding.field !== undefined && values.length > 0 && !values.some(row => Object.hasOwn(row, encoding.field))) throw new Error(`Unknown text field "${encoding.field}".`);
    for (const row of encoding.field === undefined ? [undefined] : values) formatTextValue(encoding.field === undefined ? encoding.datum : row[encoding.field], format);
  }
}
