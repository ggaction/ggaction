import { cloneAndFreeze } from "../core/immutable.js";
import { readNominalField } from "./scales.js";
import {
  aggregateRows,
  isAggregate,
  validateAggregateFieldType,
  validateAggregateFieldValues,
} from "./aggregate.js";

function requireAggregateBarEncoding(layer) {
  if (layer?.mark?.type !== "bar") {
    throw new Error("Bar aggregate derivation requires a semantic bar mark.");
  }

  const x = layer.encoding?.x;
  const y = layer.encoding?.y;

  if (x?.fieldType !== "ordinal") {
    throw new Error(`Bar mark "${layer.id}" requires an ordinal x encoding.`);
  }
  if (
    !isAggregate(y?.aggregate) ||
    y.stack !== null
  ) {
    throw new Error(
      `Bar mark "${layer.id}" requires a supported aggregate/non-stacked y encoding.`
    );
  }
  validateAggregateFieldType(y.aggregate, y.fieldType);

  return { x, y };
}

export function deriveBarAggregates(rows, layer) {
  const { x, y } = requireAggregateBarEncoding(layer);
  validateAggregateFieldValues(rows, y.field, y.fieldType);
  const xValues = readNominalField(rows, x.field);
  const color = layer.encoding?.color;
  let colorValues;

  if (color !== undefined) {
    if (color.fieldType !== "nominal") {
      throw new Error(`Bar color encoding on mark "${layer.id}" must be nominal.`);
    }
    colorValues = readNominalField(rows, color.field);
  }
  const groups = new Map();

  for (let index = 0; index < rows.length; index += 1) {
    const xValue = xValues[index];
    const colorValue = colorValues?.[index];
    const key = JSON.stringify([xValue, colorValue]);
    const group = groups.get(key) ?? {
      x: xValue,
      ...(colorValues === undefined ? {} : { color: colorValue }),
      rows: []
    };
    group.rows.push(rows[index]);
    groups.set(key, group);
  }

  if (groups.size === 0) {
    throw new Error(`Bar mark "${layer.id}" has no values to aggregate.`);
  }

  const values = [...groups.values()].flatMap(group => {
    const value = aggregateRows(group.rows, y.field, y.aggregate);
    return value === undefined ? [] : [{
      x: group.x,
      ...(Object.hasOwn(group, "color") ? { color: group.color } : {}),
      y: value,
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
