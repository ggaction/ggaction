const ORIGINS = Object.freeze(["USA", "Europe", "Japan"]);
const FONT_FAMILY = "Arial, sans-serif";
const MARK_COLOR = "#4c78a8";
const TEXT_COLOR = "#334155";
const AXIS_COLOR = "#64748b";
const GRID_COLOR = "#e2e8f0";

const SCATTER_CELL = Object.freeze({ width: 250, height: 230 });
const HISTOGRAM_CELL = Object.freeze({ width: 280, height: 240 });
const TITLE_HEIGHT = 52;

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

function circle(x, y) {
  return Object.freeze({
    type: "circle",
    properties: Object.freeze({
      x,
      y,
      radius: 2.5,
      fill: MARK_COLOR,
      stroke: "#ffffff",
      strokeWidth: 0.35,
      opacity: 1
    })
  });
}

function rect(x, y, width, height) {
  return Object.freeze({
    type: "rect",
    properties: Object.freeze({
      x,
      y,
      width,
      height,
      fill: MARK_COLOR,
      stroke: "#ffffff",
      strokeWidth: 0.6,
      opacity: 1
    })
  });
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

function titleItems(title, subtitle, width) {
  return Object.freeze([
    text(title, width / 2, 12, {
      fontSize: 16,
      fontWeight: 700,
      textAlign: "center",
      textBaseline: "top"
    }),
    text(subtitle, width / 2, 34, {
      fontSize: 11,
      fill: "#64748b",
      textAlign: "center",
      textBaseline: "top"
    })
  ]);
}

function scatterCellItems(rows, origin, domains) {
  const plot = Object.freeze({ left: 52, right: 234, top: 38, bottom: 182 });
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
      mapLinear(row.Miles_per_Gallon, domains.y, [plot.bottom, plot.top])
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

function histogramCellItems(origin, counts, domains) {
  const plot = Object.freeze({ left: 52, right: 262, top: 38, bottom: 190 });
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
  const slotWidth = (plot.right - plot.left) / counts.length;
  counts.forEach((count, index) => {
    if (count === 0) return;
    const height = mapLinear(count, domains.y, [0, plot.bottom - plot.top]);
    items.push(rect(
      plot.left + index * slotWidth + 0.75,
      plot.bottom - height,
      slotWidth - 1.5,
      height
    ));
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
    typeof row.Origin === "string" &&
    row.Origin.length > 0
  );
  const histogramRows = cars.filter(row =>
    Number.isFinite(row.Displacement) &&
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

  const scatterDomains = Object.freeze({
    x: Object.freeze(extent(scatterRows.map(row => row.Horsepower))),
    y: Object.freeze(extent(scatterRows.map(row => row.Miles_per_Gallon)))
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
    items: histogramCellItems(series.origin, series.counts, histogramDomains)
  })));

  return Object.freeze({
    origins,
    scatter: Object.freeze({
      ...scatterLayout,
      cells: scatterCells,
      domains: scatterDomains,
      titleItems: titleItems(
        "Horsepower and Fuel Economy",
        "Faceted by Origin",
        scatterLayout.width
      )
    }),
    histogram: Object.freeze({
      ...histogramLayout,
      cells: histogramCells,
      domains: histogramDomains,
      boundaries: histogramBoundariesValue,
      titleItems: titleItems(
        "Displacement Distribution",
        "Faceted by Origin",
        histogramLayout.width
      )
    })
  });
}
