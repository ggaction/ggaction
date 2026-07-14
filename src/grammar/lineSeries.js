import { cloneAndFreeze } from "../core/immutable.js";
import {
  readNominalField,
  readQuantitativeField,
  readTemporalField
} from "./scales.js";
import {
  aggregateRows,
  isAggregate,
  validateAggregateFieldType,
  validateAggregateFieldValues,
} from "./aggregate.js";

const SERIES_CHANNELS = Object.freeze(["group", "color", "strokeDash"]);

function requireLineEncoding(layer) {
  if (layer?.mark?.type !== "line") {
    throw new Error("Line series derivation requires a semantic line mark.");
  }

  const x = layer.encoding?.x;
  const y = layer.encoding?.y;

  if (x === undefined) {
    throw new Error(`Line mark "${layer.id}" requires a temporal x encoding.`);
  }

  const aggregateMode =
    x?.fieldType === "temporal" && isAggregate(y?.aggregate);
  const isDirect =
    x?.fieldType === "quantitative" &&
    y?.fieldType === "quantitative" &&
    y.aggregate === undefined;
  if (!aggregateMode && !isDirect) {
    if (x?.fieldType === "temporal") {
      throw new Error(
        `Line mark "${layer.id}" requires a supported aggregate y encoding.`
      );
    }
    throw new Error(
      `Line mark "${layer.id}" requires temporal/aggregate or direct quantitative x/y encodings.`
    );
  }
  if (aggregateMode) {
    validateAggregateFieldType(y.aggregate, y.fieldType);
  }
  return { x, y, isAggregate: aggregateMode };
}

function readSeriesFields(rows, layer) {
  const fields = [];
  const values = new Map();

  for (const channel of SERIES_CHANNELS) {
    const encoding = layer.encoding?.[channel];

    if (encoding?.field === undefined) continue;
    if (encoding.fieldType !== "nominal") {
      throw new Error(`Line ${channel} encoding on mark "${layer.id}" must be nominal.`);
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
  const { x, y, isAggregate } = requireLineEncoding(layer);
  if (isAggregate) {
    validateAggregateFieldValues(rows, y.field, y.fieldType);
  }
  const xValues = isAggregate
    ? readTemporalField(rows, x.field)
    : readQuantitativeField(rows, x.field);
  if (!isAggregate) readQuantitativeField(rows, y.field);
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
      rows: []
    };

    group.rows.push(rows[index]);
    aggregateGroups.set(key, group);
  }

  if (aggregateGroups.size === 0) {
    throw new Error(`Line mark "${layer.id}" has no values to aggregate.`);
  }

  const seriesGroups = new Map();

  for (const group of aggregateGroups.values()) {
    const value = isAggregate
      ? aggregateRows(group.rows, y.field, y.aggregate)
      : group.rows.reduce((sum, row) => sum + row[y.field], 0);
    if (value === undefined) continue;
    const key = groupKey(group.dimensions);
    const series = seriesGroups.get(key) ?? {
      key: Object.fromEntries(
        seriesFields.fields.map((field, index) => [field, group.dimensions[index]])
      ),
      values: []
    };

    series.values.push({
      x: group.x,
      y: value
    });
    seriesGroups.set(key, series);
  }

  const series = [...seriesGroups.values()].flatMap(item => {
    const values = item.values.sort((left, right) => left.x - right.x);

    if (values.length < 2) {
      return [];
    }

    return [{ key: item.key, values }];
  });

  if (series.length === 0) {
    throw new Error(
      `Line series on mark "${layer.id}" requires at least two aggregate points.`
    );
  }

  return cloneAndFreeze({
    xValues: series.flatMap(item => item.values.map(value => value.x)),
    yValues: series.flatMap(item => item.values.map(value => value.y)),
    series
  });
}
