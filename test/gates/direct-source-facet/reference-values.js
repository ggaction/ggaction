const ORIGINS = Object.freeze(["USA", "Europe", "Japan"]);
const CYLINDERS = Object.freeze([8, 4, 6, 3, 5]);
const REDS = Object.freeze([
  "#fdc9b4",
  "#fc9374",
  "#f6573f",
  "#d22321",
  "#970b13"
]);
const FONT_FAMILY = "Arial, sans-serif";
const TEXT_COLOR = "#334155";
const AXIS_COLOR = "#64748b";
const GRID_COLOR = "#e2e8f0";

const SCATTER_CELL = Object.freeze({ width: 250, height: 230 });
const HISTOGRAM_CELL = Object.freeze({ width: 280, height: 240 });
const SCATTER_PLOT = Object.freeze({ left: 52, right: 234, top: 38, bottom: 182 });
const HISTOGRAM_PLOT = Object.freeze({ left: 52, right: 262, top: 38, bottom: 190 });
const TITLE_HEIGHT = 52;
const LEGEND_GAP = 18;
const LEGEND_WIDTH = 132;

function assertCars(cars) {
  if (!Array.isArray(cars)) throw new TypeError("cars must be an array.");
}

function firstAppearance(values) {
  return [...new Set(values)];
}

function extent(values) {
  return [Math.min(...values), Math.max(...values)];
}

function mapLinear(value, [domainStart, domainEnd], [rangeStart, rangeEnd]) {
  if (domainStart === domainEnd) return (rangeStart + rangeEnd) / 2;
  const ratio = (value - domainStart) / (domainEnd - domainStart);
  return rangeStart + ratio * (rangeEnd - rangeStart);
}

function text(value, x, y, options = {}) {
  return Object.freeze({
    type: "text",
    properties: Object.freeze({
      x,
      y,
      text: String(value),
      fill: options.fill ?? TEXT_COLOR,
      fontSize: options.fontSize ?? 10,
      fontFamily: FONT_FAMILY,
      fontWeight: options.fontWeight ?? "normal",
      textAlign: options.textAlign ?? "left",
      textBaseline: options.textBaseline ?? "alphabetic",
      rotation: options.rotation ?? 0,
      opacity: options.opacity ?? 1
    })
  });
}

function line(x1, y1, x2, y2, options = {}) {
  return Object.freeze({
    type: "line",
    properties: Object.freeze({
      x1,
      y1,
      x2,
      y2,
      stroke: options.stroke ?? AXIS_COLOR,
      strokeWidth: options.strokeWidth ?? 1,
      strokeDash: options.strokeDash ?? Object.freeze([]),
      opacity: options.opacity ?? 1
    })
  });
}

function cylinderColor(value) {
  const index = CYLINDERS.indexOf(value);
  if (index < 0) throw new Error(`Unknown Cylinders value ${value}.`);
  return REDS[index];
}

function circle(x, y, fill, radius = 2.5) {
  return Object.freeze({
    type: "circle",
    properties: Object.freeze({
      x,
      y,
      radius,
      fill,
      stroke: "#ffffff",
      strokeWidth: 0.35,
      opacity: 1
    })
  });
}

function rect(x, y, width, height, fill) {
  return Object.freeze({
    type: "rect",
    properties: Object.freeze({
      x,
      y,
      width,
      height,
      fill,
      stroke: "#ffffff",
      strokeWidth: 0.6,
      opacity: 1
    })
  });
}

function legendItems(x, y, symbol) {
  const items = [text("Cylinders", x, y, {
    fontSize: 12,
    fontWeight: 700,
    textBaseline: "top"
  })];
  CYLINDERS.forEach((value, index) => {
    const itemY = y + 28 + index * 26;
    if (symbol === "circle") {
      items.push(circle(x + 7, itemY + 1, cylinderColor(value), 5.5));
    } else {
      items.push(rect(x + 1, itemY - 5, 12, 12, cylinderColor(value)));
    }
    items.push(text(value, x + 22, itemY + 1, {
      fontSize: 10.5,
      textBaseline: "middle"
    }));
  });
  return Object.freeze(items);
}

function facetLayout({ valueCount, cell, columns, gap = 16, padding = 0 }) {
  const resolvedColumns = Math.min(columns ?? valueCount, valueCount);
  const rows = Math.ceil(valueCount / resolvedColumns);
  const resolvedPadding = typeof padding === "number"
    ? { top: padding, right: padding, bottom: padding, left: padding }
    : {
        top: padding.top ?? 0,
        right: padding.right ?? 0,
        bottom: padding.bottom ?? 0,
        left: padding.left ?? 0
      };
  const cells = Object.freeze(Array.from({ length: valueCount }, (_, index) => Object.freeze({
    id: `cell-${index}`,
    column: index % resolvedColumns,
    row: Math.floor(index / resolvedColumns),
    x: resolvedPadding.left + (index % resolvedColumns) * (cell.width + gap),
    y: TITLE_HEIGHT + resolvedPadding.top +
      Math.floor(index / resolvedColumns) * (cell.height + gap),
    width: cell.width,
    height: cell.height
  })));
  return Object.freeze({
    columns: resolvedColumns,
    rows,
    gap,
    padding: Object.freeze(resolvedPadding),
    width: resolvedPadding.left + resolvedPadding.right +
      resolvedColumns * cell.width + Math.max(0, resolvedColumns - 1) * gap,
    height: TITLE_HEIGHT + resolvedPadding.top + resolvedPadding.bottom +
      rows * cell.height + Math.max(0, rows - 1) * gap,
    cells
  });
}

function titleItems(title, subtitle, x) {
  return Object.freeze([
    text(title, x, 12, {
      fontSize: 16,
      fontWeight: 700,
      textAlign: "center",
      textBaseline: "top"
    }),
    text(subtitle, x, 34, {
      fontSize: 11,
      fill: "#64748b",
      textAlign: "center",
      textBaseline: "top"
    })
  ]);
}

function scatterCellItems(rows, origin, domains) {
  const plot = SCATTER_PLOT;
  const xTicks = [50, 100, 150, 200];
  const yTicks = [10, 20, 30, 40];
  const items = [
    text(origin, SCATTER_CELL.width / 2, 10, {
      fontSize: 13,
      fontWeight: 700,
      textAlign: "center",
      textBaseline: "top"
    })
  ];
  for (const tick of yTicks) {
    const y = mapLinear(tick, domains.y, [plot.bottom, plot.top]);
    items.push(line(plot.left, y, plot.right, y, { stroke: GRID_COLOR }));
    items.push(text(tick, plot.left - 8, y, {
      textAlign: "right",
      textBaseline: "middle"
    }));
  }
  items.push(line(plot.left, plot.bottom, plot.right, plot.bottom, {
    strokeWidth: 1.2
  }));
  items.push(line(plot.left, plot.top, plot.left, plot.bottom, {
    strokeWidth: 1.2
  }));
  for (const tick of xTicks) {
    const x = mapLinear(tick, domains.x, [plot.left, plot.right]);
    items.push(line(x, plot.bottom, x, plot.bottom + 4));
    items.push(text(tick, x, plot.bottom + 9, {
      textAlign: "center",
      textBaseline: "top"
    }));
  }
  items.push(text("Horsepower", (plot.left + plot.right) / 2, 220, {
    fontSize: 10.5,
    textAlign: "center"
  }));
  items.push(text("MPG", 13, (plot.top + plot.bottom) / 2, {
    fontSize: 10.5,
    textAlign: "center",
    textBaseline: "middle",
    rotation: -Math.PI / 2
  }));
  for (const row of rows) {
    items.push(circle(
      mapLinear(row.Horsepower, domains.x, [plot.left, plot.right]),
      mapLinear(row.Miles_per_Gallon, domains.y, [plot.bottom, plot.top]),
      cylinderColor(row.Cylinders)
    ));
  }
  return Object.freeze(items);
}

function histogramBoundaries(rows, binCount) {
  const values = rows.map(row => row.Displacement);
  const [minimum, maximum] = extent(values);
  const niceMinimum = Math.floor(minimum / 50) * 50;
  const niceMaximum = Math.ceil(maximum / 50) * 50;
  const step = (niceMaximum - niceMinimum) / binCount;
  return Object.freeze(Array.from(
    { length: binCount + 1 },
    (_, index) => niceMinimum + index * step
  ));
}

function histogramCounts(rows, boundaries) {
  const counts = Array(boundaries.length - 1).fill(0);
  const start = boundaries[0];
  const end = boundaries.at(-1);
  const step = (end - start) / counts.length;
  for (const row of rows) {
    let index = Math.floor((row.Displacement - start) / step);
    if (row.Displacement === end) index = counts.length - 1;
    if (index >= 0 && index < counts.length) counts[index] += 1;
  }
  return Object.freeze(counts);
}

function histogramStacks(rows, boundaries) {
  const stacks = Array.from(
    { length: boundaries.length - 1 },
    () => Array(CYLINDERS.length).fill(0)
  );
  const start = boundaries[0];
  const end = boundaries.at(-1);
  const step = (end - start) / stacks.length;
  for (const row of rows) {
    let binIndex = Math.floor((row.Displacement - start) / step);
    if (row.Displacement === end) binIndex = stacks.length - 1;
    const cylinderIndex = CYLINDERS.indexOf(row.Cylinders);
    if (binIndex >= 0 && binIndex < stacks.length && cylinderIndex >= 0) {
      stacks[binIndex][cylinderIndex] += 1;
    }
  }
  return Object.freeze(stacks.map(stack => Object.freeze(stack)));
}

function histogramCellItems(origin, stacks, domains) {
  const plot = HISTOGRAM_PLOT;
  const yTicks = [0, 20, 40, 60];
  const xTicks = [50, 275, 500];
  const items = [
    text(origin, HISTOGRAM_CELL.width / 2, 10, {
      fontSize: 13,
      fontWeight: 700,
      textAlign: "center",
      textBaseline: "top"
    })
  ];
  for (const tick of yTicks) {
    const y = mapLinear(tick, domains.y, [plot.bottom, plot.top]);
    items.push(line(plot.left, y, plot.right, y, { stroke: GRID_COLOR }));
    items.push(text(tick, plot.left - 8, y, {
      textAlign: "right",
      textBaseline: "middle"
    }));
  }
  items.push(line(plot.left, plot.bottom, plot.right, plot.bottom, {
    strokeWidth: 1.2
  }));
  items.push(line(plot.left, plot.top, plot.left, plot.bottom, {
    strokeWidth: 1.2
  }));
  for (const tick of xTicks) {
    const x = mapLinear(tick, domains.x, [plot.left, plot.right]);
    items.push(line(x, plot.bottom, x, plot.bottom + 4));
    items.push(text(tick, x, plot.bottom + 9, {
      textAlign: "center",
      textBaseline: "top"
    }));
  }
  const slotWidth = (plot.right - plot.left) / stacks.length;
  stacks.forEach((stack, index) => {
    let start = 0;
    stack.forEach((count, cylinderIndex) => {
      if (count === 0) return;
      const end = start + count;
      const y = mapLinear(end, domains.y, [plot.bottom, plot.top]);
      const baseline = mapLinear(start, domains.y, [plot.bottom, plot.top]);
      items.push(rect(
        plot.left + index * slotWidth + 0.75,
        y,
        slotWidth - 1.5,
        baseline - y,
        REDS[cylinderIndex]
      ));
      start = end;
    });
  });
  items.push(text("Displacement", (plot.left + plot.right) / 2, 230, {
    fontSize: 10.5,
    textAlign: "center"
  }));
  items.push(text("Count", 13, (plot.top + plot.bottom) / 2, {
    fontSize: 10.5,
    textAlign: "center",
    textBaseline: "middle",
    rotation: -Math.PI / 2
  }));
  return Object.freeze(items);
}

export function createDirectFacetGateValues(cars) {
  assertCars(cars);
  const scatterRows = cars.filter(row =>
    Number.isFinite(row.Horsepower) &&
    Number.isFinite(row.Miles_per_Gallon) &&
    CYLINDERS.includes(row.Cylinders) &&
    typeof row.Origin === "string" &&
    row.Origin.length > 0
  );
  const histogramRows = cars.filter(row =>
    Number.isFinite(row.Displacement) &&
    CYLINDERS.includes(row.Cylinders) &&
    typeof row.Origin === "string" &&
    row.Origin.length > 0
  );
  const origins = Object.freeze(firstAppearance(cars
    .map(row => row.Origin)
    .filter(value => typeof value === "string" && value.length > 0)));
  if (origins.length === 0) throw new Error("Facet values must not be empty.");
  if (origins.join("\u0000") !== ORIGINS.join("\u0000")) {
    throw new Error("Cars Origin order changed from the Gate H fixture.");
  }
  const cylinders = Object.freeze(firstAppearance(cars
    .map(row => row.Cylinders)
    .filter(value => CYLINDERS.includes(value))));
  if (cylinders.join("\u0000") !== CYLINDERS.join("\u0000")) {
    throw new Error("Cars Cylinders order changed from the Gate H fixture.");
  }

  const scatterDomains = Object.freeze({
    x: Object.freeze([40, 250]),
    y: Object.freeze([0, 50])
  });
  const scatterLayout = facetLayout({
    valueCount: origins.length,
    cell: SCATTER_CELL
  });
  const scatterCells = Object.freeze(origins.map((origin, index) => Object.freeze({
    ...scatterLayout.cells[index],
    value: origin,
    rows: Object.freeze(scatterRows.filter(row => row.Origin === origin)),
    items: scatterCellItems(
      scatterRows.filter(row => row.Origin === origin),
      origin,
      scatterDomains
    )
  })));

  const histogramBoundariesValue = histogramBoundaries(histogramRows, 8);
  const histogramSeries = origins.map(origin => Object.freeze({
    origin,
    rows: Object.freeze(histogramRows.filter(row => row.Origin === origin)),
    counts: histogramCounts(
      histogramRows.filter(row => row.Origin === origin),
      histogramBoundariesValue
    ),
    stacks: histogramStacks(
      histogramRows.filter(row => row.Origin === origin),
      histogramBoundariesValue
    )
  }));
  const maximumCount = Math.max(...histogramSeries.flatMap(series => series.counts));
  const histogramDomains = Object.freeze({
    x: Object.freeze([
      histogramBoundariesValue[0],
      histogramBoundariesValue.at(-1)
    ]),
    y: Object.freeze([0, Math.ceil(maximumCount / 20) * 20])
  });
  const histogramLayout = facetLayout({
    valueCount: origins.length,
    cell: HISTOGRAM_CELL,
    columns: 2,
    gap: 18,
    padding: 14
  });
  const histogramCells = Object.freeze(histogramSeries.map((series, index) => Object.freeze({
    ...histogramLayout.cells[index],
    value: series.origin,
    rows: series.rows,
    counts: series.counts,
    stacks: series.stacks,
    items: histogramCellItems(series.origin, series.stacks, histogramDomains)
  })));
  const placedPlotBounds = (cells, plot) => {
    const left = Math.min(...cells.map(cell => cell.x + plot.left));
    const top = Math.min(...cells.map(cell => cell.y + plot.top));
    const right = Math.max(...cells.map(cell => cell.x + plot.right));
    const bottom = Math.max(...cells.map(cell => cell.y + plot.bottom));
    return Object.freeze({
      x: left,
      y: top,
      width: right - left,
      height: bottom - top
    });
  };
  const scatterPlot = placedPlotBounds(scatterCells, SCATTER_PLOT);
  const histogramPlot = placedPlotBounds(histogramCells, HISTOGRAM_PLOT);

  return Object.freeze({
    origins,
    cylinders,
    colorRange: REDS,
    scatter: Object.freeze({
      ...scatterLayout,
      width: scatterLayout.width + LEGEND_GAP + LEGEND_WIDTH,
      cells: scatterCells,
      domains: scatterDomains,
      plot: scatterPlot,
      titleItems: titleItems(
        "Horsepower and Fuel Economy",
        "Faceted by Origin",
        scatterPlot.x + scatterPlot.width / 2
      ),
      legendItems: legendItems(
        scatterLayout.width + LEGEND_GAP,
        TITLE_HEIGHT + 30,
        "circle"
      )
    }),
    histogram: Object.freeze({
      ...histogramLayout,
      width: histogramLayout.width + LEGEND_GAP + LEGEND_WIDTH,
      cells: histogramCells,
      domains: histogramDomains,
      boundaries: histogramBoundariesValue,
      plot: histogramPlot,
      titleItems: titleItems(
        "Displacement Distribution",
        "Faceted by Origin",
        histogramPlot.x + histogramPlot.width / 2
      ),
      legendItems: legendItems(
        histogramLayout.width + LEGEND_GAP,
        TITLE_HEIGHT + 44,
        "rect"
      )
    })
  });
}
