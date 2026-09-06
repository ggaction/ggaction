import { confidenceCriticalValue } from
  "../statistics/confidenceInterval.js";
import {
  maximumMagnitude,
  requireFiniteResult,
  restoreFiniteScale,
  stableFiniteMean,
  stableFiniteSquareSum
} from "../numeric.js";

function restoreFiniteRatio(value, numeratorScale, denominatorScale, label) {
  if (value === 0) return 0;
  return requireFiniteResult(
    Math.sign(value) * Math.exp(
      Math.log(Math.abs(value)) +
      Math.log(numeratorScale) -
      Math.log(denominatorScale)
    ),
    label
  );
}

function normalizedOffset(value, center, scale, byDifference = true) {
  return byDifference
    ? (value - center) / scale
    : value / scale - center / scale;
}

function normalizedCoordinates(values, center) {
  const differences = values.map(value => value - center);
  const byDifference = differences.every(Number.isFinite);
  const scale = byDifference
    ? maximumMagnitude(differences)
    : Math.max(maximumMagnitude(values), Math.abs(center));
  return [
    values.map(value => normalizedOffset(value, center, scale, byDifference)),
    scale,
    byDifference
  ];
}

function normalizedLinearX(model, value) {
  return normalizedOffset(
    value, model.meanX, model.xScale, model.normalizedXByDifference !== false
  );
}

function linearPrediction(model, xValue) {
  if (model.normalizedSxx === undefined) {
    return model.intercept + model.slope * xValue;
  }
  return restoreFiniteScale(
    model.normalizedMeanY +
      model.normalizedResponseSlope * normalizedLinearX(model, xValue),
    model.responseScale,
    "Linear regression prediction"
  );
}

function fitLinearGroup(rows, {
  x, y, group, confidenceMethod, level
}) {
  const count = rows.length;
  const groupLabel = group === undefined ? "all" : String(group);
  const label = `Regression group "${groupLabel}"`;
  if (count < 3) {
    throw new Error(
      `${label} requires at least three rows.`
    );
  }
  const xValues = rows.map(row => row[x]);
  const yValues = rows.map(row => row[y]);
  const ordinaryYTotal = yValues.reduce((sum, value) => sum + value, 0);
  const meanX = stableFiniteMean(xValues, "Linear regression x mean");
  const meanY = stableFiniteMean(yValues, "Linear regression y mean");
  let sxx = 0;
  let sxy = 0;
  for (const row of rows) {
    const xDifference = row[x] - meanX;
    sxx += xDifference ** 2;
    sxy += xDifference * (row[y] - meanY);
  }
  if (sxx === 0) {
    throw new Error(
      `${label} requires varying x values.`
    );
  }
  const stableLinear = !Number.isFinite(ordinaryYTotal) ||
    !Number.isFinite(sxx) || !Number.isFinite(sxy);
  let normalizedXByDifference = true;
  let xScale;
  let responseScale;
  let normalizedMeanY;
  let normalizedResponseSlope;
  let normalizedSxx;
  if (stableLinear) {
    let normalizedX;
    [normalizedX, xScale, normalizedXByDifference] =
      normalizedCoordinates(xValues, meanX);
    xScale ||= 1;
    responseScale = maximumMagnitude(yValues) || 1;
    normalizedMeanY = meanY / responseScale;
    normalizedSxx = normalizedX.reduce(
      (sum, value) => sum + value ** 2,
      0
    );
    if (normalizedSxx === 0) {
      throw new Error(`${label} requires varying x values.`);
    }
    normalizedResponseSlope = rows.reduce(
      (sum, row, index) => sum + normalizedX[index] * (
        row[y] / responseScale - normalizedMeanY
      ),
      0
    ) / normalizedSxx;
  }
  const slope = stableLinear
    ? restoreFiniteRatio(
        normalizedResponseSlope, responseScale, xScale, `${label} slope`
      )
    : requireFiniteResult(sxy / sxx, `${label} slope`);
  let intercept = meanY - slope * meanX;
  if (!Number.isFinite(intercept) && stableLinear) {
    intercept = restoreFiniteScale(
      normalizedMeanY + normalizedResponseSlope * normalizedOffset(
        0, meanX, xScale, normalizedXByDifference
      ),
      responseScale,
      `${label} intercept`
    );
  }
  requireFiniteResult(intercept, `${label} intercept`);
  const degreesOfFreedom = count - 2;
  const model = {
    count,
    degreesOfFreedom,
    meanX,
    meanY,
    slope,
    intercept
  };
  if (Number.isFinite(sxx)) model.sxx = sxx;
  if (stableLinear) Object.assign(model, {
    xScale,
    responseScale,
    normalizedMeanY,
    normalizedResponseSlope,
    normalizedSxx
  });
  if (!normalizedXByDifference) model.normalizedXByDifference = false;
  const residualSumSquares = stableFiniteSquareSum(
    rows.map(row => row[y] - linearPrediction(model, row[x])),
    `${label} residual sum of squares`
  );
  return Object.assign(model, {
    residualSumSquares,
    residualStandardError: Math.sqrt(residualSumSquares / degreesOfFreedom),
    critical: confidenceCriticalValue({
      method: confidenceMethod,
      level,
      degreesOfFreedom
    })
  });
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
  return coefficients.map((_, degree) => {
    const sum = stable => coefficients.reduce(
      (total, coefficient, power) => power < degree
        ? total
        : total + coefficient * binomial(power, degree) *
          (stable ? -center / scale : -center) ** (power - degree) /
          scale ** (stable ? degree : power),
      0
    );
    const direct = sum(false);
    return requireFiniteResult(Number.isFinite(direct) ? direct :
      sum(true), `Polynomial regression coefficient ${degree}`);
  });
}

function polynomialResponse(design, values, size, scale = 1) {
  return Array.from({ length: size }, (_, column) => design.reduce(
    (sum, basis, index) =>
      sum + basis[column] * (values[index] / scale),
    0
  ));
}

function fitPolynomialGroup(rows, {
  x, y, group, confidenceMethod, level, degree
}) {
  const count = rows.length;
  const parameterCount = degree + 1;
  const groupLabel = group === undefined ? "all" : String(group);
  const label = `Polynomial regression group "${groupLabel}"`;
  if (
    count < degree + 2 ||
    new Set(rows.map(row => row[x])).size < parameterCount
  ) {
    throw new Error(
      `${label} requires at least ` +
      `${degree + 2} rows and ${parameterCount} distinct x values.`
    );
  }
  const xValues = rows.map(row => row[x]);
  const yValues = rows.map(row => row[y]);
  const center = stableFiniteMean(xValues, "Polynomial regression x center");
  const [normalizedX, scale, normalizedXByDifference] =
    normalizedCoordinates(xValues, center);
  if (!(scale > 0) || !Number.isFinite(scale)) {
    throw new Error(
      `Regression group "${groupLabel}" requires finite varying x values.`
    );
  }
  const design = normalizedX.map(normalized => Array.from(
      { length: parameterCount },
      (_, power) => normalized ** power
    ));
  const normal = Array.from({ length: parameterCount }, (_, row) =>
    Array.from({ length: parameterCount }, (_, column) =>
      design.reduce(
        (sum, basis) => sum + basis[row] * basis[column],
        0
      )
    )
  );
  const response = polynomialResponse(design, yValues, parameterCount);
  const stableResponse = response.some(value => !Number.isFinite(value));
  const responseScale = stableResponse ? maximumMagnitude(yValues) || 1 : undefined;
  const resolvedResponse = stableResponse
    ? polynomialResponse(design, yValues, parameterCount, responseScale)
    : response;
  const scaledCoefficients = solveLinearSystem(normal, resolvedResponse);
  const normalizedCoefficients = stableResponse
    ? scaledCoefficients.map((coefficient, index) => restoreFiniteScale(
        coefficient,
        responseScale,
        `${label} coefficient ${index}`
      ))
    : scaledCoefficients;
  const inverse = invertSymmetricMatrix(normal);
  const fitted = design.map(basis => stableResponse
    ? restoreFiniteScale(
        dot(basis, scaledCoefficients),
        responseScale,
        `${label} prediction`
      )
    : dot(basis, normalizedCoefficients)
  );
  const residualSumSquares = stableFiniteSquareSum(
    fitted.map((value, index) => rows[index][y] - value),
    `${label} residual sum of squares`
  );
  const degreesOfFreedom = count - parameterCount;
  const residualVariance = residualSumSquares / degreesOfFreedom;
  const model = {
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
    critical: confidenceCriticalValue({
      method: confidenceMethod,
      level,
      degreesOfFreedom
    })
  };
  if (!normalizedXByDifference) model.normalizedXByDifference = false;
  if (stableResponse) Object.assign(model, { responseScale, scaledCoefficients });
  return model;
}

function evaluatePolynomial(model, xValue) {
  const normalized = normalizedOffset(
    xValue, model.center, model.scale, model.normalizedXByDifference !== false
  );
  const basis = model.normalizedCoefficients.map(
    (_, power) => normalized ** power
  );
  return {
    prediction: model.responseScale === undefined
      ? dot(basis, model.normalizedCoefficients)
      : restoreFiniteScale(
          dot(basis, model.scaledCoefficients),
          model.responseScale,
          "Polynomial regression prediction"
        ),
    leverage: dot(basis, model.inverse.map(row => dot(row, basis)))
  };
}

function weightedPrediction(items, x, y, xValue, xScale = 1, yScale = 1) {
  const difference = item => item.row[x] / xScale - xValue / xScale;
  let totalWeight = 0;
  let meanDifference = 0;
  let meanY = 0;
  for (const item of items) {
    totalWeight += item.weight;
    meanDifference += item.weight * difference(item);
    meanY += item.weight * item.row[y] / yScale;
  }
  meanDifference /= totalWeight;
  meanY /= totalWeight;
  let variance = 0;
  let covariance = 0;
  for (const item of items) {
    const centered = difference(item) - meanDifference;
    variance += item.weight * centered ** 2;
    covariance += item.weight * centered * (item.row[y] / yScale - meanY);
  }
  return meanY - (variance === 0 ? 0 : covariance / variance) * meanDifference;
}

function fitLoessGroup(rows, { x, y, group, span }) {
  const groupLabel = group === undefined ? "all" : String(group);
  const label = `LOESS regression group "${groupLabel}"`;
  if (rows.length < 2 || new Set(rows.map(row => row[x])).size < 2) {
    throw new Error(
      `${label} requires at least two rows ` +
      "and varying x values."
    );
  }
  const neighborCount = Math.max(2, Math.ceil(span * rows.length));
  const xValues = [...new Set(rows.map(row => row[x]))]
    .sort((left, right) => left - right);
  const xScale = maximumMagnitude(rows.map(row => row[x])) || 1;
  const yScale = maximumMagnitude(rows.map(row => row[y])) || 1;
  const fits = xValues.map(xValue => {
    const rawDistances = rows.map(row => Math.abs(row[x] - xValue));
    const scaledDistances = rawDistances.some(value => !Number.isFinite(value));
    const neighbors = rows
      .map((row, index) => ({
        row,
        index,
        distance: scaledDistances
          ? Math.abs(row[x] / xScale - xValue / xScale)
          : rawDistances[index]
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
    const ordinary = weightedPrediction(weighted, x, y, xValue);
    return {
      x: xValue,
      prediction: Number.isFinite(ordinary)
        ? ordinary
        : restoreFiniteScale(
            weightedPrediction(weighted, x, y, xValue, xScale, yScale),
            yScale,
            `${label} prediction`
          ),
      neighborIndices: weighted.map(item => item.index)
    };
  });
  return { count: rows.length, span, neighborCount, fits };
}

export function fitRegressionGroup(rows, { x, y, group, parameters }) {
  if (parameters.method === "linear") {
    return fitLinearGroup(rows, {
      x,
      y,
      group,
      confidenceMethod: parameters.confidenceMethod,
      level: parameters.level
    });
  }
  if (parameters.method === "polynomial") {
    return fitPolynomialGroup(rows, {
      x,
      y,
      group,
      confidenceMethod: parameters.confidenceMethod,
      level: parameters.level,
      degree: parameters.degree
    });
  }
  return fitLoessGroup(rows, { x, y, group, span: parameters.span });
}

export function predictRegressionAt(model, xValue, parameters) {
  const polynomial = parameters.method === "polynomial"
    ? evaluatePolynomial(model, xValue)
    : undefined;
  const prediction = parameters.method === "linear"
    ? linearPrediction(model, xValue)
    : parameters.method === "polynomial"
      ? polynomial.prediction
      : model.fits.find(fit => fit.x === xValue).prediction;
  if (parameters.method === "loess") return { prediction };
  const leverage = parameters.method === "linear"
    ? model.normalizedSxx !== undefined
      ? 1 / model.count + (
          normalizedLinearX(model, xValue)
        ) ** 2 / model.normalizedSxx
      : 1 / model.count + (xValue - model.meanX) ** 2 / model.sxx
    : polynomial.leverage;
  const standardError = model.residualStandardError * Math.sqrt(
    leverage + (parameters.interval === "prediction" ? 1 : 0)
  );
  return {
    prediction: requireFiniteResult(prediction, "Regression prediction"),
    margin: requireFiniteResult(
      model.critical * standardError,
      "Regression interval margin"
    )
  };
}
