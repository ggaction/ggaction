const LOWER_FIELD = "__regression_ci_lower";
const UPPER_FIELD = "__regression_ci_upper";
const COLORS = ["#4c78a8", "#f58518"];
const SHAPES = ["circle", "square"];
const DEFAULT_SIZE_RANGE = [24, 196];

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

function requireLayout({ width, height, margin, sizeRange }) {
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    throw new TypeError(
      "Regression scatterplot layout requires positive finite dimensions."
    );
  }
  if (
    margin === null ||
    typeof margin !== "object" ||
    ![margin.top, margin.right, margin.bottom, margin.left].every(
      value => Number.isFinite(value) && value >= 0
    )
  ) {
    throw new TypeError(
      "Regression scatterplot layout requires four non-negative margins."
    );
  }
  if (
    !Array.isArray(sizeRange) ||
    sizeRange.length !== 2 ||
    !sizeRange.every(value => Number.isFinite(value) && value >= 0) ||
    sizeRange[0] > sizeRange[1]
  ) {
    throw new TypeError(
      "Regression scatterplot sizeRange must be an ascending non-negative pair."
    );
  }

  const bounds = {
    x: margin.left,
    y: margin.top,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom
  };
  if (bounds.width <= 0 || bounds.height <= 0) {
    throw new Error(
      "Regression scatterplot margins must leave positive plot bounds."
    );
  }
  return bounds;
}

function niceLinearStep(span, count = 5) {
  const rough = span / Math.max(1, count);
  const power = 10 ** Math.floor(Math.log10(rough));
  const fraction = rough / power;
  const factor = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 3 ? 3
    : fraction <= 5 ? 5 : 10;
  return factor * power;
}

function niceLinearDomain(values) {
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  if (minimum === maximum) return [minimum, maximum];
  const step = niceLinearStep(maximum - minimum);
  return [
    Math.floor(minimum / step) * step,
    Math.ceil(maximum / step) * step
  ];
}

function niceLinearTicks(domain, count = 5) {
  if (domain[0] === domain[1]) return [domain[0]];
  const step = niceLinearStep(domain[1] - domain[0], count);
  const start = Math.ceil(domain[0] / step) * step;
  const stop = Math.floor(domain[1] / step) * step;
  const ticks = [];
  for (let value = start; value <= stop + step * 1e-10; value += step) {
    ticks.push(+value.toPrecision(12));
  }
  return ticks;
}

function mapValue(value, domain, range) {
  if (domain[0] === domain[1]) return (range[0] + range[1]) / 2;
  return range[0] +
    (value - domain[0]) / (domain[1] - domain[0]) * (range[1] - range[0]);
}

function pointChild(row, index, config) {
  const groupIndex = config.groupDomain.indexOf(row[config.groupField]);
  const shape = config.shapeRange[groupIndex % config.shapeRange.length];
  const fill = config.colorRange[groupIndex % config.colorRange.length];
  const centerX = mapValue(row[config.xField], config.xDomain, config.xRange);
  const centerY = mapValue(row[config.yField], config.yDomain, config.yRange);
  const area = mapValue(row[config.yField], config.sizeDomain, config.sizeRange);
  const shared = { fill, opacity: 0.27 };

  if (shape === "circle") {
    return {
      row: index,
      group: row[config.groupField],
      value: row[config.yField],
      type: "circle",
      properties: {
        x: centerX,
        y: centerY,
        radius: Math.sqrt(area / Math.PI),
        ...shared
      }
    };
  }

  const side = Math.sqrt(area);
  return {
    row: index,
    group: row[config.groupField],
    value: row[config.yField],
    type: "rect",
    properties: {
      x: centerX - side / 2,
      y: centerY - side / 2,
      width: side,
      height: side,
      ...shared,
      stroke: fill,
      strokeWidth: 0
    }
  };
}

export function createCarsRegressionScatterplotValues(
  cars,
  {
    groups = ["Japan", "USA"],
    confidence = 0.95,
    xField = "Displacement",
    yField = "Acceleration",
    groupField = "Origin",
    width = 760,
    height = 480,
    margin = { top: 40, right: 190, bottom: 70, left: 80 },
    sizeRange = DEFAULT_SIZE_RANGE
  } = {}
) {
  if (!Array.isArray(cars)) {
    throw new TypeError("Cars must be an array.");
  }
  requireOptions({ groups, confidence });
  const bounds = requireLayout({ width, height, margin, sizeRange });

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

  const xDomain = niceLinearDomain(filteredRows.map(row => row[xField]));
  const yDomain = niceLinearDomain([
    ...filteredRows.map(row => row[yField]),
    ...regressionRows.map(row => row[LOWER_FIELD]),
    ...regressionRows.map(row => row[UPPER_FIELD])
  ]);
  const sizeDomain = [
    Math.min(...filteredRows.map(row => row[yField])),
    Math.max(...filteredRows.map(row => row[yField]))
  ];
  const xRange = [bounds.x, bounds.x + bounds.width];
  const yRange = [bounds.y + bounds.height, bounds.y];
  const colorRange = groupDomain.map(
    (_, index) => COLORS[index % COLORS.length]
  );
  const shapeRange = groupDomain.map(
    (_, index) => SHAPES[index % SHAPES.length]
  );
  const pointChildren = filteredRows.map((row, index) => pointChild(row, index, {
    groupDomain,
    groupField,
    xField,
    yField,
    xDomain,
    yDomain,
    sizeDomain,
    xRange,
    yRange,
    sizeRange,
    colorRange,
    shapeRange
  }));
  const regressionLines = groupDomain.map((group, index) => {
    const rows = regressionRows.filter(row => row[groupField] === group);
    return {
      group,
      points: rows.map(row => ({
        x: mapValue(row[xField], xDomain, xRange),
        y: mapValue(row[yField], yDomain, yRange)
      })),
      stroke: colorRange[index],
      strokeWidth: 3,
      strokeDash: []
    };
  });
  const regressionBands = groupDomain.map(group => {
    const rows = regressionRows.filter(row => row[groupField] === group);
    const lower = rows.map(row => ({
      x: mapValue(row[xField], xDomain, xRange),
      y: mapValue(row[LOWER_FIELD], yDomain, yRange)
    }));
    const upper = [...rows].reverse().map(row => ({
      x: mapValue(row[xField], xDomain, xRange),
      y: mapValue(row[UPPER_FIELD], yDomain, yRange)
    }));
    return {
      group,
      points: [...lower, ...upper],
      closed: true,
      fill: "#111111",
      opacity: 0.18
    };
  });
  const xTicks = niceLinearTicks(xDomain).map(value => ({
    value,
    position: mapValue(value, xDomain, xRange),
    label: String(value)
  }));
  const yTicks = niceLinearTicks(yDomain).map(value => ({
    value,
    position: mapValue(value, yDomain, yRange),
    label: String(value)
  }));
  const originLegendX = bounds.x + bounds.width + 30;
  const originLegendItems = groupDomain.map((group, index) => {
    const y = bounds.y + 56 + index * 34;
    const area = 64;
    const shape = shapeRange[index];
    const symbol = shape === "circle"
      ? {
          type: "circle",
          properties: {
            x: originLegendX + 16,
            y,
            radius: Math.sqrt(area / Math.PI),
            fill: colorRange[index]
          }
        }
      : {
          type: "rect",
          properties: {
            x: originLegendX + 16 - Math.sqrt(area) / 2,
            y: y - Math.sqrt(area) / 2,
            width: Math.sqrt(area),
            height: Math.sqrt(area),
            fill: colorRange[index],
            stroke: colorRange[index],
            strokeWidth: 0
          }
        };
    return {
      group,
      color: colorRange[index],
      shape,
      y,
      line: { x1: originLegendX, y1: y, x2: originLegendX + 32, y2: y },
      symbol,
      label: { x: originLegendX + 44, y, text: group }
    };
  });
  const sizeLegendValues = [
    sizeDomain[0],
    (sizeDomain[0] + sizeDomain[1]) / 2,
    sizeDomain[1]
  ];
  const sizeLegendItems = sizeLegendValues.map((value, index) => {
    const area = mapValue(value, sizeDomain, sizeRange);
    const y = bounds.y + 180 + index * 48;
    return {
      value,
      symbol: {
        x: originLegendX + 16,
        y,
        radius: Math.sqrt(area / Math.PI),
        fill: "#94a3b8",
        opacity: 0.7
      },
      label: {
        x: originLegendX + 44,
        y,
        text: String(+value.toPrecision(3))
      }
    };
  });

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
    regressionRows,
    bounds,
    scales: {
      x: { domain: xDomain, range: xRange },
      y: { domain: yDomain, range: yRange },
      color: { domain: groupDomain, range: colorRange },
      size: { domain: sizeDomain, range: [...sizeRange] },
      shape: { domain: groupDomain, range: shapeRange }
    },
    pointChildren,
    regressionBands,
    regressionLines,
    grid: {
      horizontal: yTicks.map(tick => ({
        x1: bounds.x,
        y1: tick.position,
        x2: bounds.x + bounds.width,
        y2: tick.position
      }))
    },
    axes: {
      x: {
        line: {
          x1: xRange[0],
          y1: yRange[0],
          x2: xRange[1],
          y2: yRange[0]
        },
        ticks: xTicks,
        title: {
          x: bounds.x + bounds.width / 2,
          y: height - 24,
          text: xField
        }
      },
      y: {
        line: {
          x1: xRange[0],
          y1: yRange[0],
          x2: xRange[0],
          y2: yRange[1]
        },
        ticks: yTicks,
        title: {
          x: 24,
          y: bounds.y + bounds.height / 2,
          text: yField,
          rotation: -Math.PI / 2
        }
      }
    },
    legends: {
      origin: {
        title: { x: originLegendX, y: bounds.y + 18, text: groupField },
        items: originLegendItems
      },
      size: {
        title: { x: originLegendX, y: bounds.y + 146, text: yField },
        items: sizeLegendItems
      }
    }
  };
}
