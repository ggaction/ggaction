import { cloneAndFreeze } from "../core/immutable.js";
import {
  mapContinuousScaleValues,
  mapOrdinalPositionValues,
  readNominalField,
  readQuantitativeField
} from "./scales/index.js";
import {
  interpolateNumber,
  normalizedFiniteSum,
  requireFiniteResult,
  stableFiniteSum
} from "./numeric.js";

function requireArcLayer(layer) {
  if (layer?.mark?.type !== "arc") {
    throw new Error("Arc derivation requires a semantic arc mark.");
  }
  const theta = layer.encoding?.theta;
  if (
    theta === undefined ||
    !["quantitative", "nominal", "ordinal"].includes(theta.fieldType)
  ) {
    throw new Error(
      `Arc mark "${layer.id}" requires quantitative or categorical theta.`
    );
  }
  return theta;
}

function requireContinuousThetaScale(scale, label) {
  if (
    scale?.type !== "linear" ||
    !Array.isArray(scale.range) ||
    scale.range.length !== 2 ||
    !scale.range.every(Number.isFinite) ||
    scale.range[0] === scale.range[1]
  ) {
    throw new Error(`${label} requires a resolved linear scale.`);
  }
  return scale;
}

function requireBandScale(scale, label) {
  if (
    scale?.type !== "band" ||
    !Array.isArray(scale.domain) ||
    !Array.isArray(scale.range) ||
    scale.range.length !== 2 ||
    !scale.range.every(Number.isFinite) ||
    scale.range[0] === scale.range[1] ||
    !Number.isFinite(scale.bandwidth) ||
    scale.bandwidth <= 0
  ) {
    throw new Error(`${label} requires a resolved band scale.`);
  }
  return scale;
}

function colorValues(rows, encoding) {
  return encoding === undefined
    ? rows.map(() => undefined)
    : readNominalField(rows, encoding.field);
}

function readNonNegativeArcThetaValues(rows, field, layerId, role) {
  if (!Array.isArray(rows)) throw new TypeError(`Arc theta ${role}s require rows.`);
  if (typeof field !== "string" || field.length === 0) {
    throw new TypeError(`Arc theta ${role} must be a non-empty string.`);
  }
  const values = rows.map((row, index) => {
    const value = row?.[field];
    if (!Number.isFinite(value) || value < 0) {
      throw new TypeError(
        `Arc theta ${role} field "${field}" must contain non-negative finite numbers at row ${index}.`
      );
    }
    return value;
  });
  if (values.every(value => value === 0)) {
    throw new Error(`Arc mark "${layerId}" theta ${role}s must have a positive total.`);
  }
  return cloneAndFreeze(values);
}

export function readArcThetaWeights(rows, field, layerId = "arc") {
  return readNonNegativeArcThetaValues(rows, field, layerId, "weight");
}

export function readArcThetaValues(rows, field, layerId = "arc") {
  return readNonNegativeArcThetaValues(rows, field, layerId, "value");
}

function resolveProportionalRanges(values, range, labelAt) {
  const total = values.reduce((sum, value) => sum + value, 0);
  const normalizedTotal = Number.isFinite(total)
    ? undefined
    : normalizedFiniteSum(values, "Arc theta values");
  if (total === 0 || normalizedTotal?.total <= 0) {
    throw new Error("Arc theta values must have a positive total.");
  }
  const span = range[1] - range[0];
  let cursor = range[0];
  let cumulative = 0;
  let cumulativeCorrection = 0;
  return values.map((value, index) => {
    const normalizedValue = normalizedTotal === undefined
      ? value
      : value / normalizedTotal.scale;
    const next = cumulative + normalizedValue;
    if (normalizedTotal !== undefined) {
      cumulativeCorrection += Math.abs(cumulative) >= Math.abs(normalizedValue)
        ? cumulative - next + normalizedValue
        : normalizedValue - next + cumulative;
    }
    cumulative = next;
    const directEnd = cursor + value / total * span;
    const endTheta = index === values.length - 1
      ? range[1]
      : normalizedTotal === undefined && Number.isFinite(directEnd)
        ? directEnd
        : interpolateNumber(
            range[0],
            range[1],
            (cumulative + cumulativeCorrection) /
              (normalizedTotal?.total ?? total)
          );
    if (!Number.isFinite(endTheta) || endTheta === cursor) {
      throw new RangeError(
        `Arc theta ${labelAt(index)} cannot resolve a distinct finite sector.`
      );
    }
    const result = { startTheta: cursor, endTheta };
    cursor = endTheta;
    return result;
  });
}

function resolveProportionalRadii(layer, frame, innerRadiusRatio) {
  if (!Number.isFinite(frame?.availableRadius) || frame.availableRadius < 0) {
    throw new RangeError(`Arc mark "${layer.id}" requires a finite available radius.`);
  }
  return {
    innerRadius: requireFiniteResult(
      frame.availableRadius * innerRadiusRatio,
      `Arc mark "${layer.id}" inner radius`
    ),
    outerRadius: frame.availableRadius
  };
}

function proportionalSectors(rows, layer, thetaScale, frame, innerRadiusRatio) {
  const theta = layer.encoding.theta;
  if (!["count", "sum"].includes(theta.aggregate)) {
    throw new Error(`Arc mark "${layer.id}" requires count, sum, or radial layout.`);
  }
  const values = readNominalField(rows, theta.field);
  const colors = colorValues(rows, layer.encoding?.color);
  const weights = theta.aggregate === "count"
    ? rows.map(() => 1)
    : readArcThetaWeights(rows, theta.weight, layer.id);
  const groups = new Map(thetaScale.domain.map(value => [value, []]));
  for (let index = 0; index < rows.length; index += 1) {
    const group = groups.get(values[index]);
    if (group === undefined) {
      throw new Error(`Arc theta value "${values[index]}" is outside the scale domain.`);
    }
    group.push({
      color: colors[index],
      sourceIndex: index,
      weight: weights[index]
    });
  }
  const radii = resolveProportionalRadii(layer, frame, innerRadiusRatio);
  const sectors = [];
  const positiveValues = thetaScale.domain.filter(value =>
    groups.get(value).some(item => item.weight > 0)
  );
  const aggregateValues = positiveValues.map(value => stableFiniteSum(
    groups.get(value).map(item => item.weight),
    `Arc theta group "${String(value)}" aggregate`
  ));
  const ranges = resolveProportionalRanges(
    aggregateValues,
    thetaScale.range,
    index => `group "${String(positiveValues[index])}"`
  );
  for (const [positiveIndex, value] of positiveValues.entries()) {
    const group = groups.get(value);
    const aggregateValue = aggregateValues[positiveIndex];
    const { startTheta, endTheta } = ranges[positiveIndex];
    const distinctColors = [...new Set(group.map(item => item.color))];
    if (distinctColors.length > 1) {
      throw new Error(
        `Aggregated arc theta group "${value}" must resolve to one color value.`
      );
    }
    sectors.push({
      key: value,
      theta: value,
      count: group.length,
      aggregateValue,
      color: distinctColors[0],
      startTheta,
      endTheta,
      ...radii,
      sourceIndices: group.map(item => item.sourceIndex)
    });
  }
  return sectors;
}

function quantitativeSectors(rows, layer, thetaScale, frame, innerRadiusRatio) {
  const theta = layer.encoding.theta;
  if (layer.encoding?.radius !== undefined) {
    throw new Error(
      `Arc mark "${layer.id}" cannot combine quantitative theta with radius.`
    );
  }
  const values = readArcThetaValues(rows, theta.field, layer.id);
  const colors = colorValues(rows, layer.encoding?.color);
  const positiveIndices = values
    .map((value, index) => value > 0 ? index : undefined)
    .filter(index => index !== undefined);
  const positiveValues = positiveIndices.map(index => values[index]);
  const ranges = resolveProportionalRanges(
    positiveValues,
    thetaScale.range,
    index => `row ${positiveIndices[index]}`
  );
  const radii = resolveProportionalRadii(layer, frame, innerRadiusRatio);
  return positiveIndices.map((sourceIndex, index) => ({
    key: `${String(values[sourceIndex])}:${sourceIndex}`,
    theta: values[sourceIndex],
    count: 1,
    aggregateValue: values[sourceIndex],
    color: colors[sourceIndex],
    ...ranges[index],
    ...radii,
    sourceIndices: [sourceIndex]
  }));
}

export function deriveMeasuredArcValues(rows, layer) {
  const theta = requireArcLayer(layer);
  const radius = layer.encoding?.radius;
  if (!["nominal", "ordinal"].includes(theta.fieldType) || theta.aggregate !== undefined ||
    !["count", "sum"].includes(radius?.aggregate) || radius.fieldType !== "quantitative") {
    throw new Error("Measured Arc requires equal-angle categorical theta and count or sum radius.");
  }
  if (radius.aggregate === "count" && Object.hasOwn(radius, "field")) {
    throw new Error("Measured count radius does not accept a field.");
  }
  const categories = readNominalField(rows, theta.field);
  const measures = radius.aggregate === "count" ? rows.map(() => 1)
    : readQuantitativeField(rows, radius.field);
  if (measures.some(value => value < 0)) {
    throw new RangeError("Measured Arc radius inputs must be non-negative.");
  }
  const colors = colorValues(rows, layer.encoding?.color);
  const groups = new Map();
  for (const [index, category] of categories.entries()) {
    const group = groups.get(category) ?? { key: category, sourceIndices: [], values: [], colors: [] };
    group.sourceIndices.push(index);
    group.values.push(measures[index]);
    group.colors.push(colors[index]);
    groups.set(category, group);
  }
  const result = [...groups.values()].map(group => {
    const distinctColors = [...new Set(group.colors)];
    if (distinctColors.length > 1) {
      throw new Error(`Measured Arc category "${group.key}" must resolve to one color value.`);
    }
    return { key: group.key, theta: group.key, count: group.sourceIndices.length,
      radius: stableFiniteSum(group.values, "Measured Arc radius aggregate"),
      color: distinctColors[0], sourceIndices: group.sourceIndices };
  });
  if (!result.some(group => group.radius > 0)) {
    throw new Error("Measured Arc radius requires at least one positive category aggregate.");
  }
  return cloneAndFreeze(result);
}

function measuredRadialSectors(rows, layer, thetaScale, radiusScale) {
  const items = deriveMeasuredArcValues(rows, layer);
  const centers = mapOrdinalPositionValues(items.map(item => item.theta), thetaScale);
  const radii = mapContinuousScaleValues(items.map(item => item.radius), radiusScale);
  const halfBand = (Math.sign(thetaScale.step) || 1) * thetaScale.bandwidth / 2;
  const byCategory = new Map(items.map((item, index) => [item.theta, {
    ...item, startTheta: centers[index] - halfBand, endTheta: centers[index] + halfBand,
    innerRadius: radiusScale.range[0], outerRadius: radii[index]
  }]));
  return thetaScale.domain.flatMap(category => {
    const item = byCategory.get(category);
    return item === undefined || item.radius === 0 ? [] : [item];
  });
}

function radialSectors(rows, layer, thetaScale, radiusScale) {
  const theta = layer.encoding.theta;
  const radius = layer.encoding?.radius;
  if (radius?.fieldType !== "quantitative") {
    throw new Error(`Arc mark "${layer.id}" requires quantitative radius.`);
  }
  const thetaValues = readNominalField(rows, theta.field);
  const radiusValues = readQuantitativeField(rows, radius.field);
  const colors = colorValues(rows, layer.encoding?.color);
  const centers = mapOrdinalPositionValues(thetaValues, thetaScale);
  const outerRadii = mapContinuousScaleValues(radiusValues, radiusScale);
  const innerRadius = Math.min(...radiusScale.range);
  const direction = Math.sign(thetaScale.step) || 1;
  const halfBand = direction * thetaScale.bandwidth / 2;
  const grouped = new Map(thetaScale.domain.map(value => [value, []]));
  for (let index = 0; index < rows.length; index += 1) {
    if (outerRadii[index] <= innerRadius) continue;
    const group = grouped.get(thetaValues[index]);
    if (group === undefined) {
      throw new Error(
        `Arc theta value "${thetaValues[index]}" is outside the scale domain.`
      );
    }
    group.push({
      key: `${String(thetaValues[index])}:${index}`,
      theta: thetaValues[index],
      radius: radiusValues[index],
      color: colors[index],
      startTheta: centers[index] - halfBand,
      endTheta: centers[index] + halfBand,
      innerRadius,
      outerRadius: outerRadii[index],
      sourceIndices: [index]
    });
  }
  const sectors = [];
  for (const value of thetaScale.domain) {
    const group = grouped.get(value);
    group.sort((left, right) =>
      right.outerRadius - left.outerRadius ||
      left.sourceIndices[0] - right.sourceIndices[0]
    );
    sectors.push(...group);
  }
  return sectors;
}

export function deriveArcSectors(rows, layer, {
  thetaScale,
  radiusScale,
  frame,
  innerRadiusRatio = 0
} = {}) {
  if (!Array.isArray(rows)) throw new TypeError("Arc derivation requires rows.");
  const theta = requireArcLayer(layer);
  if (
    !Number.isFinite(innerRadiusRatio) ||
    innerRadiusRatio < 0 ||
    innerRadiusRatio >= 1
  ) {
    throw new RangeError("Arc innerRadius must be from 0 (inclusive) to 1 (exclusive).");
  }
  const sectors = radiusScale?.radialMapping !== undefined
    ? measuredRadialSectors(rows, layer, requireBandScale(thetaScale, `Arc mark "${layer.id}" theta`), radiusScale)
    : theta.fieldType === "quantitative"
    ? quantitativeSectors(
        rows,
        layer,
        requireContinuousThetaScale(thetaScale, `Arc mark "${layer.id}" theta`),
        frame,
        innerRadiusRatio
      )
    : ["count", "sum"].includes(theta.aggregate)
      ? proportionalSectors(
          rows,
          layer,
          requireBandScale(thetaScale, `Arc mark "${layer.id}" theta`),
          frame,
          innerRadiusRatio
        )
      : radialSectors(
          rows,
          layer,
          requireBandScale(thetaScale, `Arc mark "${layer.id}" theta`),
          radiusScale
        );
  return cloneAndFreeze({ sectors });
}
