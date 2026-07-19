import { cloneAndFreeze } from "../core/immutable.js";
import {
  readNominalField,
  readQuantitativeField
} from "./scales/index.js";
import { studentTCriticalValue } from "./statistics/studentT.js";

export const REGRESSION_LOWER_FIELD = "__regression_ci_lower";
export const REGRESSION_UPPER_FIELD = "__regression_ci_upper";

function requireField(field, label) {
  if (typeof field !== "string" || field.length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  return field;
}

export function validateRegressionTransform(transform) {
  const supported = [
    "type", "method", "x", "y", "groupBy", "confidence", "interval",
    "degree", "span"
  ];
  const unknown = Object.keys(transform).find(key => !supported.includes(key));
  if (unknown !== undefined) {
    throw new Error(`Unknown regression transform property "${unknown}".`);
  }
  if (transform.type !== "regression") {
    throw new Error(`Unsupported regression transform "${transform.type}".`);
  }
  requireField(transform.x, "Regression x field");
  requireField(transform.y, "Regression y field");
  if (transform.groupBy !== undefined) {
    requireField(transform.groupBy, "Regression groupBy field");
  }
  const normalized = normalizeRegressionParameters({
    method: transform.method,
    degree: transform.degree,
    span: transform.span,
    confidence: transform.confidence,
    interval: transform.interval
  });
  if (normalized.method === "loess") return transform;
  if (!Number.isFinite(transform.confidence)) {
    throw new RangeError("Regression confidence must be between 0 and 1.");
  }
  if (transform.interval === undefined) {
    throw new Error(`Unsupported regression interval "${transform.interval}".`);
  }
  return transform;
}

export function studentTCritical(confidence, degreesOfFreedom) {
  if (!Number.isFinite(confidence) || confidence <= 0 || confidence >= 1) {
    throw new RangeError("Regression confidence must be between 0 and 1.");
  }
  if (!Number.isInteger(degreesOfFreedom) || degreesOfFreedom <= 0) {
    throw new RangeError("Student-t degrees of freedom must be positive.");
  }
  return studentTCriticalValue(confidence, degreesOfFreedom);
}

export function normalizeRegressionParameters({
  method = "linear",
  degree,
  span,
  confidence,
  interval
} = {}) {
  if (!["linear", "polynomial", "loess"].includes(method)) {
    throw new Error(`Unsupported regression method "${method}".`);
  }
  if (method === "loess") {
    if (degree !== undefined) {
      throw new Error("Regression degree requires the polynomial method.");
    }
    if (confidence !== undefined || interval !== undefined) {
      throw new Error("LOESS regression does not support confidence intervals.");
    }
    const resolvedSpan = span ?? 0.75;
    if (!Number.isFinite(resolvedSpan) || resolvedSpan <= 0 || resolvedSpan > 1) {
      throw new RangeError(
        "Regression LOESS span must be greater than zero and at most one."
      );
    }
    return cloneAndFreeze({ method, span: resolvedSpan });
  }
  if (span !== undefined) {
    throw new Error("Regression span requires the loess method.");
  }
  const resolvedConfidence = confidence ?? 0.95;
  if (
    !Number.isFinite(resolvedConfidence) ||
    resolvedConfidence <= 0 ||
    resolvedConfidence >= 1
  ) {
    throw new RangeError("Regression confidence must be between 0 and 1.");
  }
  const resolvedInterval = interval ?? "mean";
  if (!["mean", "prediction"].includes(resolvedInterval)) {
    throw new Error(`Unsupported regression interval "${resolvedInterval}".`);
  }
  if (method === "polynomial") {
    const resolvedDegree = degree ?? 2;
    if (!Number.isInteger(resolvedDegree) || resolvedDegree < 1) {
      throw new RangeError(
        "Regression polynomial degree must be a positive integer."
      );
    }
    return cloneAndFreeze({
      method,
      degree: resolvedDegree,
      confidence: resolvedConfidence,
      interval: resolvedInterval
    });
  }
  if (degree !== undefined) {
    throw new Error("Regression degree requires the polynomial method.");
  }
  return cloneAndFreeze({
    method,
    confidence: resolvedConfidence,
    interval: resolvedInterval
  });
}

function fitLinearGroup(rows, { x, y, group, confidence }) {
  const count = rows.length;
  const groupLabel = group === undefined ? "all" : String(group);
  if (count < 3) {
    throw new Error(
      `Regression group "${groupLabel}" requires at least three rows.`
    );
  }
  const meanX = rows.reduce((sum, row) => sum + row[x], 0) / count;
  const meanY = rows.reduce((sum, row) => sum + row[y], 0) / count;
  let sxx = 0;
  let sxy = 0;
  for (const row of rows) {
    const xDifference = row[x] - meanX;
    sxx += xDifference ** 2;
    sxy += xDifference * (row[y] - meanY);
  }
  if (sxx === 0) {
    throw new Error(
      `Regression group "${groupLabel}" requires varying x values.`
    );
  }
  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;
  const residualSumSquares = rows.reduce((sum, row) => {
    const residual = row[y] - (intercept + slope * row[x]);
    return sum + residual ** 2;
  }, 0);
  const degreesOfFreedom = count - 2;
  return {
    count,
    degreesOfFreedom,
    meanX,
    meanY,
    sxx,
    slope,
    intercept,
    residualSumSquares,
    residualStandardError: Math.sqrt(residualSumSquares / degreesOfFreedom),
    critical: studentTCritical(confidence, degreesOfFreedom)
  };
}

function solveLinearSystem(matrix, vector) {
  const size = matrix.length;
  const augmented = matrix.map((row, index) => [...row, vector[index]]);
  for (let column = 0; column < size; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < size; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) {
        pivot = row;
      }
    }
    if (Math.abs(augmented[pivot][column]) < 1e-12) {
      throw new Error("Polynomial regression design is singular.");
    }
    [augmented[column], augmented[pivot]] = [
      augmented[pivot], augmented[column]
    ];
    const divisor = augmented[column][column];
    for (let index = column; index <= size; index += 1) {
      augmented[column][index] /= divisor;
    }
    for (let row = 0; row < size; row += 1) {
      if (row === column) continue;
      const factor = augmented[row][column];
      for (let index = column; index <= size; index += 1) {
        augmented[row][index] -= factor * augmented[column][index];
      }
    }
  }
  return augmented.map(row => row[size]);
}

function invertSymmetricMatrix(matrix) {
  return matrix.map((_, column) => solveLinearSystem(
    matrix,
    matrix.map((__, row) => row === column ? 1 : 0)
  ));
}

function dot(left, right) {
  return left.reduce((sum, value, index) => sum + value * right[index], 0);
}

function binomial(n, k) {
  let result = 1;
  for (let index = 1; index <= k; index += 1) {
    result *= (n - index + 1) / index;
  }
  return result;
}

function rawPolynomialCoefficients(coefficients, center, scale) {
  return coefficients.map((_, degree) => coefficients.reduce(
    (sum, coefficient, power) => power < degree
      ? sum
      : sum + coefficient * binomial(power, degree) *
        (-center) ** (power - degree) / scale ** power,
    0
  ));
}

function fitPolynomialGroup(rows, { x, y, group, confidence, degree }) {
  const count = rows.length;
  const parameterCount = degree + 1;
  const groupLabel = group === undefined ? "all" : String(group);
  if (
    count < degree + 2 ||
    new Set(rows.map(row => row[x])).size < parameterCount
  ) {
    throw new Error(
      `Polynomial regression group "${groupLabel}" requires at least ` +
      `${degree + 2} rows and ${parameterCount} distinct x values.`
    );
  }
  const center = rows.reduce((sum, row) => sum + row[x], 0) / count;
  const scale = Math.max(...rows.map(row => Math.abs(row[x] - center)));
  if (!(scale > 0)) {
    throw new Error(
      `Regression group "${groupLabel}" requires varying x values.`
    );
  }
  const design = rows.map(row => {
    const normalized = (row[x] - center) / scale;
    return Array.from(
      { length: parameterCount },
      (_, power) => normalized ** power
    );
  });
  const normal = Array.from({ length: parameterCount }, (_, row) =>
    Array.from({ length: parameterCount }, (_, column) =>
      design.reduce(
        (sum, basis) => sum + basis[row] * basis[column],
        0
      )
    )
  );
  const response = Array.from({ length: parameterCount }, (_, column) =>
    design.reduce(
      (sum, basis, index) => sum + basis[column] * rows[index][y],
      0
    )
  );
  const normalizedCoefficients = solveLinearSystem(normal, response);
  const inverse = invertSymmetricMatrix(normal);
  const fitted = design.map(basis => dot(basis, normalizedCoefficients));
  const residualSumSquares = fitted.reduce(
    (sum, value, index) => sum + (rows[index][y] - value) ** 2,
    0
  );
  const degreesOfFreedom = count - parameterCount;
  const residualVariance = residualSumSquares / degreesOfFreedom;
  return {
    count,
    degreesOfFreedom,
    degree,
    coefficients: rawPolynomialCoefficients(
      normalizedCoefficients,
      center,
      scale
    ),
    normalizedCoefficients,
    center,
    scale,
    inverse,
    residualSumSquares,
    residualStandardError: Math.sqrt(residualVariance),
    critical: studentTCritical(confidence, degreesOfFreedom)
  };
}

function evaluatePolynomial(model, xValue) {
  const normalized = (xValue - model.center) / model.scale;
  const basis = model.normalizedCoefficients.map(
    (_, power) => normalized ** power
  );
  return {
    prediction: dot(basis, model.normalizedCoefficients),
    leverage: dot(basis, model.inverse.map(row => dot(row, basis)))
  };
}

function fitLoessGroup(rows, { x, y, group, span }) {
  const groupLabel = group === undefined ? "all" : String(group);
  if (rows.length < 2 || new Set(rows.map(row => row[x])).size < 2) {
    throw new Error(
      `LOESS regression group "${groupLabel}" requires at least two rows ` +
      "and varying x values."
    );
  }
  const neighborCount = Math.max(2, Math.ceil(span * rows.length));
  const xValues = [...new Set(rows.map(row => row[x]))]
    .sort((left, right) => left - right);
  const fits = xValues.map(xValue => {
    const neighbors = rows
      .map((row, index) => ({
        row,
        index,
        distance: Math.abs(row[x] - xValue)
      }))
      .sort((left, right) =>
        left.distance - right.distance || left.index - right.index
      )
      .slice(0, neighborCount);
    const radius = neighbors.at(-1).distance;
    const weighted = neighbors.map(neighbor => ({
      ...neighbor,
      weight: radius === 0
        ? 1
        : (1 - (neighbor.distance / radius) ** 3) ** 3
    }));
    const totalWeight = weighted.reduce(
      (sum, item) => sum + item.weight,
      0
    );
    const meanDifference = weighted.reduce(
      (sum, item) => sum + item.weight * (item.row[x] - xValue),
      0
    ) / totalWeight;
    const meanY = weighted.reduce(
      (sum, item) => sum + item.weight * item.row[y],
      0
    ) / totalWeight;
    let variance = 0;
    let covariance = 0;
    for (const item of weighted) {
      const difference = item.row[x] - xValue - meanDifference;
      variance += item.weight * difference ** 2;
      covariance += item.weight * difference * (item.row[y] - meanY);
    }
    const slope = variance === 0 ? 0 : covariance / variance;
    return {
      x: xValue,
      prediction: meanY - slope * meanDifference,
      neighborIndices: weighted.map(item => item.index)
    };
  });
  return { count: rows.length, span, neighborCount, fits };
}

export function deriveRegression(values, {
  x,
  y,
  groupBy,
  method,
  degree,
  span,
  confidence,
  interval
} = {}) {
  if (!Array.isArray(values)) {
    throw new TypeError("Regression values must be an array.");
  }
  requireField(x, "Regression x field");
  requireField(y, "Regression y field");
  if (groupBy !== undefined) requireField(groupBy, "Regression groupBy field");
  const parameters = normalizeRegressionParameters({
    method,
    degree,
    span,
    confidence,
    interval
  });
  readQuantitativeField(values, x);
  readQuantitativeField(values, y);
  if (groupBy !== undefined) readNominalField(values, groupBy);

  const groups = groupBy === undefined
    ? [undefined]
    : [...new Set(values.map(row => row[groupBy]))];
  const models = [];
  const rows = [];

  for (const group of groups) {
    const groupRows = groupBy === undefined
      ? values
      : values.filter(row => row[groupBy] === group);
    const model = parameters.method === "linear"
      ? fitLinearGroup(groupRows, {
          x,
          y,
          group,
          confidence: parameters.confidence
        })
      : parameters.method === "polynomial"
        ? fitPolynomialGroup(groupRows, {
            x,
            y,
            group,
            confidence: parameters.confidence,
            degree: parameters.degree
          })
        : fitLoessGroup(groupRows, {
            x,
            y,
            group,
            span: parameters.span
          });
    const xValues = [...new Set(groupRows.map(row => row[x]))]
      .sort((left, right) => left - right);
    models.push({ ...(groupBy === undefined ? {} : { group }), ...model, xValues });

    for (const xValue of xValues) {
      const polynomial = parameters.method === "polynomial"
        ? evaluatePolynomial(model, xValue)
        : undefined;
      const prediction = parameters.method === "linear"
        ? model.intercept + model.slope * xValue
        : parameters.method === "polynomial"
          ? polynomial.prediction
          : model.fits.find(fit => fit.x === xValue).prediction;
      const leverage = parameters.method === "linear"
        ? 1 / model.count + (xValue - model.meanX) ** 2 / model.sxx
        : parameters.method === "polynomial"
          ? polynomial.leverage
          : undefined;
      const standardError = parameters.method === "loess"
        ? undefined
        : model.residualStandardError * Math.sqrt(
            leverage + (parameters.interval === "prediction" ? 1 : 0)
          );
      const margin = parameters.method === "loess"
        ? undefined
        : model.critical * standardError;
      rows.push({
        ...(groupBy === undefined ? {} : { [groupBy]: group }),
        [x]: xValue,
        [y]: prediction,
        ...(parameters.method === "loess" ? {} : {
          [REGRESSION_LOWER_FIELD]: prediction - margin,
          [REGRESSION_UPPER_FIELD]: prediction + margin
        })
      });
    }
  }

  return cloneAndFreeze({
    fields: {
      x,
      y,
      ...(groupBy === undefined ? {} : { group: groupBy }),
      ...(parameters.method === "loess" ? {} : {
        lower: REGRESSION_LOWER_FIELD,
        upper: REGRESSION_UPPER_FIELD
      })
    },
    parameters,
    groups,
    models,
    values: rows
  });
}

export function deriveLinearRegression(values, options = {}) {
  return deriveRegression(values, { ...options, method: "linear" });
}
