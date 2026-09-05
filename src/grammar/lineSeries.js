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
  validateAggregateFieldValues
} from "./aggregate.js";
import { stableOrderPathValues } from "./pathOrder.js";
import { finiteMidpoint } from "./numeric.js";
import {
  findHistogramBinIndex,
  resolveHistogramBins
} from "./histogram.js";
import {
  validatePathSeriesAppearance
} from "./pathSeries.js";

function requireLineEncoding(layer) {
  if (layer?.mark?.type !== "line") {
    throw new Error("Line series derivation requires a semantic line mark.");
  }

  const x = layer.encoding?.x;
  const y = layer.encoding?.y;

  if (x === undefined) {
    throw new Error(`Line mark "${layer.id}" requires a temporal x encoding.`);
  }

  const binnedAggregate =
    x?.fieldType === "quantitative" &&
    x.bin !== undefined &&
    isAggregate(y?.aggregate);
  const aggregateMode =
    (x?.fieldType === "temporal" && isAggregate(y?.aggregate)) ||
    binnedAggregate;
  const directQuantitative =
    x?.fieldType === "quantitative" &&
    x.bin === undefined &&
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
    binnedAggregate,
    directRows: directTemporal || directQuantitative,
    directTemporal
  };
}

function groupKey(values) {
  return JSON.stringify(values);
}

function groupedSeries(groups, fields, dimensions) {
  const id = groupKey(dimensions);
  let series = groups.get(id);
  if (series === undefined) {
    series = {
      key: Object.fromEntries(
        fields.map((field, index) => [field, dimensions[index]])
      ),
      values: []
    };
    groups.set(id, series);
  }
  return series;
}

function freezeCartesianSeries(series) {
  return cloneAndFreeze({
    xValues: series.flatMap(item => item.values.map(value => value.x)),
    yValues: series.flatMap(item => item.values.map(value => value.y)),
    series
  });
}

export function resolveLineBins(rows, layer, scale = {}) {
  const x = layer?.encoding?.x;
  if (
    layer?.mark?.type !== "line" ||
    x?.fieldType !== "quantitative" ||
    x.bin === undefined
  ) {
    return undefined;
  }
  return resolveHistogramBins({
    values: readQuantitativeField(rows, x.field),
    bin: x.bin,
    domain: scale.domain ?? "auto",
    nice: scale.nice ?? true,
    zero: scale.zero ?? false
  });
}

function deriveCartesianLineSeries(rows, layer, options = {}) {
  const { x, y, isAggregate, binnedAggregate, directRows, directTemporal } =
    requireLineEncoding(layer);
  if (isAggregate) {
    validateAggregateFieldValues(rows, y.field, y.fieldType);
  }
  const xValues = x.fieldType === "temporal"
    ? readTemporalField(rows, x.field, x.temporalUnit)
    : readQuantitativeField(rows, x.field);
  const yValues = isAggregate
    ? undefined
    : y.fieldType === "temporal"
      ? readTemporalField(rows, y.field, y.temporalUnit)
      : readQuantitativeField(rows, y.field);
  const seriesFields = validatePathSeriesAppearance(rows, layer);
  const binBoundaries = binnedAggregate
    ? options.xBinBoundaries ?? resolveLineBins(rows, layer).boundaries
    : undefined;

  const pathOrder = layer.encoding?.pathOrder;
  if (pathOrder !== undefined) {
    if (isAggregate) {
      throw new Error(
        `Line mark "${layer.id}" cannot combine aggregate y and path order.`
      );
    }
    const orderValues = readQuantitativeField(rows, pathOrder.field);
    const groups = new Map();
    for (let index = 0; index < rows.length; index += 1) {
      const dimensions = seriesFields.map(
        field => rows[index][field]
      );
      const series = groupedSeries(groups, seriesFields, dimensions);
      series.values.push({ x: xValues[index], y: yValues[index] });
      series.orderValues ??= [];
      series.orderValues.push(orderValues[index]);
    }
    const series = [...groups.values()].flatMap(item => {
      const values = stableOrderPathValues(
        item.values,
        item.orderValues,
        pathOrder.order
      );
      return values.length < 2 ? [] : [{ key: item.key, values }];
    });
    if (series.length === 0) {
      throw new Error(
        `Line series on mark "${layer.id}" requires at least two ordered points.`
      );
    }
    return freezeCartesianSeries(series);
  }

  if (directRows) {
    const groups = new Map();
    for (let index = 0; index < rows.length; index += 1) {
      const dimensions = seriesFields.map(
        field => rows[index][field]
      );
      const series = groupedSeries(groups, seriesFields, dimensions);
      series.values.push({ x: xValues[index], y: yValues[index] });
    }
    const orderBy = directTemporal && y.fieldType === "temporal" ? "y" : "x";
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
    return freezeCartesianSeries(series);
  }
  const aggregateGroups = new Map();

  for (let index = 0; index < rows.length; index += 1) {
    const dimensions = seriesFields.map(
      field => rows[index][field]
    );
    const binIndex = binnedAggregate
      ? findHistogramBinIndex(xValues[index], binBoundaries)
      : undefined;
    if (binIndex === -1) continue;
    const position = binnedAggregate
      ? finiteMidpoint(
          binBoundaries[binIndex],
          binBoundaries[binIndex + 1]
        )
      : xValues[index];
    const key = groupKey([binnedAggregate ? binIndex : position, ...dimensions]);
    const group = aggregateGroups.get(key) ?? {
      x: position,
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
    const value = aggregateRows(group.rows, y.field, y.aggregate);
    if (value === undefined) continue;
    const series = groupedSeries(
      seriesGroups,
      seriesFields,
      group.dimensions
    );

    series.values.push({
      x: group.x,
      y: value
    });
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

  return freezeCartesianSeries(series);
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
    ? readTemporalField(rows, encoding.field, encoding.temporalUnit)
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
  if (layer.encoding?.pathOrder !== undefined) {
    throw new Error(
      `Polar line mark "${layer.id}" does not support path order.`
    );
  }
  const { theta, radius } = requirePolarLineEncoding(layer);
  const thetaValues = readThetaValues(rows, theta);
  const radiusValues = readQuantitativeField(rows, radius.field);
  const sortValues = thetaOrder(thetaValues, theta.fieldType, thetaDomain);
  const seriesFields = validatePathSeriesAppearance(rows, layer);
  const groups = new Map();

  for (let index = 0; index < rows.length; index += 1) {
    const dimensions = seriesFields.map(
      field => rows[index][field]
    );
    const series = groupedSeries(groups, seriesFields, dimensions);
    series.values.push({
      theta: thetaValues[index],
      radius: radiusValues[index],
      order: sortValues[index],
      sourceIndex: index
    });
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
    : deriveCartesianLineSeries(rows, layer, options);
}
