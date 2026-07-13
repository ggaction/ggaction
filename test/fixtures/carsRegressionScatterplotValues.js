const LOWER_FIELD = "__regression_ci_lower";
const UPPER_FIELD = "__regression_ci_upper";

function requireOptions({ groups, confidence }) {
  if (
    !Array.isArray(groups) ||
    groups.length === 0 ||
    !groups.every(group => typeof group === "string" && group.length > 0) ||
    new Set(groups).size !== groups.length
  ) {
    throw new TypeError(
      "Regression scatterplot groups must be unique non-empty strings."
    );
  }

  if (!Number.isFinite(confidence) || confidence <= 0 || confidence >= 1) {
    throw new RangeError(
      "Regression scatterplot confidence must be between 0 and 1."
    );
  }
}

function logGamma(value) {
  const coefficients = [
    676.5203681218851,
    -1259.1392167224028,
    771.3234287776531,
    -176.6150291621406,
    12.507343278686905,
    -0.13857109526572012,
    9.984369578019572e-6,
    1.5056327351493116e-7
  ];

  if (value < 0.5) {
    return Math.log(Math.PI) -
      Math.log(Math.sin(Math.PI * value)) -
      logGamma(1 - value);
  }

  const shifted = value - 1;
  let series = 0.9999999999998099;
  for (let index = 0; index < coefficients.length; index += 1) {
    series += coefficients[index] / (shifted + index + 1);
  }
  const base = shifted + coefficients.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) +
    (shifted + 0.5) * Math.log(base) - base + Math.log(series);
}

function betaContinuedFraction(a, b, x) {
  const maxIterations = 200;
  const epsilon = 3e-14;
  const minimum = 1e-300;
  const sum = a + b;
  const aPlusOne = a + 1;
  const aMinusOne = a - 1;
  let c = 1;
  let d = 1 - sum * x / aPlusOne;
  if (Math.abs(d) < minimum) d = minimum;
  d = 1 / d;
  let result = d;

  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    const even = iteration * 2;
    let numerator = iteration * (b - iteration) * x /
      ((aMinusOne + even) * (a + even));
    d = 1 + numerator * d;
    if (Math.abs(d) < minimum) d = minimum;
    c = 1 + numerator / c;
    if (Math.abs(c) < minimum) c = minimum;
    d = 1 / d;
    result *= d * c;

    numerator = -(a + iteration) * (sum + iteration) * x /
      ((a + even) * (aPlusOne + even));
    d = 1 + numerator * d;
    if (Math.abs(d) < minimum) d = minimum;
    c = 1 + numerator / c;
    if (Math.abs(c) < minimum) c = minimum;
    d = 1 / d;
    const delta = d * c;
    result *= delta;

    if (Math.abs(delta - 1) <= epsilon) return result;
  }

  throw new Error("Student-t calculation did not converge.");
}

function regularizedIncompleteBeta(x, a, b) {
  if (x === 0 || x === 1) return x;
  const factor = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) +
    a * Math.log(x) + b * Math.log1p(-x)
  );

  if (x < (a + 1) / (a + b + 2)) {
    return factor * betaContinuedFraction(a, b, x) / a;
  }

  return 1 - factor * betaContinuedFraction(b, a, 1 - x) / b;
}

function studentTCdf(value, degreesOfFreedom) {
  if (value === 0) return 0.5;
  const x = degreesOfFreedom /
    (degreesOfFreedom + value * value);
  const tail = regularizedIncompleteBeta(
    x,
    degreesOfFreedom / 2,
    0.5
  ) / 2;
  return value > 0 ? 1 - tail : tail;
}

function studentTCritical(confidence, degreesOfFreedom) {
  const probability = (1 + confidence) / 2;
  let low = 0;
  let high = 1;

  while (studentTCdf(high, degreesOfFreedom) < probability) high *= 2;

  for (let iteration = 0; iteration < 100; iteration += 1) {
    const midpoint = (low + high) / 2;
    if (studentTCdf(midpoint, degreesOfFreedom) < probability) {
      low = midpoint;
    } else {
      high = midpoint;
    }
  }

  return (low + high) / 2;
}

function fitLinearRegression(rows, { xField, yField, groupField, confidence }) {
  const count = rows.length;
  if (count < 3) {
    throw new Error(
      `Regression group "${rows[0]?.[groupField] ?? "unknown"}" requires at least three rows.`
    );
  }

  const meanX = rows.reduce((sum, row) => sum + row[xField], 0) / count;
  const meanY = rows.reduce((sum, row) => sum + row[yField], 0) / count;
  let sxx = 0;
  let sxy = 0;
  for (const row of rows) {
    const xDifference = row[xField] - meanX;
    sxx += xDifference ** 2;
    sxy += xDifference * (row[yField] - meanY);
  }

  if (sxx === 0) {
    throw new Error(
      `Regression group "${rows[0][groupField]}" requires varying x values.`
    );
  }

  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;
  const residualSumSquares = rows.reduce((sum, row) => {
    const residual = row[yField] - (intercept + slope * row[xField]);
    return sum + residual ** 2;
  }, 0);
  const degreesOfFreedom = count - 2;
  const residualStandardError = Math.sqrt(
    residualSumSquares / degreesOfFreedom
  );
  const critical = studentTCritical(confidence, degreesOfFreedom);

  return {
    count,
    degreesOfFreedom,
    meanX,
    meanY,
    sxx,
    slope,
    intercept,
    residualSumSquares,
    residualStandardError,
    critical
  };
}

export function createCarsRegressionScatterplotValues(
  cars,
  {
    groups = ["Japan", "USA"],
    confidence = 0.95,
    xField = "Displacement",
    yField = "Acceleration",
    groupField = "Origin"
  } = {}
) {
  if (!Array.isArray(cars)) {
    throw new TypeError("Cars must be an array.");
  }
  requireOptions({ groups, confidence });

  const includedGroups = new Set(groups);
  const filteredRows = cars
    .filter(row =>
      row !== null &&
      typeof row === "object" &&
      includedGroups.has(row[groupField]) &&
      Number.isFinite(row[xField]) &&
      Number.isFinite(row[yField])
    )
    .map(row => structuredClone(row));

  if (filteredRows.length === 0) {
    throw new Error("Regression scatterplot requires at least one valid row.");
  }

  const groupDomain = [...new Set(filteredRows.map(row => row[groupField]))];
  const models = [];
  const regressionRows = [];

  for (const group of groupDomain) {
    const rows = filteredRows.filter(row => row[groupField] === group);
    const model = fitLinearRegression(rows, {
      xField,
      yField,
      groupField,
      confidence
    });
    const xValues = [...new Set(rows.map(row => row[xField]))]
      .sort((left, right) => left - right);

    models.push({ group, ...model, xValues });

    for (const x of xValues) {
      const prediction = model.intercept + model.slope * x;
      const standardError = model.residualStandardError * Math.sqrt(
        1 / model.count + (x - model.meanX) ** 2 / model.sxx
      );
      const margin = model.critical * standardError;
      regressionRows.push({
        [groupField]: group,
        [xField]: x,
        [yField]: prediction,
        [LOWER_FIELD]: prediction - margin,
        [UPPER_FIELD]: prediction + margin
      });
    }
  }

  return {
    confidence,
    fields: {
      x: xField,
      y: yField,
      group: groupField,
      lower: LOWER_FIELD,
      upper: UPPER_FIELD
    },
    filteredRows,
    groupDomain,
    models,
    regressionRows
  };
}
