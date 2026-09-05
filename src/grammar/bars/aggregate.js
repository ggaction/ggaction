import { readSeriesIdentity } from "../pathSeries.js";
import { cloneAndFreeze } from "../../core/immutable.js";
import { readNominalField, readTemporalField } from "../scales/index.js";
import { aggregateRows, validateAggregateFieldType, validateAggregateFieldValues } from "../aggregate.js";
import { BAR_GRAINS, resolveBarChannels, resolveBarGrain, resolveBarColorLayout } from "./policy.js";
import { layoutSeriesPartition } from "../seriesLayout.js";

function requireAggregateBarEncoding(layer) {
  if (layer?.mark?.type !== "bar") {
    throw new Error("Bar aggregate derivation requires a semantic bar mark.");
  }

  const channels = resolveBarChannels(layer);
  if (resolveBarGrain(layer) !== BAR_GRAINS.aggregate) {
    throw new Error(
      `Bar mark "${layer.id}" requires a categorical position and quantitative aggregate measure.`
    );
  }
  const category = layer.encoding[channels.category];
  const measure = layer.encoding[channels.measure];
  validateAggregateFieldType(measure.aggregate, measure.fieldType);

  return { channels, category, measure };
}

export function deriveBarAggregates(rows, layer) {
  const { channels, category, measure } = requireAggregateBarEncoding(layer);
  validateAggregateFieldValues(rows, measure.field, measure.fieldType);
  const categoryValues = category.fieldType === "temporal"
    ? readTemporalField(rows, category.field, category.temporalUnit)
    : readNominalField(rows, category.field);
  const color = layer.encoding?.color;
  let colorValues;
  let colorAggregate;

  if (color !== undefined) {
    if (["nominal", "ordinal"].includes(color.fieldType)) {
      colorValues = readNominalField(rows, color.field);
    } else if (color.fieldType === "quantitative") {
      colorAggregate = color.aggregate;
      validateAggregateFieldType(colorAggregate, color.fieldType);
      validateAggregateFieldValues(rows, color.field, color.fieldType);
    } else {
      throw new Error(
        `Bar color encoding on mark "${layer.id}" must be categorical or aggregate quantitative.`
      );
    }
  }
  const identity = layer.encoding?.group === undefined ? undefined : readSeriesIdentity(rows, layer);
  const groups = new Map();

  for (let index = 0; index < rows.length; index += 1) {
    const categoryValue = categoryValues[index];
    const colorValue = colorValues?.[index];
    const seriesValue = identity?.values[index];
    const key = JSON.stringify([categoryValue, identity === undefined ? colorValue : seriesValue]);
    const group = groups.get(key) ?? {
      category: categoryValue,
      ...(identity === undefined ? {} : { series: seriesValue }),
      ...(colorValues === undefined ? {} : { color: colorValue }),
      rows: []
    };
    if (identity !== undefined && colorValues !== undefined && group.color !== colorValue) {
      throw new Error("Bar color requires one categorical value within each aggregate cell.");
    }
    group.rows.push(rows[index]);
    groups.set(key, group);
  }

  if (groups.size === 0) {
    throw new Error(`Bar mark "${layer.id}" has no values to aggregate.`);
  }

  const values = [...groups.values()].flatMap(group => {
    const value = aggregateRows(group.rows, measure.field, measure.aggregate);
    const aggregateColor = colorAggregate === undefined
      ? group.color
      : aggregateRows(group.rows, color.field, colorAggregate);
    return value === undefined || (
      colorAggregate !== undefined && aggregateColor === undefined
    ) ? [] : [{
      x: channels.category === "x" ? group.category : value,
      y: channels.category === "y" ? group.category : value,
      ...(color === undefined ? {} : { color: aggregateColor }),
      ...(identity === undefined ? {} : { series: group.series }),
      count: group.rows.length
    }];
  });

  if (values.length === 0) {
    throw new Error(`Bar mark "${layer.id}" has no complete aggregate values.`);
  }

  return cloneAndFreeze({
    xValues: values.map(value => value.x),
    yValues: values.map(value => value.y),
    values
  });
}

export function deriveSeriesBarCells(rows, layer, categoryDomain, seriesDomain) {
  const channels = resolveBarChannels(layer);
  const values = deriveBarAggregates(rows, layer).values;
  const identity = readSeriesIdentity(rows, layer);
  const categories = categoryDomain ?? [...new Set(values.map(cell => cell[channels.category]))].sort((a, b) => a - b);
  const seriesKey = cell => layer.encoding.group !== undefined ? cell.series : layer.encoding.color?.fieldType === "quantitative" ? undefined : cell.color;
  const series = seriesDomain ?? (layer.encoding.group !== undefined ? identity.domain : [...new Set(values.map(seriesKey))]);
  const cells = new Map(values.map(cell => [JSON.stringify([cell[channels.category], seriesKey(cell)]), cell]));
  const layout = resolveBarColorLayout(layer);
  return categories.flatMap(category => {
    const partition = series.map(key => cells.get(JSON.stringify([category, key])));
    const segments = layout === "group"
      ? partition.flatMap((cell, index) => cell === undefined ? [] : [{ index, start: 0, end: cell[channels.measure] }])
      : layoutSeriesPartition(partition.map(cell => cell?.[channels.measure] ?? 0), layout);
    return segments.flatMap(segment => partition[segment.index] === undefined ? [] : [{
      cell: partition[segment.index], start: segment.start, end: segment.end, seriesIndex: segment.index
    }]);
  });
}
