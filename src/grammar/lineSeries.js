import { cloneAndFreeze } from "../core/immutable.js";
import {
  readNominalField,
  readQuantitativeField,
  readTemporalField
} from "./scales.js";

const SERIES_CHANNELS = Object.freeze(["color", "strokeDash"]);

function requireLineEncoding(layer) {
  if (layer?.mark?.type !== "line") {
    throw new Error("Line series derivation requires a semantic line mark.");
  }

  const x = layer.encoding?.x;
  const y = layer.encoding?.y;

  if (x?.fieldType !== "temporal") {
    throw new Error(`Line mark "${layer.id}" requires a temporal x encoding.`);
  }

  if (y?.fieldType !== "quantitative" || y.aggregate !== "mean") {
    throw new Error(
      `Line mark "${layer.id}" requires a quantitative mean y encoding.`
    );
  }

  return { x, y };
}

function readSeriesFields(rows, layer) {
  const fields = [];
  const values = new Map();

  for (const channel of SERIES_CHANNELS) {
    const encoding = layer.encoding?.[channel];

    if (encoding === undefined) continue;
    if (encoding.fieldType !== "nominal") {
      throw new Error(
        `Line ${channel} encoding on mark "${layer.id}" must be nominal.`
      );
    }

    if (!values.has(encoding.field)) {
      fields.push(encoding.field);
      values.set(encoding.field, readNominalField(rows, encoding.field));
    }
  }

  return { fields, values };
}

function groupKey(values) {
  return JSON.stringify(values);
}

export function deriveLineSeries(rows, layer) {
  const { x, y } = requireLineEncoding(layer);
  const xValues = readTemporalField(rows, x.field);
  const yValues = readQuantitativeField(rows, y.field);
  const seriesFields = readSeriesFields(rows, layer);
  const aggregateGroups = new Map();

  for (let index = 0; index < rows.length; index += 1) {
    const dimensions = seriesFields.fields.map(
      field => seriesFields.values.get(field)[index]
    );
    const key = groupKey([xValues[index], ...dimensions]);
    const group = aggregateGroups.get(key) ?? {
      x: xValues[index],
      dimensions,
      sum: 0,
      count: 0
    };

    group.sum += yValues[index];
    group.count += 1;
    aggregateGroups.set(key, group);
  }

  if (aggregateGroups.size === 0) {
    throw new Error(`Line mark "${layer.id}" has no values to aggregate.`);
  }

  const seriesGroups = new Map();

  for (const group of aggregateGroups.values()) {
    const key = groupKey(group.dimensions);
    const series = seriesGroups.get(key) ?? {
      key: Object.fromEntries(
        seriesFields.fields.map((field, index) => [field, group.dimensions[index]])
      ),
      values: []
    };

    series.values.push({ x: group.x, y: group.sum / group.count });
    seriesGroups.set(key, series);
  }

  const series = [...seriesGroups.values()].map(item => {
    const values = item.values.sort((left, right) => left.x - right.x);

    if (values.length < 2) {
      throw new Error(
        `Line series on mark "${layer.id}" requires at least two aggregate points.`
      );
    }

    return { key: item.key, values };
  });

  return cloneAndFreeze({
    xValues: series.flatMap(item => item.values.map(value => value.x)),
    yValues: series.flatMap(item => item.values.map(value => value.y)),
    series
  });
}
