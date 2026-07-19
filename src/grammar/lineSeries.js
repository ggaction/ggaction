import { cloneAndFreeze } from "../core/immutable.js";
import {
  readNominalField,
  readQuantitativeField,
  readTemporalField
} from "./scales/index.js";
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
  const directQuantitative =
    x?.fieldType === "quantitative" &&
    y?.fieldType === "quantitative" &&
    y.aggregate === undefined;
  const directTemporal =
    y?.aggregate === undefined &&
    ((x?.fieldType === "temporal" && y?.fieldType === "quantitative") ||
      (x?.fieldType === "quantitative" && y?.fieldType === "temporal"));
  if (!aggregateMode && !directQuantitative && !directTemporal) {
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
  return {
    x,
    y,
    isAggregate: aggregateMode,
    directTemporal
  };
}

function readSeriesFields(rows, layer) {
  const fields = [];
  const values = new Map();

  for (const channel of SERIES_CHANNELS) {
    const encoding = layer.encoding?.[channel];

    if (encoding?.field === undefined) continue;
    const categorical = channel === "color"
      ? ["nominal", "ordinal"].includes(encoding.fieldType)
      : encoding.fieldType === "nominal";
    if (!categorical) {
      throw new Error(
        `Line ${channel} encoding on mark "${layer.id}" must be categorical.`
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

function deriveCartesianLineSeries(rows, layer) {
  const { x, y, isAggregate, directTemporal } = requireLineEncoding(layer);
  if (isAggregate) {
    validateAggregateFieldValues(rows, y.field, y.fieldType);
  }
  const xValues = x.fieldType === "temporal"
    ? readTemporalField(rows, x.field)
    : readQuantitativeField(rows, x.field);
  const yValues = isAggregate
    ? undefined
    : y.fieldType === "temporal"
      ? readTemporalField(rows, y.field)
      : readQuantitativeField(rows, y.field);
  const seriesFields = readSeriesFields(rows, layer);

  if (directTemporal) {
    const groups = new Map();
    for (let index = 0; index < rows.length; index += 1) {
      const dimensions = seriesFields.fields.map(
        field => seriesFields.values.get(field)[index]
      );
      const key = groupKey(dimensions);
      const series = groups.get(key) ?? {
        key: Object.fromEntries(
          seriesFields.fields.map((field, item) => [field, dimensions[item]])
        ),
        values: []
      };
      series.values.push({ x: xValues[index], y: yValues[index] });
      groups.set(key, series);
    }
    const orderBy = x.fieldType === "temporal" ? "x" : "y";
    const series = [...groups.values()].flatMap(item => {
      const values = item.values.sort(
        (left, right) => left[orderBy] - right[orderBy]
      );
      return values.length < 2 ? [] : [{ key: item.key, values }];
    });
    if (series.length === 0) {
      throw new Error(
        `Line series on mark "${layer.id}" requires at least two direct points.`
      );
    }
    return cloneAndFreeze({
      xValues: series.flatMap(item => item.values.map(value => value.x)),
      yValues: series.flatMap(item => item.values.map(value => value.y)),
      series
    });
  }
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

function requirePolarLineEncoding(layer) {
  if (layer?.mark?.type !== "line") {
    throw new Error("Polar line series derivation requires a semantic line mark.");
  }
  const theta = layer.encoding?.theta;
  const radius = layer.encoding?.radius;
  if (theta === undefined || radius === undefined) {
    throw new Error(
      `Polar line mark "${layer.id}" requires theta and radius encodings.`
    );
  }
  if (!["quantitative", "temporal", "ordinal", "nominal"].includes(
    theta.fieldType
  )) {
    throw new Error(
      `Polar line mark "${layer.id}" has unsupported theta field type.`
    );
  }
  if (radius.fieldType !== "quantitative") {
    throw new Error(
      `Polar line mark "${layer.id}" requires a quantitative radius encoding.`
    );
  }
  return { theta, radius };
}

function readThetaValues(rows, encoding) {
  if (["nominal", "ordinal"].includes(encoding.fieldType)) {
    return readNominalField(rows, encoding.field);
  }
  return encoding.fieldType === "temporal"
    ? readTemporalField(rows, encoding.field)
    : readQuantitativeField(rows, encoding.field);
}

function thetaOrder(values, fieldType, domain) {
  if (!["nominal", "ordinal"].includes(fieldType)) return values;
  const order = domain ?? [...new Set(values)];
  const indices = new Map(order.map((value, index) => [value, index]));
  for (const value of values) {
    if (!indices.has(value)) {
      throw new Error(`Polar line theta domain does not contain "${value}".`);
    }
  }
  return values.map(value => indices.get(value));
}

export function derivePolarLineSeries(rows, layer, { thetaDomain } = {}) {
  const { theta, radius } = requirePolarLineEncoding(layer);
  const thetaValues = readThetaValues(rows, theta);
  const radiusValues = readQuantitativeField(rows, radius.field);
  const sortValues = thetaOrder(thetaValues, theta.fieldType, thetaDomain);
  const seriesFields = readSeriesFields(rows, layer);
  const groups = new Map();

  for (let index = 0; index < rows.length; index += 1) {
    const dimensions = seriesFields.fields.map(
      field => seriesFields.values.get(field)[index]
    );
    const key = groupKey(dimensions);
    const series = groups.get(key) ?? {
      key: Object.fromEntries(
        seriesFields.fields.map((field, item) => [field, dimensions[item]])
      ),
      values: []
    };
    series.values.push({
      theta: thetaValues[index],
      radius: radiusValues[index],
      order: sortValues[index],
      sourceIndex: index
    });
    groups.set(key, series);
  }

  const series = [...groups.values()].flatMap(item => {
    const values = item.values.sort(
      (left, right) => left.order - right.order ||
        left.sourceIndex - right.sourceIndex
    );
    return values.length < 2 ? [] : [{ key: item.key, values }];
  });
  if (series.length === 0) {
    throw new Error(
      `Polar line series on mark "${layer.id}" requires at least two points.`
    );
  }
  return cloneAndFreeze({
    thetaFieldType: theta.fieldType,
    thetaValues: series.flatMap(item => item.values.map(value => value.theta)),
    radiusValues: series.flatMap(item => item.values.map(value => value.radius)),
    series
  });
}

export function deriveLineSeries(rows, layer, options) {
  const polar = layer?.encoding?.theta !== undefined ||
    layer?.encoding?.radius !== undefined;
  return polar
    ? derivePolarLineSeries(rows, layer, options)
    : deriveCartesianLineSeries(rows, layer);
}
