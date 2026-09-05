import { cloneAndFreeze } from "../core/immutable.js";
import { readNominalField, readQuantitativeField, readTemporalField } from "./scales/index.js";
import { layoutSeriesPartition, validateColorLayout } from "./seriesLayout.js";
import { stableOrderPathValues } from "./pathOrder.js";
import { deriveCategoricalDensitySeries } from "./categoricalDensity.js";
import { validatePathSeriesAppearance } from "./pathSeries.js";
import { readAreaEndpoint, validateAreaEndpointPair } from "./areaEndpoints.js";
import { validateGeneratedItemLimit } from "../core/validation.js";

function indexSegments(segments) {
  const indexed = [];
  for (const segment of segments) indexed[segment.index] = segment;
  return indexed;
}

export function deriveAreaSeries(rows, layer) {
  if (layer?.mark?.type !== "area") {
    throw new Error("Area series derivation requires a semantic area mark.");
  }
  const { x, y, x2, y2 } = layer.encoding ?? {};
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
  const grouping = validatePathSeriesAppearance(rows, layer);
  const orientation = vertical ? "vertical" : "horizontal";
  const independent = vertical ? x : y;
  const independentValues = independent.fieldType === "temporal"
    ? readTemporalField(rows, independent.field, independent.temporalUnit)
    : readQuantitativeField(rows, independent.field);
  if (Object.hasOwn(independent, "datum")) throw new Error("Area independent position requires a field.");
  const primary = vertical ? y : x;
  const secondary = vertical ? y2 : x2;
  validateAreaEndpointPair(primary, secondary);
  const missing = layer.mark.missing ?? "error";
  const lower = readAreaEndpoint(rows, primary, missing);
  const upper = readAreaEndpoint(rows, secondary, missing);
  const pathOrder = layer.encoding?.pathOrder;
  const orderValues = pathOrder === undefined
    ? undefined
    : readQuantitativeField(rows, pathOrder.field);
  const groups = new Map();

  for (let index = 0; index < rows.length; index += 1) {
    const tuple = grouping.map(field => rows[index][field]);
    const key = JSON.stringify(tuple);
    const series = groups.get(key) ?? {
      key: Object.fromEntries(grouping.map((field, i) => [field, tuple[i]])),
      values: []
    };
    series.values.push(vertical
      ? {
          x: independentValues[index],
          y: lower[index],
          y2: upper[index],
          ...(missing === "break" ? { sourceIndex: index } : {}),
          ...(orderValues === undefined ? {} : { pathOrder: orderValues[index] })
        }
      : {
          x: lower[index],
          x2: upper[index],
          ...(missing === "break" ? { sourceIndex: index } : {}),
          y: independentValues[index],
          ...(orderValues === undefined ? {} : { pathOrder: orderValues[index] })
        });
    groups.set(key, series);
  }
  if (groups.size === 0) {
    throw new Error(`Area mark "${layer.id}" has no values.`);
  }
  layoutRawAreaGroups(groups, { layer, vertical, primary, secondary });
  const series = [...groups.values()].flatMap(item => {
    const key = vertical ? "x" : "y";
    const values = pathOrder === undefined
      ? item.values.sort((left, right) => left[key] - right[key])
      : stableOrderPathValues(
          item.values.map(({ pathOrder: _pathOrder, ...value }) => value),
          item.values.map(value => value.pathOrder),
          pathOrder.order
        );
    if (missing === "break") {
      const segments = [];
      let segment = [];
      const emit = () => {
        if (segment.length >= 2) segments.push({ key: item.key,
          sourceIndices: segment.map(value => value.sourceIndex),
          values: segment.map(({ sourceIndex, ...value }) => value) });
        segment = [];
      };
      for (const value of values) {
        if ((vertical ? value.y == null || value.y2 == null : value.x == null || value.x2 == null)) emit();
        else segment.push(value);
      }
      emit();
      return segments;
    }
    if (values.length < 2) {
      throw new Error(
        `Area series on mark "${layer.id}" requires at least two points.`
      );
    }
    return { key: item.key, values };
  });
  if (series.length === 0) throw new Error(`Area mark "${layer.id}" has no valid segment with at least two points.`);
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

export function deriveCenteredAreaSeries(rows, layer) {
  if (layer?.mark?.type !== "area") {
    throw new Error("Centered area series derivation requires an area mark.");
  }
  const { x, y, x2, y2, group, color } = layer.encoding ?? {};
  if (
    !["quantitative", "temporal"].includes(x?.fieldType) ||
    y?.fieldType !== "quantitative" ||
    y?.stack !== "center" ||
    x2 !== undefined ||
    y2 !== undefined
  ) {
    throw new Error(
      `Centered area mark "${layer.id}" requires one x field and one quantitative y field without ranged endpoints.`
    );
  }
  if (group?.fieldType !== "nominal") {
    throw new Error(`Centered area mark "${layer.id}" requires a nominal group encoding.`);
  }
  if (color !== undefined && color.field !== group.field) {
    throw new Error(
      `Centered area color on mark "${layer.id}" must match its group field.`
    );
  }
  const xValues = x.fieldType === "temporal"
    ? readTemporalField(rows, x.field, x.temporalUnit)
    : readQuantitativeField(rows, x.field);
  const yValues = readQuantitativeField(rows, y.field);
  const groups = readNominalField(rows, group.field);
  const groupOrder = [];
  const positions = new Set();
  const byGroup = new Map();
  for (let index = 0; index < rows.length; index += 1) {
    const key = groups[index];
    if (!byGroup.has(key)) {
      groupOrder.push(key);
      byGroup.set(key, new Map());
    }
    const values = byGroup.get(key);
    if (values.has(xValues[index])) {
      throw new Error(
        `Centered area mark "${layer.id}" has duplicate ${group.field}/${x.field} rows.`
      );
    }
    values.set(xValues[index], yValues[index]);
    positions.add(xValues[index]);
  }
  const orderedPositions = [...positions].sort((left, right) => left - right);
  if (groupOrder.length === 0 || orderedPositions.length < 2) {
    throw new Error(
      `Centered area mark "${layer.id}" requires at least two aligned positions.`
    );
  }
  for (const [key, values] of byGroup) {
    if (
      values.size !== orderedPositions.length ||
      orderedPositions.some(position => !values.has(position))
    ) {
      throw new Error(
        `Centered area series "${String(key)}" requires one aligned value at every x position.`
      );
    }
  }

  const valuesBySeries = groupOrder.map(() => []);
  for (const position of orderedPositions) {
    const partition = groupOrder.map(key => byGroup.get(key).get(position));
    const resolvedSegments = layoutSeriesPartition(partition, "center");
    const segments = indexSegments(resolvedSegments);
    let endpoint = resolvedSegments[0]?.start ?? 0;
    for (let index = 0; index < groupOrder.length; index += 1) {
      const segment = segments[index];
      valuesBySeries[index].push({
        x: position,
        y: partition[index],
        lower: segment?.start ?? endpoint,
        upper: segment?.end ?? endpoint
      });
      if (segment !== undefined) endpoint = segment.end;
    }
  }
  const series = groupOrder.map((key, index) => ({
    key: {
      [group.field]: key,
      ...(color === undefined ? {} : { [color.field]: key })
    },
    values: valuesBySeries[index]
  }));
  return cloneAndFreeze({
    mode: "y-center",
    orientation: "vertical",
    xValues: orderedPositions,
    yValues: series.flatMap(item => item.values.flatMap(value => [
      value.lower,
      value.upper
    ])),
    series
  });
}

export function deriveDensityAreaSeries(rows, layer, transform) {
  if (layer?.mark?.type !== "area") {
    throw new Error("Density area derivation requires a semantic area mark.");
  }
  if (layer.encoding?.pathOrder !== undefined) {
    throw new Error(
      `Density area mark "${layer.id}" does not support path order.`
    );
  }
  if (transform?.type !== "density" || !Array.isArray(transform.as)) {
    throw new Error(`Area mark "${layer.id}" requires density provenance.`);
  }
  if (transform.placement?.type === "category") {
    return deriveCategoricalDensitySeries(rows, layer, transform);
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
    const resolvedSegments = layoutSeriesPartition(densities, layout);
    const segments = indexSegments(resolvedSegments);
    let zeroThicknessEndpoint = layout === "center"
      ? resolvedSegments[0]?.start ?? 0
      : 0;
    for (let index = 0; index < derived.series.length; index += 1) {
      const segment = segments[index];
      valuesBySeries[index].push({
        x,
        lower: segment?.start ?? zeroThicknessEndpoint,
        upper: segment?.end ?? zeroThicknessEndpoint
      });
      if (segment !== undefined && ["stack", "fill", "center"].includes(layout)) {
        zeroThicknessEndpoint = segment.end;
      }
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

export function layoutRawAreaGroups(groups, { layer, vertical, primary, secondary }) {
  const mode = layer.layout?.mode ?? "overlay";
  validateColorLayout(mode);
  if (mode === "overlay") return;
  if (mode === "group" || (mode === "center" && !vertical)) {
    throw new Error(`Area layout "${mode}" is incompatible with this orientation.`);
  }
  const primaryDatum = Object.hasOwn(primary, "datum");
  const secondaryDatum = Object.hasOwn(secondary, "datum");
  if (primaryDatum === secondaryDatum || (primaryDatum ? primary.datum : secondary.datum) !== 0) {
    throw new Error("Stacked area requires one value field and one zero datum endpoint.");
  }
  const position = vertical ? "x" : "y";
  const lower = vertical ? "y" : "x", upper = `${lower}2`;
  const measure = primaryDatum ? upper : lower;
  const series = [...groups.values()];
  const indices = series.map(item => {
    const index = new Map();
    for (const value of item.values) {
      if (index.has(value[position])) throw new Error("Area layout requires unique group/position rows.");
      index.set(value[position], value);
    }
    return index;
  });
  const positions = [...new Set(series.flatMap(item => item.values.map(value => value[position])))].sort((a, b) => a - b);
  validateGeneratedItemLimit(positions.length * series.length, "Area layout cell count");
  if (indices.some(index => index.size !== positions.length || positions.some(value => !index.has(value)))) {
    throw new Error("Area layout requires an aligned row for every group and position.");
  }
  for (const position of positions) {
    const points = indices.map(index => index.get(position));
    if (points.some(point => point[measure] == null)) {
      for (const point of points) { point[lower] = null; point[upper] = null; }
      continue;
    }
    const segments = layoutSeriesPartition(points.map(point => point[measure]), mode);
    const byIndex = new Map(segments.map(segment => [segment.index, segment]));
    let endpoint = mode === "center" ? segments[0]?.start ?? 0 : 0;
    points.forEach((point, index) => {
      const segment = byIndex.get(index);
      point[lower] = segment?.start ?? (mode === "diverging" ? 0 : endpoint);
      point[upper] = segment?.end ?? (mode === "diverging" ? 0 : endpoint);
      if (segment !== undefined && mode !== "diverging") endpoint = segment.end;
    });
  }
}
