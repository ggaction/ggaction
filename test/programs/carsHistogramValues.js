const COLORS = ["#4c78a8", "#f58518", "#e45756"];

function requireLayout({ width, height, margin, maxBins }) {
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
  if (!Number.isInteger(maxBins) || maxBins <= 0) {
    throw new TypeError("Histogram maxBins must be a positive integer.");
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

function normalizeRows(cars) {
  if (!Array.isArray(cars)) {
    throw new TypeError("Cars must be an array.");
  }

  return cars.filter(
    row =>
      Number.isFinite(row.Displacement) &&
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

function resolveBins(values, maxBins) {
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
  const bins = Array.from({ length: count }, (_, index) => ({
    index,
    start: start + index * step,
    end: start + (index + 1) * step
  }));
  return { bins, domain: [start, stop], step };
}

function niceCountScale(maximum, count = 5) {
  const step = niceCeilingStep(maximum, count);
  const stop = Math.ceil(maximum / step) * step;
  const ticks = [];
  for (let value = 0; value <= stop; value += step) ticks.push(value);
  return { domain: [0, stop], ticks };
}

function mapValue(value, domain, range) {
  if (domain[0] === domain[1]) return (range[0] + range[1]) / 2;
  const ratio = (value - domain[0]) / (domain[1] - domain[0]);
  return range[0] + ratio * (range[1] - range[0]);
}

export function createCarsHistogramValues(
  cars,
  { width, height, margin, maxBins = 10 }
) {
  const bounds = requireLayout({ width, height, margin, maxBins });
  const validCars = normalizeRows(cars);
  if (validCars.length === 0) {
    throw new Error("Histogram requires at least one valid car row.");
  }

  const origins = [...new Set(validCars.map(row => row.Origin))];
  const binned = resolveBins(
    validCars.map(row => row.Displacement),
    maxBins
  );
  const bins = binned.bins.map(bin => ({
    ...bin,
    counts: Object.fromEntries(origins.map(origin => [origin, 0]))
  }));

  for (const row of validCars) {
    const rawIndex = Math.floor(
      (row.Displacement - binned.domain[0]) / binned.step
    );
    const index = Math.min(bins.length - 1, Math.max(0, rawIndex));
    bins[index].counts[row.Origin] += 1;
  }

  for (const bin of bins) {
    bin.total = origins.reduce((sum, origin) => sum + bin.counts[origin], 0);
  }

  const yScale = niceCountScale(Math.max(...bins.map(bin => bin.total)));
  const xRange = [bounds.x, bounds.x + bounds.width];
  const yRange = [bounds.y + bounds.height, bounds.y];
  const rects = [];

  for (const bin of bins) {
    let stackStart = 0;
    for (let index = 0; index < origins.length; index += 1) {
      const origin = origins[index];
      const count = bin.counts[origin];
      if (count === 0) continue;
      const stackEnd = stackStart + count;
      const x = mapValue(bin.start, binned.domain, xRange);
      const x2 = mapValue(bin.end, binned.domain, xRange);
      const y = mapValue(stackEnd, yScale.domain, yRange);
      const y2 = mapValue(stackStart, yScale.domain, yRange);
      rects.push({
        bin: bin.index,
        origin,
        count,
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

  const xTicks = Array.from(
    { length: bins.length + 1 },
    (_, index) => binned.domain[0] + index * binned.step
  ).map(value => ({
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
      x: { domain: binned.domain, range: xRange, step: binned.step },
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
          text: "Displacement"
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
          text: "count(Displacement)",
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
