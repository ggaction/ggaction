import { validateNonEmptyString } from "../core/validation.js";
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

export function readPathSeriesFields(rows, layer) {
  const fields = pathGroupFields(layer);
  for (const field of fields) readNominalField(rows, field);
  return fields;
}

function seriesValueIndex(rows, fields, field, channel, encoding = {}) {
  const quantitative = channel === "strokeWidth" || channel === "opacity";
  const values = channel === "stroke"
    ? readScaleField(rows, field, encoding.fieldType ?? "nominal", {
        temporalUnit: encoding.temporalUnit
      })
    : quantitative
    ? readQuantitativeField(rows, field)
    : readNominalField(rows, field);
  const result = new Map();
  rows.forEach((row, index) => {
    const key = JSON.stringify(fields.map(field => row[field]));
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
  encoding
) {
  const fields = Object.keys(series[0]?.key ?? {});
  const values = seriesValueIndex(rows, fields, field, channel, encoding);
  return series.map(item => values.get(JSON.stringify(Object.values(item.key))));
}

export function validatePathSeriesAppearance(rows, layer) {
  if (!["line", "area"].includes(layer.mark?.type) ||
      layer.encoding?.parallel !== undefined) return;
  const grouping = readPathSeriesFields(rows, layer);
  const channels = layer.mark.type === "line"
    ? ["color", "stroke", "strokeDash", "strokeWidth", "opacity"]
    : ["color", "stroke"];
  for (const channel of channels) {
    const encoding = layer.encoding?.[channel];
    if (encoding?.field === undefined) continue;
    const allowed = ["color", "stroke"].includes(channel)
      ? channel === "color"
        ? ["nominal", "ordinal"]
        : ["nominal", "ordinal", "quantitative", "temporal"]
      : channel === "strokeDash" ? ["nominal"] : ["quantitative"];
    if (!allowed.includes(encoding.fieldType)) {
      throw new Error(`Path ${channel} encoding has an unsupported field type.`);
    }
    seriesValueIndex(rows, grouping, encoding.field, channel, encoding);
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
