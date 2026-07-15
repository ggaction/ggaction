const LOWER_FIELD = "__regression_ci_lower";
const UPPER_FIELD = "__regression_ci_upper";
const COLORS = ["#4c78a8", "#f58518", "#e45756"];
const SHAPES = ["circle", "square", "diamond"];
const DEFAULT_SIZE_RANGE = [24, 196];
const DEFAULT_SIZE_LEGEND_COUNT = 5;

function comparable(value, operand) {
  return (
    Number.isFinite(value) && Number.isFinite(operand)
  ) || (
    typeof value === "string" && typeof operand === "string"
  );
}

function matchesFilter(value, filter) {
  if (filter.oneOf !== undefined) return filter.oneOf.includes(value);
  if (filter.predicate !== undefined) {
    const { op, value: operand } = filter.predicate;
    if (op === "eq") return value === operand;
    if (op === "neq") return value !== operand;
    if (!comparable(value, operand)) return false;
    if (op === "lt") return value < operand;
    if (op === "lte") return value <= operand;
    if (op === "gt") return value > operand;
    if (op === "gte") return value >= operand;
    throw new Error(`Unsupported reference filter operator "${op}".`);
  }
  const { min, max, inclusive = true } = filter.range;
  if (!comparable(value, min) || !comparable(value, max)) return false;
  return inclusive
    ? value >= min && value <= max
    : value > min && value < max;
}

function validateReferenceFilter(filter) {
  if (filter === null || typeof filter !== "object" || Array.isArray(filter)) {
    throw new TypeError("Reference filter must be an object.");
  }
  if (typeof filter.field !== "string" || filter.field.length === 0) {
    throw new TypeError("Reference filter field must be a non-empty string.");
  }
  const modes = ["oneOf", "predicate", "range"].filter(
    mode => Object.hasOwn(filter, mode)
  );
  if (modes.length !== 1) {
    throw new Error("Reference filter requires exactly one filter mode.");
  }
  if (
    modes[0] === "oneOf" &&
    (!Array.isArray(filter.oneOf) || filter.oneOf.length === 0)
  ) {
    throw new TypeError("Reference filter oneOf must be a non-empty array.");
  }
  if (modes[0] === "predicate") {
    const predicate = filter.predicate;
    if (
      predicate === null ||
      typeof predicate !== "object" ||
      Array.isArray(predicate) ||
      !["eq", "neq", "lt", "lte", "gt", "gte"].includes(predicate.op)
    ) {
      throw new TypeError("Reference filter predicate is invalid.");
    }
    if (
      !["eq", "neq"].includes(predicate.op) &&
      typeof predicate.value !== "string" &&
      !Number.isFinite(predicate.value)
    ) {
      throw new TypeError("Reference ordered filter value is invalid.");
    }
  }
  if (modes[0] === "range") {
    const range = filter.range;
    if (
      range === null ||
      typeof range !== "object" ||
      Array.isArray(range) ||
      (typeof range.min !== "string" && !Number.isFinite(range.min)) ||
      typeof range.min !== typeof range.max ||
      range.min > range.max ||
      (range.inclusive !== undefined && typeof range.inclusive !== "boolean")
    ) {
      throw new TypeError("Reference filter range is invalid.");
    }
  }
}

export function selectRegressionFilterRows(rows, filter) {
  if (!Array.isArray(rows)) {
    throw new TypeError("Cars must be an array.");
  }
  validateReferenceFilter(filter);
  return rows
    .filter(row =>
      row !== null &&
      typeof row === "object" &&
      matchesFilter(row[filter.field], filter)
    )
    .map(row => structuredClone(row));
}

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

  if (shape === "diamond") {
    const radius = Math.sqrt(area / 2);
    return {
      row: index,
      group: row[config.groupField],
      value: row[config.yField],
      type: "path",
      properties: {
        commands: [
          { op: "M", x: centerX, y: centerY - radius },
          { op: "L", x: centerX + radius, y: centerY },
          { op: "L", x: centerX, y: centerY + radius },
          { op: "L", x: centerX - radius, y: centerY },
          { op: "Z" }
        ],
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
    filter,
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

  const resolvedFilter = filter ?? {
    field: groupField,
    oneOf: groups
  };
  const filteredRows = selectRegressionFilterRows(cars, resolvedFilter)
    .filter(row =>
      typeof row[groupField] === "string" &&
      Number.isFinite(row[xField]) &&
      Number.isFinite(row[yField])
    );

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
    const y = bounds.y + 52 + index * 28;
    const radius = Math.sqrt(64 / Math.PI);
    const side = radius * Math.sqrt(Math.PI);
    const shape = shapeRange[index];
    let symbol;
    if (shape === "circle") {
      symbol = {
          type: "circle",
          properties: {
            x: originLegendX + 16,
            y,
            radius,
            fill: colorRange[index],
            stroke: "white",
            strokeWidth: 0
          }
        };
    } else if (shape === "diamond") {
      const diamondRadius = Math.sqrt(64 / 2);
      symbol = {
        type: "path",
        properties: {
          commands: [
            { op: "M", x: originLegendX + 16, y: y - diamondRadius },
            { op: "L", x: originLegendX + 16 + diamondRadius, y },
            { op: "L", x: originLegendX + 16, y: y + diamondRadius },
            { op: "L", x: originLegendX + 16 - diamondRadius, y },
            { op: "Z" }
          ],
          fill: colorRange[index]
        }
      };
    } else {
      symbol = {
          type: "rect",
          properties: {
            x: originLegendX + 16 - side / 2,
            y: y - side / 2,
            width: side,
            height: side,
            fill: colorRange[index],
            stroke: "white",
            strokeWidth: 0
          }
        };
    }
    return {
      group,
      color: colorRange[index],
      shape,
      y,
      line: {
        x1: originLegendX,
        y1: y,
        x2: originLegendX + 32,
        y2: y,
        strokeDash: []
      },
      symbol,
      label: { x: originLegendX + 42, y, text: group }
    };
  });
  const sizeLegendValues = Array.from(
    { length: DEFAULT_SIZE_LEGEND_COUNT },
    (_, index) => sizeDomain[0] +
      index / (DEFAULT_SIZE_LEGEND_COUNT - 1) *
      (sizeDomain[1] - sizeDomain[0])
  );
  const sizeLegendItems = sizeLegendValues.map((value, index) => {
    const area = mapValue(value, sizeDomain, sizeRange);
    const y = bounds.y + 180 + index * 40;
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
    filter: structuredClone(resolvedFilter),
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
          y: bounds.y + bounds.height + 42,
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
          x: bounds.x - 52,
          y: bounds.y + bounds.height / 2,
          text: yField,
          rotation: -Math.PI / 2
        }
      }
    },
    legends: {
      origin: {
        title: { x: originLegendX, y: bounds.y + 20, text: groupField },
        items: originLegendItems
      },
      size: {
        title: { x: originLegendX, y: bounds.y + 146, text: yField },
        items: sizeLegendItems
      }
    }
  };
}
