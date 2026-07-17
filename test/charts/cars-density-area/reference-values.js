import {
  mapLinear,
  niceStep,
  numericTicks as ticksForDomain,
  quantile
} from "../../oracles/numeric.js";

const SQRT_TWO_PI = Math.sqrt(2 * Math.PI);
const COLORS = ["#4c78a8", "#f58518", "#e45756"];

function requireNonEmptyString(value, name) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${name} must be a non-empty string.`);
  }
}

function sampleDeviation(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const sumSquares = values.reduce(
    (sum, value) => sum + (value - mean) ** 2,
    0
  );
  return Math.sqrt(sumSquares / (values.length - 1));
}

function estimateScottBandwidth(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const deviation = sampleDeviation(sorted);
  const interquartileRange = quantile(sorted, 0.75) - quantile(sorted, 0.25);
  const robustDeviation = interquartileRange / 1.34;
  const spread = robustDeviation > 0
    ? Math.min(deviation, robustDeviation)
    : deviation;
  const bandwidth = 1.06 * spread * sorted.length ** -0.2;

  if (!Number.isFinite(bandwidth) || bandwidth <= 0) {
    throw new Error("Density auto bandwidth requires varying finite values.");
  }
  return bandwidth;
}

function resolveBandwidth(option, values) {
  if (option === undefined || option === "auto") {
    return estimateScottBandwidth(values);
  }
  if (!Number.isFinite(option) || option <= 0) {
    throw new RangeError("Density bandwidth must be a positive finite number or auto.");
  }
  return option;
}

function resolveExtent(option, values) {
  if (option === undefined || option === "auto") {
    const extent = [Math.min(...values), Math.max(...values)];
    if (extent[0] === extent[1]) {
      throw new Error("Density observed extent requires varying finite values.");
    }
    return extent;
  }
  if (
    !Array.isArray(option) ||
    option.length !== 2 ||
    !option.every(Number.isFinite) ||
    option[0] >= option[1]
  ) {
    throw new RangeError("Density extent must be an ascending pair of finite numbers.");
  }
  return [...option];
}

const DENSITY_KERNELS = Object.freeze({
  gaussian(value) {
    return Math.exp(-0.5 * value ** 2) / SQRT_TWO_PI;
  },
  epanechnikov(value) {
    return Math.abs(value) <= 1 ? 0.75 * (1 - value ** 2) : 0;
  },
  uniform(value) {
    return Math.abs(value) <= 1 ? 0.5 : 0;
  },
  triangular(value) {
    return Math.abs(value) <= 1 ? 1 - Math.abs(value) : 0;
  }
});

function resolveKernel(value) {
  if (!Object.hasOwn(DENSITY_KERNELS, value)) {
    throw new Error(`Unsupported density kernel "${value}".`);
  }
  return value;
}

function resolveNormalization(value) {
  if (!["unit", "count"].includes(value)) {
    throw new Error(`Unsupported density normalization "${value}".`);
  }
  return value;
}

function estimateDensity(
  sample,
  values,
  bandwidth,
  kernel,
  normalization
) {
  const kernelSum = values.reduce(
    (sum, value) => sum + DENSITY_KERNELS[kernel](
      (sample - value) / bandwidth
    ),
    0
  );
  const denominator = normalization === "unit"
    ? values.length * bandwidth
    : bandwidth;
  return kernelSum / denominator;
}

function requireLayout({ width, height, margin }) {
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    throw new TypeError("Density area layout requires positive finite dimensions.");
  }
  if (
    margin === null ||
    typeof margin !== "object" ||
    ![margin.top, margin.right, margin.bottom, margin.left].every(
      value => Number.isFinite(value) && value >= 0
    )
  ) {
    throw new TypeError("Density area layout requires four non-negative margins.");
  }
  const bounds = {
    x: margin.left,
    y: margin.top,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom
  };
  if (bounds.width <= 0 || bounds.height <= 0) {
    throw new Error("Density area margins must leave positive plot bounds.");
  }
  return bounds;
}

function buildLegend(
  groupDomain,
  colors,
  { bounds, offset = 8, titlePosition = "left" }
) {
  if (!["top", "left"].includes(titlePosition)) {
    throw new Error(`Unsupported legend titlePosition "${titlePosition}".`);
  }
  const symbolWidth = 14;
  const symbolHeight = 12;
  const labelOffset = 8;
  const itemGap = 24;
  const titleGap = 20;
  const titleText = "Origin";
  const titleWidth = titleText.length * 7;
  const itemWidths = groupDomain.map(
    group => symbolWidth + labelOffset + String(group).length * 7
  );
  const itemsWidth = itemWidths.reduce((sum, value) => sum + value, 0) +
    itemGap * Math.max(0, groupDomain.length - 1);
  const totalWidth = titlePosition === "left"
    ? titleWidth + titleGap + itemsWidth
    : itemsWidth;
  const start = bounds.x + (bounds.width - totalWidth) / 2;
  let cursor = titlePosition === "left"
    ? start + titleWidth + titleGap
    : start;
  const itemY = bounds.y - offset - symbolHeight / 2;
  const items = groupDomain.map((group, index) => {
    const item = {
      group,
      color: colors[index % colors.length],
      x: cursor,
      y: itemY - symbolHeight / 2,
      width: symbolWidth,
      height: symbolHeight,
      labelX: cursor + symbolWidth + labelOffset,
      labelY: itemY
    };
    cursor += itemWidths[index] + itemGap;
    return item;
  });
  return {
    position: "top",
    direction: "vertical",
    columns: 3,
    titlePosition,
    offset,
    title: {
      x: titlePosition === "left" ? start : bounds.x + bounds.width / 2,
      y: titlePosition === "left" ? itemY : itemY - 26,
      text: titleText,
      textAlign: titlePosition === "left" ? "left" : "center"
    },
    items,
    width: totalWidth
  };
}

export function createCarsDensityAreaValues(
  cars,
  {
    field = "Acceleration",
    groupBy = "Origin",
    bandwidth = 0.6,
    kernel = "gaussian",
    normalization = "unit",
    extent = "auto",
    steps = 100,
    as = ["Acceleration_value", "Acceleration_density"],
    width = 720,
    height = 500,
    margin = { top: 130, right: 40, bottom: 70, left: 80 },
    legendTitlePosition = "left"
  } = {}
) {
  if (!Array.isArray(cars)) {
    throw new TypeError("Cars must be an array.");
  }
  requireNonEmptyString(field, "Density field");
  requireNonEmptyString(groupBy, "Density groupBy");
  if (
    !Array.isArray(as) ||
    as.length !== 2 ||
    !as.every(value => typeof value === "string" && value.length > 0) ||
    as[0] === as[1] ||
    as.includes(groupBy)
  ) {
    throw new TypeError(
      "Density as must contain two distinct non-empty fields different from groupBy."
    );
  }
  if (!Number.isInteger(steps) || steps < 2) {
    throw new RangeError("Density steps must be an integer of at least 2.");
  }
  const bounds = requireLayout({ width, height, margin });

  const validRows = cars
    .filter(row =>
      row !== null &&
      typeof row === "object" &&
      Number.isFinite(row[field]) &&
      typeof row[groupBy] === "string" &&
      row[groupBy].length > 0
    )
    .map(row => structuredClone(row));
  if (validRows.length === 0) {
    throw new Error("Density requires at least one valid field/group row.");
  }

  const sourceValues = validRows.map(row => row[field]);
  const resolvedBandwidth = resolveBandwidth(bandwidth, sourceValues);
  const resolvedKernel = resolveKernel(kernel);
  const resolvedNormalization = resolveNormalization(normalization);
  const resolvedExtent = resolveExtent(extent, sourceValues);
  const groupDomain = [...new Set(validRows.map(row => row[groupBy]))];
  const sampleStep = (resolvedExtent[1] - resolvedExtent[0]) / (steps - 1);
  const sampleValues = Array.from(
    { length: steps },
    (_, index) => index === steps - 1
      ? resolvedExtent[1]
      : resolvedExtent[0] + sampleStep * index
  );
  const groups = groupDomain.map(group => {
    const values = validRows
      .filter(row => row[groupBy] === group)
      .map(row => row[field]);
    const rows = sampleValues.map(sample => ({
      [groupBy]: group,
      [as[0]]: sample,
      [as[1]]: estimateDensity(
        sample,
        values,
        resolvedBandwidth,
        resolvedKernel,
        resolvedNormalization
      )
    }));
    return {
      group,
      values: [...values],
      rows,
      peak: rows.reduce(
        (highest, row) => row[as[1]] > highest[as[1]] ? row : highest
      )
    };
  });
  const xDomain = [...resolvedExtent];
  const maximumDensity = Math.max(
    ...groups.flatMap(group => group.rows.map(row => row[as[1]]))
  );
  const yStep = niceStep(maximumDensity, 5);
  const yDomain = [
    0,
    Number((Math.ceil(maximumDensity / yStep) * yStep).toPrecision(12))
  ];
  const xRange = [bounds.x, bounds.x + bounds.width];
  const yRange = [bounds.y + bounds.height, bounds.y];
  const xTicks = ticksForDomain(xDomain).map(value => ({
    value,
    position: mapLinear(value, xDomain, xRange),
    label: String(value)
  }));
  const yTicks = ticksForDomain(yDomain).map(value => ({
    value,
    position: mapLinear(value, yDomain, yRange),
    label: String(value)
  }));
  const baseline = yRange[0];
  const areas = groups.map((group, index) => ({
    group: group.group,
    fill: COLORS[index % COLORS.length],
    opacity: 0.5,
    points: [
      { x: xRange[0], y: baseline },
      ...group.rows.map(row => ({
        x: mapLinear(row[as[0]], xDomain, xRange),
        y: mapLinear(row[as[1]], yDomain, yRange)
      })),
      { x: xRange[1], y: baseline }
    ]
  }));
  const xAxisLine = {
    x1: bounds.x,
    y1: bounds.y + bounds.height,
    x2: bounds.x + bounds.width,
    y2: bounds.y + bounds.height
  };
  const yAxisLine = {
    x1: bounds.x,
    y1: bounds.y + bounds.height,
    x2: bounds.x,
    y2: bounds.y
  };

  return {
    validRows,
    fields: { source: field, group: groupBy, value: as[0], density: as[1] },
    bandwidth: resolvedBandwidth,
    kernel: resolvedKernel,
    normalization: resolvedNormalization,
    extent: resolvedExtent,
    steps,
    sampleValues,
    groupDomain,
    groups,
    densityRows: groups.flatMap(group => group.rows.map(row => ({ ...row }))),
    bounds,
    scales: {
      x: { domain: xDomain, range: xRange },
      y: { domain: yDomain, range: yRange },
      color: { domain: groupDomain, range: COLORS.slice(0, groupDomain.length) }
    },
    areas,
    grid: {
      horizontal: yTicks.map(tick => ({
        value: tick.value,
        x1: bounds.x,
        y1: tick.position,
        x2: bounds.x + bounds.width,
        y2: tick.position
      })),
      vertical: xTicks.map(tick => ({
        value: tick.value,
        x1: tick.position,
        y1: bounds.y,
        x2: tick.position,
        y2: bounds.y + bounds.height
      }))
    },
    axes: {
      x: {
        line: xAxisLine,
        ticks: xTicks,
        title: {
          x: bounds.x + bounds.width / 2,
          y: xAxisLine.y1 + 42,
          text: field
        }
      },
      y: {
        line: yAxisLine,
        ticks: yTicks,
        title: {
          x: yAxisLine.x1 - 52,
          y: bounds.y + bounds.height / 2,
          text: "Density",
          rotation: -Math.PI / 2
        }
      }
    },
    legend: buildLegend(groupDomain, COLORS, {
      bounds,
      titlePosition: legendTitlePosition
    }),
    title: {
      text: "Distribution of Acceleration",
      subtitle: "By Origin (cars dataset)"
    }
  };
}
