import { validateNonEmptyString } from "../core/validation.js";
import { readCategoricalLineColor, validateCategoricalColorConsumer } from "./scales/colorConsumers.js";
import {
  readNominalField,
  readQuantitativeField,
  readScaleField
} from "./scales/fields.js";

export function normalizeGroupFields(value) {
  const fields = Array.isArray(value) ? [...value] : [value];
  for (const field of fields) validateNonEmptyString(field, "Path group field");
  if (fields.length === 0 || new Set(fields).size !== fields.length) {
    throw new Error("Path group fields must be non-empty and unique.");
  }
  return fields;
}

export function pathGroupFields(layer) {
  const group = layer.encoding?.group;
  if (group !== undefined) {
    if (group.fieldType !== "nominal") {
      throw new Error(`Path group on mark "${layer.id}" must be nominal.`);
    }
    if (Object.hasOwn(group, "field") && Object.hasOwn(group, "fields")) {
      throw new Error("Path group requires exactly one of field or fields.");
    }
    return normalizeGroupFields(group.fields ?? group.field);
  }
  if (layer.mark?.type !== "line") return [];
  const color = layer.encoding?.color?.field;
  const dash = layer.encoding?.strokeDash?.field;
  if (color !== undefined && dash !== undefined && color !== dash) {
    throw new Error("Line color field must match strokeDash field unless encodeGroup defines the series.");
  }
  return color === undefined && dash === undefined ? [] : [color ?? dash];
}

export function pathSeriesKey(values) {
  return JSON.stringify(values.map(value => value === undefined ? {} : value));
}

function lineColorScale(layer, scales) {
  const color = layer.encoding?.color;
  const scale = Array.isArray(scales) ? scales.find(item => item.id === color?.scale) : scales?.[color?.scale];
  return scale !== undefined && validateCategoricalColorConsumer(layer, color, scale) ? scale : undefined;
}

export function readPathSeriesFields(rows, layer, scales) {
  const fields = pathGroupFields(layer);
  const fallback = lineColorScale(layer, scales);
  for (const field of fields) {
    if (fallback && layer.encoding?.group === undefined && field === layer.encoding.color.field) {
      readCategoricalLineColor(rows, field);
    } else readNominalField(rows, field);
  }
  return fields;
}

function seriesValueIndex(rows, fields, field, channel, encoding = {}, scale) {
  const quantitative = channel === "strokeWidth" || channel === "opacity";
  const values = channel === "color" && scale !== undefined
    ? readCategoricalLineColor(rows, field)
    : channel === "stroke" || (channel === "color" && encoding.fieldType === "quantitative")
    ? readScaleField(rows, field, encoding.fieldType ?? "nominal", {
        temporalUnit: encoding.temporalUnit
      })
    : quantitative
    ? readQuantitativeField(rows, field)
    : readNominalField(rows, field);
  const result = new Map();
  rows.forEach((row, index) => {
    const key = pathSeriesKey(fields.map(field => row[field]));
    const value = values[index];
    if (channel === "strokeWidth" && value < 0) {
      throw new RangeError(`Line strokeWidth field "${field}" cannot contain negative values.`);
    }
    if (result.has(key) && result.get(key) !== value) {
      throw new Error(`Path ${channel} field "${field}" must have one value within each series.`);
    }
    result.set(key, value);
  });
  return result;
}

export function derivePathSeriesFieldValues(
  rows,
  series,
  field,
  channel,
  encoding,
  scale
) {
  if (series.length === 0) return [];
  const fields = Object.keys(series[0]?.key ?? {});
  const values = seriesValueIndex(rows, fields, field, channel, encoding,
    Object.hasOwn(scale ?? {}, "unknown") ? scale : undefined);
  return series.map(item => values.get(pathSeriesKey(Object.values(item.key))));
}

export function validatePathSeriesAppearance(rows, layer, scales) {
  if (!["line", "area"].includes(layer.mark?.type) ||
      layer.encoding?.parallel !== undefined) return;
  const grouping = readPathSeriesFields(rows, layer, scales);
  const colorScale = lineColorScale(layer, scales);
  const channels = layer.mark.type === "line"
    ? ["color", "stroke", "strokeDash", "strokeWidth", "opacity"]
    : ["color", "stroke"];
  for (const channel of channels) {
    const encoding = layer.encoding?.[channel];
    if (encoding?.field === undefined) continue;
    const allowed = ["color", "stroke"].includes(channel)
      ? channel === "color"
        ? layer.mark.type === "area" ? ["nominal", "ordinal", "quantitative"] : ["nominal", "ordinal"]
        : ["nominal", "ordinal", "quantitative", "temporal"]
      : channel === "strokeDash" ? ["nominal", "ordinal"] : ["quantitative"];
    if (!allowed.includes(encoding.fieldType)) {
      throw new Error(`Path ${channel} encoding has an unsupported field type.`);
    }
    seriesValueIndex(rows, grouping, encoding.field, channel, encoding, channel === "color" ? colorScale : undefined);
  }
  return grouping;
}

export function readSeriesIdentity(rows, layer) {
  const group = layer.encoding?.group;
  const fields = group === undefined ? [] : normalizeGroupFields(group.fields ?? group.field);
  for (const field of fields) readNominalField(rows, field);
  const values = rows.map(row => fields.length === 0 ? undefined : fields.length === 1
    ? row[fields[0]] : JSON.stringify(fields.map(field => row[field])));
  return { fields, values, domain: [...new Set(values)] };
}
