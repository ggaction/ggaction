import { cloneAndFreeze } from "../core/immutable.js";
import {
  mapContinuousScaleValues,
  mapOrdinalPositionValues,
  readNominalField,
  readQuantitativeField
} from "./scales/index.js";

function requireArcLayer(layer) {
  if (layer?.mark?.type !== "arc") {
    throw new Error("Arc derivation requires a semantic arc mark.");
  }
  const theta = layer.encoding?.theta;
  if (theta === undefined || !["nominal", "ordinal"].includes(theta.fieldType)) {
    throw new Error(`Arc mark "${layer.id}" requires categorical theta.`);
  }
  return theta;
}

function requireBandScale(scale, label) {
  if (
    scale?.type !== "band" ||
    !Array.isArray(scale.domain) ||
    !Array.isArray(scale.range) ||
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

export function readArcThetaWeights(rows, field, layerId = "arc") {
  if (!Array.isArray(rows)) throw new TypeError("Arc theta weights require rows.");
  if (typeof field !== "string" || field.length === 0) {
    throw new TypeError("Arc theta weight must be a non-empty string.");
  }
  const weights = rows.map((row, index) => {
    const value = row?.[field];
    if (!Number.isFinite(value) || value < 0) {
      throw new TypeError(
        `Arc theta weight field "${field}" must contain non-negative finite numbers at row ${index}.`
      );
    }
    return value;
  });
  if (weights.every(value => value === 0)) {
    throw new Error(`Arc mark "${layerId}" theta weights must have a positive total.`);
  }
  return cloneAndFreeze(weights);
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
      row: rows[index],
      color: colors[index],
      sourceIndex: index,
      weight: weights[index]
    });
  }
  const total = [...groups.values()].reduce(
    (sum, group) => sum + group.reduce((groupSum, item) => groupSum + item.weight, 0),
    0
  );
  if (total === 0) throw new Error(`Arc mark "${layer.id}" has no positive theta weight.`);
  const start = thetaScale.range[0];
  const span = thetaScale.range[1] - thetaScale.range[0];
  const innerRadius = frame.availableRadius * innerRadiusRatio;
  let cursor = start;
  const sectors = [];
  const positiveValues = thetaScale.domain.filter(value =>
    groups.get(value).some(item => item.weight > 0)
  );
  for (const [positiveIndex, value] of positiveValues.entries()) {
    const group = groups.get(value);
    const aggregateValue = group.reduce((sum, item) => sum + item.weight, 0);
    const endTheta = positiveIndex === positiveValues.length - 1
      ? thetaScale.range[1]
      : cursor + aggregateValue / total * span;
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
      startTheta: cursor,
      endTheta,
      innerRadius,
      outerRadius: frame.availableRadius,
      sourceIndices: group.map(item => item.sourceIndex)
    });
    cursor = endTheta;
  }
  return sectors;
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
  requireBandScale(thetaScale, `Arc mark "${layer.id}" theta`);
  if (
    !Number.isFinite(innerRadiusRatio) ||
    innerRadiusRatio < 0 ||
    innerRadiusRatio >= 1
  ) {
    throw new RangeError("Arc innerRadius must be from 0 (inclusive) to 1 (exclusive).");
  }
  const sectors = ["count", "sum"].includes(theta.aggregate)
    ? proportionalSectors(rows, layer, thetaScale, frame, innerRadiusRatio)
    : radialSectors(rows, layer, thetaScale, radiusScale);
  return cloneAndFreeze({ sectors });
}
