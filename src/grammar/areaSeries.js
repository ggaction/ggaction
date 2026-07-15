import { cloneAndFreeze } from "../core/immutable.js";
import {
  readNominalField,
  readQuantitativeField,
  readTemporalField
} from "./scales.js";
import {
  layoutSeriesPartition,
  validateColorLayout
} from "./seriesLayout.js";

export function deriveAreaSeries(rows, layer) {
  if (layer?.mark?.type !== "area") {
    throw new Error("Area series derivation requires a semantic area mark.");
  }
  const { x, y, x2, y2, group } = layer.encoding ?? {};
  const vertical =
    ["quantitative", "temporal"].includes(x?.fieldType) &&
    y?.fieldType === "quantitative" &&
    y2?.fieldType === "quantitative" &&
    x2 === undefined;
  const horizontal =
    ["quantitative", "temporal"].includes(y?.fieldType) &&
    x?.fieldType === "quantitative" &&
    x2?.fieldType === "quantitative" &&
    y2 === undefined;
  if (vertical === horizontal) {
    throw new Error(
      `Area mark "${layer.id}" requires exactly one quantitative x/x2 or y/y2 range and one quantitative or temporal independent position.`
    );
  }
  if (group !== undefined && group.fieldType !== "nominal") {
    throw new Error(`Area group encoding on mark "${layer.id}" must be nominal.`);
  }
  const orientation = vertical ? "vertical" : "horizontal";
  const independent = vertical ? x : y;
  const independentValues = independent.fieldType === "temporal"
    ? readTemporalField(rows, independent.field)
    : readQuantitativeField(rows, independent.field);
  const lower = vertical
    ? readQuantitativeField(rows, y.field)
    : readQuantitativeField(rows, x.field);
  const upper = vertical
    ? readQuantitativeField(rows, y2.field)
    : readQuantitativeField(rows, x2.field);
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
    series.values.push(vertical
      ? {
          x: independentValues[index],
          y: lower[index],
          y2: upper[index]
        }
      : {
          x: lower[index],
          x2: upper[index],
          y: independentValues[index]
        });
    groups.set(key, series);
  }
  if (groups.size === 0) {
    throw new Error(`Area mark "${layer.id}" has no values.`);
  }
  const series = [...groups.values()].map(item => {
    const key = vertical ? "x" : "y";
    const values = item.values.sort((left, right) => left[key] - right[key]);
    if (values.length < 2) {
      throw new Error(
        `Area series on mark "${layer.id}" requires at least two points.`
      );
    }
    return { key: item.key, values };
  });
  return cloneAndFreeze({
    orientation,
    xValues: series.flatMap(item => item.values.flatMap(value =>
      vertical ? [value.x] : [value.x, value.x2]
    )),
    yValues: series.flatMap(item => item.values.flatMap(value =>
      vertical ? [value.y, value.y2] : [value.y]
    )),
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

export function layoutDensityAreaSeries(derived, layout = "overlay") {
  validateColorLayout(layout);
  if (layout === "group") {
    throw new Error('Density area series do not support "group" layout.');
  }
  if (derived?.mode !== "y-density") {
    if (layout === "overlay") return derived;
    throw new Error(
      `Area layout "${layout}" currently requires vertical density series.`
    );
  }
  const sampleCount = derived.series[0]?.values.length ?? 0;
  if (
    sampleCount === 0 ||
    derived.series.some(series => series.values.length !== sampleCount)
  ) {
    throw new Error("Density area layout requires aligned non-empty samples.");
  }

  const valuesBySeries = derived.series.map(() => []);
  for (let sample = 0; sample < sampleCount; sample += 1) {
    const x = derived.series[0].values[sample].x;
    const densities = derived.series.map(series => {
      if (series.values[sample].x !== x) {
        throw new Error("Density area layout requires one shared sample grid.");
      }
      return series.values[sample].y;
    });
    const segments = new Map(
      layoutSeriesPartition(densities, layout).map(segment => [
        segment.index,
        segment
      ])
    );
    for (let index = 0; index < derived.series.length; index += 1) {
      const segment = segments.get(index);
      valuesBySeries[index].push({
        x,
        lower: segment?.start ?? 0,
        upper: segment?.end ?? 0
      });
    }
  }

  return cloneAndFreeze({
    mode: derived.mode,
    series: derived.series.map((series, index) => ({
      key: series.key,
      values: valuesBySeries[index]
    }))
  });
}
