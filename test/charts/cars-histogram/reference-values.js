const COLORS = ["#4c78a8", "#f58518", "#e45756"];

function requireLayout({ width, height, margin }) {
  if (!Number.isFinite(width) || width <= 0) {
    throw new TypeError("Histogram layout requires a positive finite width.");
  }
  if (!Number.isFinite(height) || height <= 0) {
    throw new TypeError("Histogram layout requires a positive finite height.");
  }
  if (
    margin === null ||
    typeof margin !== "object" ||
    ![margin.top, margin.right, margin.bottom, margin.left].every(
      value => Number.isFinite(value) && value >= 0
    )
  ) {
    throw new TypeError("Histogram layout requires four non-negative margins.");
  }
  const bounds = {
    x: margin.left,
    y: margin.top,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom
  };
  if (bounds.width <= 0 || bounds.height <= 0) {
    throw new Error("Histogram margins must leave positive plot bounds.");
  }
  return bounds;
}

function normalizeRows(cars, field) {
  if (!Array.isArray(cars)) {
    throw new TypeError("Cars must be an array.");
  }

  return cars.filter(
    row =>
      Number.isFinite(row[field]) &&
      typeof row.Origin === "string" &&
      row.Origin.length > 0
  );
}

function niceCeilingStep(span, count) {
  if (span === 0) return 1;
  const rough = span / count;
  const power = 10 ** Math.floor(Math.log10(rough));
  const fraction = rough / power;
  const factor = [1, 2, 3, 5, 10].find(candidate => candidate >= fraction);
  return factor * power;
}

function resolveMaxBins(values, maxBins) {
  if (!Number.isInteger(maxBins) || maxBins <= 0) {
    throw new TypeError("Histogram maxBins must be a positive integer.");
  }
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const step = niceCeilingStep(maximum - minimum, maxBins);
  let start = Math.floor(minimum / step) * step;
  let stop = Math.ceil(maximum / step) * step;

  if (start === stop) {
    start -= step / 2;
    stop += step / 2;
  }

  const count = Math.round((stop - start) / step);
  const boundaries = Array.from(
    { length: count + 1 },
    (_, index) => start + index * step
  );
  return { boundaries, domain: [start, stop], step, mode: "maxBins" };
}

function resolveStepBins(values, step) {
  if (!Number.isFinite(step) || step <= 0) {
    throw new TypeError("Histogram binStep must be a positive finite number.");
  }
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  let start = Math.floor(minimum / step) * step;
  let stop = Math.ceil(maximum / step) * step;
  if (start === stop) stop = start + step;
  const count = Math.round((stop - start) / step);
  return {
    boundaries: Array.from(
      { length: count + 1 },
      (_, index) => start + index * step
    ),
    domain: [start, stop],
    step,
    mode: "step"
  };
}

function resolveBoundaryBins(values, boundaries) {
  if (
    !Array.isArray(boundaries) ||
    boundaries.length < 2 ||
    !boundaries.every(Number.isFinite) ||
    boundaries.some((value, index) => index > 0 && value <= boundaries[index - 1])
  ) {
    throw new TypeError(
      "Histogram binBoundaries must contain at least two strictly increasing finite numbers."
    );
  }
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  if (boundaries[0] > minimum || boundaries.at(-1) < maximum) {
    throw new RangeError("Histogram binBoundaries must contain the data extent.");
  }
  return {
    boundaries: [...boundaries],
    domain: [boundaries[0], boundaries.at(-1)],
    mode: "boundaries"
  };
}

function resolveBins(values, { maxBins, binStep, binBoundaries }) {
  const selected = [maxBins, binStep, binBoundaries].filter(
    value => value !== undefined
  );
  if (selected.length > 1) {
    throw new Error(
      "Histogram accepts only one of maxBins, binStep, or binBoundaries."
    );
  }
  if (binStep !== undefined) return resolveStepBins(values, binStep);
  if (binBoundaries !== undefined) {
    return resolveBoundaryBins(values, binBoundaries);
  }
  return resolveMaxBins(values, maxBins ?? 10);
}

function niceCountScale(maximum, count = 5) {
  const step = niceCeilingStep(maximum, count);
  const stop = Math.ceil(maximum / step) * step;
  const ticks = [];
  for (let value = 0; value <= stop; value += step) ticks.push(value);
  return { domain: [0, stop], ticks };
}

function normalizedCountScale() {
  return {
    domain: [0, 1],
    ticks: [0, 0.2, 0.4, 0.6, 0.8, 1]
  };
}

function mapValue(value, domain, range) {
  if (domain[0] === domain[1]) return (range[0] + range[1]) / 2;
  const ratio = (value - domain[0]) / (domain[1] - domain[0]);
  return range[0] + ratio * (range[1] - range[0]);
}

export function createCarsHistogramValues(
  cars,
  {
    width,
    height,
    margin,
    field = "Displacement",
    maxBins,
    binStep,
    binBoundaries,
    stack = "zero"
  }
) {
  if (typeof field !== "string" || field.length === 0) {
    throw new TypeError("Histogram field must be a non-empty string.");
  }
  if (stack !== "zero" && stack !== "normalize") {
    throw new Error(`Unsupported histogram reference stack "${stack}".`);
  }
  const bounds = requireLayout({ width, height, margin });
  const validCars = normalizeRows(cars, field);
  if (validCars.length === 0) {
    throw new Error("Histogram requires at least one valid car row.");
  }

  const origins = [...new Set(validCars.map(row => row.Origin))];
  const binned = resolveBins(validCars.map(row => row[field]), {
    maxBins,
    binStep,
    binBoundaries
  });
  const bins = binned.boundaries.slice(0, -1).map((start, index) => ({
    index,
    start,
    end: binned.boundaries[index + 1],
    counts: Object.fromEntries(origins.map(origin => [origin, 0]))
  }));

  for (const row of validCars) {
    const value = row[field];
    const located = bins.findIndex(bin => value >= bin.start && value < bin.end);
    const index = value === binned.domain[1] ? bins.length - 1 : located;
    if (index < 0) {
      throw new Error(`Histogram value ${value} was not assigned to a bin.`);
    }
    bins[index].counts[row.Origin] += 1;
  }

  for (const bin of bins) {
    bin.total = origins.reduce((sum, origin) => sum + bin.counts[origin], 0);
  }

  const yScale = stack === "normalize"
    ? normalizedCountScale()
    : niceCountScale(Math.max(...bins.map(bin => bin.total)));
  const xRange = [bounds.x, bounds.x + bounds.width];
  const yRange = [bounds.y + bounds.height, bounds.y];
  const rects = [];

  for (const bin of bins) {
    let stackStart = 0;
    for (let index = 0; index < origins.length; index += 1) {
      const origin = origins[index];
      const count = bin.counts[origin];
      if (count === 0) continue;
      const value = stack === "normalize" ? count / bin.total : count;
      const stackEnd = stackStart + value;
      const x = mapValue(bin.start, binned.domain, xRange);
      const x2 = mapValue(bin.end, binned.domain, xRange);
      const y = mapValue(stackEnd, yScale.domain, yRange);
      const y2 = mapValue(stackStart, yScale.domain, yRange);
      rects.push({
        bin: bin.index,
        origin,
        count,
        value,
        stackStart,
        stackEnd,
        x,
        y,
        width: x2 - x,
        height: y2 - y,
        fill: COLORS[index % COLORS.length]
      });
      stackStart = stackEnd;
    }
  }

  const xTicks = binned.boundaries.map(value => ({
    value,
    position: mapValue(value, binned.domain, xRange),
    label: String(value)
  }));
  const yTicks = yScale.ticks.map(value => ({
    value,
    position: mapValue(value, yScale.domain, yRange),
    label: String(value)
  }));
  const legendSymbolWidth = 14;
  const legendLabelGap = 8;
  const legendItemGap = 20;
  const legendItemWidths = origins.map(
    origin => legendSymbolWidth + legendLabelGap + origin.length * 7
  );
  const legendWidth =
    legendItemWidths.reduce((sum, itemWidth) => sum + itemWidth, 0) +
    legendItemGap * (origins.length - 1);
  let legendItemX = (width - legendWidth) / 2;
  const legendY = height - 28;
  const legendItems = origins.map((origin, index) => {
    const x = legendItemX;
    legendItemX += legendItemWidths[index] + legendItemGap;
    return {
      origin,
      color: COLORS[index % COLORS.length],
      x,
      y: legendY - 6,
      width: legendSymbolWidth,
      height: 12,
      labelX: x + legendSymbolWidth + legendLabelGap,
      labelY: legendY,
      itemWidth: legendItemWidths[index]
    };
  });

  return {
    validCars,
    bounds,
    origins,
    bins,
    rects,
    scales: {
      x: {
        domain: binned.domain,
        range: xRange,
        ...(binned.step === undefined ? {} : { step: binned.step }),
        ...(binned.mode === "boundaries"
          ? { boundaries: binned.boundaries }
          : {})
      },
      y: { domain: yScale.domain, range: yRange }
    },
    grid: {
      horizontal: yTicks.map(tick => ({
        value: tick.value,
        x1: bounds.x,
        y1: tick.position,
        x2: bounds.x + bounds.width,
        y2: tick.position
      }))
    },
    axes: {
      x: {
        line: {
          x1: bounds.x,
          y1: bounds.y + bounds.height,
          x2: bounds.x + bounds.width,
          y2: bounds.y + bounds.height
        },
        ticks: xTicks,
        title: {
          x: bounds.x + bounds.width / 2,
          y: bounds.y + bounds.height + 42,
          text: field
        }
      },
      y: {
        line: {
          x1: bounds.x,
          y1: bounds.y + bounds.height,
          x2: bounds.x,
          y2: bounds.y
        },
        ticks: yTicks,
        title: {
          x: bounds.x - 52,
          y: bounds.y + bounds.height / 2,
          text: `count(${field})`,
          rotation: -Math.PI / 2
        }
      }
    },
    legend: {
      title: { x: width / 2, y: height - 52, text: "Origin" },
      items: legendItems,
      width: legendWidth
    },
    title: {
      text: "Displacement distribution",
      subtitle: "by country"
    }
  };
}
