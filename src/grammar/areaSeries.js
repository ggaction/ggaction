import { cloneAndFreeze } from "../core/immutable.js";
import { readNominalField, readQuantitativeField } from "./scales.js";

export function deriveAreaSeries(rows, layer) {
  if (layer?.mark?.type !== "area") {
    throw new Error("Area series derivation requires a semantic area mark.");
  }
  const { x, y, y2, group } = layer.encoding ?? {};
  if (
    x?.fieldType !== "quantitative" ||
    y?.fieldType !== "quantitative" ||
    y2?.fieldType !== "quantitative"
  ) {
    throw new Error(
      `Area mark "${layer.id}" requires quantitative x, y, and y2 encodings.`
    );
  }
  if (group !== undefined && group.fieldType !== "nominal") {
    throw new Error(`Area group encoding on mark "${layer.id}" must be nominal.`);
  }
  const xValues = readQuantitativeField(rows, x.field);
  const yValues = readQuantitativeField(rows, y.field);
  const y2Values = readQuantitativeField(rows, y2.field);
  const groupValues = group === undefined
    ? rows.map(() => undefined)
    : readNominalField(rows, group.field);
  const groups = new Map();

  for (let index = 0; index < rows.length; index += 1) {
    const key = groupValues[index];
    const series = groups.get(key) ?? {
      key: group === undefined ? {} : { [group.field]: key },
      values: []
    };
    series.values.push({
      x: xValues[index],
      y: yValues[index],
      y2: y2Values[index]
    });
    groups.set(key, series);
  }
  if (groups.size === 0) {
    throw new Error(`Area mark "${layer.id}" has no values.`);
  }
  const series = [...groups.values()].map(item => {
    const values = item.values.sort((left, right) => left.x - right.x);
    if (values.length < 2) {
      throw new Error(
        `Area series on mark "${layer.id}" requires at least two points.`
      );
    }
    return { key: item.key, values };
  });
  return cloneAndFreeze({
    xValues: series.flatMap(item => item.values.map(value => value.x)),
    yValues: series.flatMap(item =>
      item.values.flatMap(value => [value.y, value.y2])
    ),
    series
  });
}

export function deriveDensityAreaSeries(rows, layer, transform) {
  if (layer?.mark?.type !== "area") {
    throw new Error("Density area derivation requires a semantic area mark.");
  }
  if (transform?.type !== "density" || !Array.isArray(transform.as)) {
    throw new Error(`Area mark "${layer.id}" requires density provenance.`);
  }
  const { x, y, group } = layer.encoding ?? {};
  if (
    x?.fieldType !== "quantitative" ||
    y?.fieldType !== "quantitative"
  ) {
    throw new Error(
      `Density area mark "${layer.id}" requires quantitative x and y encodings.`
    );
  }
  const [valueField, densityField] = transform.as;
  const mode = x.field === valueField && y.field === densityField
    ? "y-density"
    : x.field === densityField && y.field === valueField
      ? "x-density"
      : undefined;
  if (mode === undefined) {
    throw new Error(
      `Density area mark "${layer.id}" must encode its value and density fields.`
    );
  }
  if (transform.groupBy === undefined) {
    if (group !== undefined) {
      throw new Error(`Ungrouped density area mark "${layer.id}" cannot encode group.`);
    }
  } else if (
    group?.field !== transform.groupBy ||
    group.fieldType !== "nominal"
  ) {
    throw new Error(
      `Density area mark "${layer.id}" must group by "${transform.groupBy}".`
    );
  }

  const xValues = readQuantitativeField(rows, x.field);
  const yValues = readQuantitativeField(rows, y.field);
  const groupValues = transform.groupBy === undefined
    ? rows.map(() => undefined)
    : readNominalField(rows, transform.groupBy);
  const groups = new Map();
  for (let index = 0; index < rows.length; index += 1) {
    const key = groupValues[index];
    const series = groups.get(key) ?? {
      key: transform.groupBy === undefined ? {} : { [transform.groupBy]: key },
      values: []
    };
    series.values.push({ x: xValues[index], y: yValues[index] });
    groups.set(key, series);
  }
  if (groups.size === 0) {
    throw new Error(`Density area mark "${layer.id}" has no values.`);
  }
  const valueKey = mode === "y-density" ? "x" : "y";
  const series = [...groups.values()].map(item => {
    const values = item.values.sort((left, right) => left[valueKey] - right[valueKey]);
    if (values.length < 2) {
      throw new Error(
        `Density area series on mark "${layer.id}" requires at least two points.`
      );
    }
    return { key: item.key, values };
  });
  return cloneAndFreeze({ mode, series });
}
