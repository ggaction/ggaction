import { createCarsLineChartValues } from "../reference-values.js";

const LINE_COLOR = "#4c78a8";
const NAMED_DASH_PATTERNS = Object.freeze({
  solid: Object.freeze([]),
  dashed: Object.freeze([6, 4]),
  dotted: Object.freeze([1, 3]),
  dashdot: Object.freeze([6, 3, 1, 3])
});
const DEFAULT_DASH_PATTERNS = Object.freeze([
  Object.freeze([]),
  Object.freeze([8, 4]),
  Object.freeze([3, 3]),
  Object.freeze([12, 4]),
  Object.freeze([8, 3, 2, 3])
]);

function freezeCommands(commands) {
  return Object.freeze(commands.map(command => Object.freeze(command)));
}

function requirePoints(points, label) {
  if (
    !Array.isArray(points) ||
    points.length < 2 ||
    !points.every(point =>
      point !== null &&
      typeof point === "object" &&
      Number.isFinite(point.x) &&
      Number.isFinite(point.y)
    )
  ) {
    throw new TypeError(`${label} requires at least two finite points.`);
  }
  return points;
}

export function createStepReferenceCommands(points) {
  requirePoints(points, "Step reference");
  const commands = [{ op: "M", x: points[0].x, y: points[0].y }];

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const midpoint = (previous.x + current.x) / 2;
    commands.push(
      { op: "L", x: midpoint, y: previous.y },
      { op: "L", x: midpoint, y: current.y },
      { op: "L", x: current.x, y: current.y }
    );
  }

  return freezeCommands(commands);
}

function monotoneTangents(points) {
  const intervals = points.slice(1).map((point, index) => {
    const previous = points[index];
    const width = point.x - previous.x;
    if (!(width > 0)) {
      throw new Error("Monotone reference requires strictly increasing x values.");
    }
    return {
      width,
      slope: (point.y - previous.y) / width
    };
  });
  const tangents = [intervals[0].slope];

  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = intervals[index - 1];
    const next = intervals[index];
    if (previous.slope === 0 || next.slope === 0 ||
        Math.sign(previous.slope) !== Math.sign(next.slope)) {
      tangents.push(0);
      continue;
    }
    const previousWeight = 2 * next.width + previous.width;
    const nextWeight = next.width + 2 * previous.width;
    tangents.push(
      (previousWeight + nextWeight) /
      (previousWeight / previous.slope + nextWeight / next.slope)
    );
  }

  tangents.push(intervals.at(-1).slope);
  return tangents;
}

export function createMonotoneReferenceCommands(points) {
  requirePoints(points, "Monotone reference");
  const tangents = monotoneTangents(points);
  const commands = [{ op: "M", x: points[0].x, y: points[0].y }];

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const third = (current.x - previous.x) / 3;
    commands.push({
      op: "C",
      x1: previous.x + third,
      y1: previous.y + tangents[index - 1] * third,
      x2: current.x - third,
      y2: current.y - tangents[index] * third,
      x: current.x,
      y: current.y
    });
  }

  return freezeCommands(commands);
}

export function createCarsLineCurvePrimitiveValues(
  cars,
  {
    width = 720,
    height = 460,
    margin = { top: 80, right: 170, bottom: 60, left: 80 }
  } = {}
) {
  const baseline = createCarsLineChartValues(cars, { width, height, margin });
  return Object.freeze({
    baseline,
    stepCommands: Object.freeze(
      baseline.series.map(series => createStepReferenceCommands(series.points))
    ),
    monotoneCommands: Object.freeze(
      baseline.series.map(series => createMonotoneReferenceCommands(series.points))
    )
  });
}

function mapValue(value, domain, range) {
  if (domain[0] === domain[1]) return (range[0] + range[1]) / 2;
  return range[0] +
    ((value - domain[0]) / (domain[1] - domain[0])) *
    (range[1] - range[0]);
}

function niceStep(span, count = 5) {
  const rough = span / Math.max(1, count);
  const power = 10 ** Math.floor(Math.log10(rough));
  const fraction = rough / power;
  const factor = fraction <= 1 ? 1 : fraction <= 2 ? 2
    : fraction <= 3 ? 3 : fraction <= 5 ? 5 : 10;
  return factor * power;
}

function niceDomain(values) {
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const step = niceStep(maximum - minimum);
  return Object.freeze([
    Math.floor(minimum / step) * step,
    Math.ceil(maximum / step) * step
  ]);
}

function niceTicks(domain, count = 6) {
  if (domain[0] === domain[1]) return Object.freeze([domain[0]]);
  const step = niceStep(domain[1] - domain[0], count);
  const ticks = [];
  const start = Math.ceil(domain[0] / step) * step;
  const end = Math.floor(domain[1] / step) * step;
  for (let value = start; value <= end + step * 1e-10; value += step) {
    ticks.push(+value.toPrecision(12));
  }
  return Object.freeze(ticks);
}

function linearCommands(points) {
  return freezeCommands(points.map((point, index) => ({
    op: index === 0 ? "M" : "L",
    x: point.x,
    y: point.y
  })));
}

function normalizeSeriesRows(cars, seriesField) {
  if (!Array.isArray(cars)) {
    throw new TypeError("Cars must be an array.");
  }
  return cars.flatMap(row => {
    const time = typeof row.Year === "string" ? Date.parse(row.Year) : NaN;
    const key = seriesField === undefined ? "all" : row[seriesField];
    const nominal = typeof key === "string" || typeof key === "boolean" ||
      (typeof key === "number" && Number.isFinite(key));
    return Number.isFinite(time) && Number.isFinite(row.Acceleration) && nominal
      ? [{ row, time, key }]
      : [];
  });
}

function createSeriesValues(
  cars,
  {
    seriesField,
    includeKeys,
    dashPatterns,
    constantDash,
    width = 720,
    height = 460,
    margin = { top: 80, right: 170, bottom: 60, left: 80 }
  } = {}
) {
  let rows = normalizeSeriesRows(cars, seriesField);
  if (includeKeys !== undefined) {
    const allowed = new Set(includeKeys);
    rows = rows.filter(item => allowed.has(item.key));
  }
  if (rows.length === 0) {
    throw new Error("Line-series primitive requires valid rows.");
  }

  const groups = new Map();
  for (const item of rows) {
    const id = JSON.stringify([item.key, item.time]);
    const group = groups.get(id) ?? {
      key: item.key,
      time: item.time,
      sum: 0,
      count: 0
    };
    group.sum += item.row.Acceleration;
    group.count += 1;
    groups.set(id, group);
  }

  const aggregates = [...groups.values()].map(group => ({
    key: group.key,
    time: group.time,
    value: group.sum / group.count
  }));
  const keys = [...new Set(rows.map(item => item.key))];
  const xDomain = Object.freeze([
    Math.min(...aggregates.map(item => item.time)),
    Math.max(...aggregates.map(item => item.time))
  ]);
  const yDomain = niceDomain(aggregates.map(item => item.value));
  const xRange = Object.freeze([margin.left, width - margin.right]);
  const yRange = Object.freeze([height - margin.bottom, margin.top]);
  const series = keys.map((key, index) => {
    const values = aggregates
      .filter(item => item.key === key)
      .sort((left, right) => left.time - right.time);
    const points = values.map(item => Object.freeze({
      x: mapValue(item.time, xDomain, xRange),
      y: mapValue(item.value, yDomain, yRange)
    }));
    const strokeDash = constantDash ?? dashPatterns?.[index % dashPatterns.length] ?? [];
    return Object.freeze({
      key,
      values: Object.freeze(values),
      points: Object.freeze(points),
      commands: linearCommands(points),
      stroke: LINE_COLOR,
      strokeWidth: 2,
      strokeDash: Object.freeze([...strokeDash])
    });
  });
  if (series.some(item => item.points.length < 2)) {
    throw new Error("Every line-series primitive requires at least two points.");
  }

  const legendY = Object.freeze(keys.map((_, index) => 132 + index * 28));
  return Object.freeze({
    validCars: Object.freeze(rows.map(item => item.row)),
    keys: Object.freeze(keys),
    series: Object.freeze(series),
    scales: Object.freeze({
      x: Object.freeze({ domain: xDomain, range: xRange }),
      y: Object.freeze({ domain: yDomain, range: yRange })
    }),
    legend: Object.freeze({
      x1: 580,
      x2: 612,
      labelX: 622,
      titleX: 580,
      titleY: 100,
      itemY: legendY
    })
  });
}

export function createNamedDashPrimitiveValues(cars) {
  const cylinderOrder = [
    ...new Set(normalizeSeriesRows(cars, "Cylinders").map(item => item.key))
  ].slice(0, 4);
  return createSeriesValues(cars, {
    seriesField: "Cylinders",
    includeKeys: cylinderOrder,
    dashPatterns: Object.values(NAMED_DASH_PATTERNS)
  });
}

export function createConstantDashPrimitiveValues(cars) {
  return createSeriesValues(cars, {
    constantDash: NAMED_DASH_PATTERNS.dotted
  });
}

export function createGroupReassignmentPrimitiveValues(cars) {
  return createSeriesValues(cars, { seriesField: "Cylinders" });
}

export function createDashReassignmentPrimitiveValues(cars) {
  return createSeriesValues(cars, {
    seriesField: "Cylinders",
    dashPatterns: DEFAULT_DASH_PATTERNS
  });
}

function quantileReference(values, probability) {
  const sorted = [...values].sort((left, right) => left - right);
  const position = (sorted.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

function aggregateGroup(items, aggregate) {
  const values = items.map(item => item.row.Acceleration);
  if (aggregate === "median") return quantileReference(values, 0.5);
  if (aggregate === "stdev") {
    if (values.length < 2) return undefined;
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance = values.reduce(
      (sum, value) => sum + (value - mean) ** 2,
      0
    ) / (values.length - 1);
    return Math.sqrt(variance);
  }
  if (aggregate?.op === "quantile") {
    return quantileReference(values, aggregate.probability);
  }
  if (aggregate?.op === "first") {
    const direction = aggregate.order === "descending" ? -1 : 1;
    const ordered = items
      .filter(item => Number.isFinite(item.row[aggregate.orderBy]))
      .sort((left, right) =>
        direction * (left.row[aggregate.orderBy] - right.row[aggregate.orderBy]) ||
        left.sourceIndex - right.sourceIndex
      );
    return ordered[0]?.row.Acceleration;
  }
  throw new Error("Unknown aggregate primitive reference.");
}

function aggregateTitle(aggregate) {
  if (typeof aggregate === "string") return `${aggregate}(Acceleration)`;
  if (aggregate.op === "quantile") {
    return `quantile(Acceleration, ${aggregate.probability})`;
  }
  return `${aggregate.op}(Acceleration, ${aggregate.orderBy} ${aggregate.order ?? "ascending"})`;
}

export function createAggregatePrimitiveValues(
  cars,
  aggregate,
  {
    width = 720,
    height = 460,
    margin = { top: 80, right: 170, bottom: 60, left: 80 }
  } = {}
) {
  const baseline = createCarsLineChartValues(cars, { width, height, margin });
  const normalized = baseline.validCars.map((row, sourceIndex) => ({
    row,
    sourceIndex,
    time: Date.parse(row.Year),
    year: new Date(Date.parse(row.Year)).getUTCFullYear()
  }));
  const groups = new Map();
  for (const item of normalized) {
    const id = JSON.stringify([item.row.Origin, item.time]);
    const group = groups.get(id) ?? [];
    group.push(item);
    groups.set(id, group);
  }
  const aggregates = [...groups.values()].flatMap(items => {
    const value = aggregateGroup(items, aggregate);
    return Number.isFinite(value)
      ? [Object.freeze({
          origin: items[0].row.Origin,
          time: items[0].time,
          year: items[0].year,
          value
        })]
      : [];
  });
  if (aggregates.length === 0) {
    throw new Error("Aggregate primitive requires at least one complete group.");
  }

  const yDomain = niceDomain(aggregates.map(item => item.value));
  const yRange = Object.freeze([height - margin.bottom, margin.top]);
  const yTicks = niceTicks(yDomain).map(value => Object.freeze({
    value,
    position: mapValue(value, yDomain, yRange),
    label: String(value)
  }));
  const series = baseline.origins.flatMap(origin => {
    const values = aggregates
      .filter(item => item.origin === origin)
      .sort((left, right) => left.time - right.time);
    if (values.length < 2) return [];
    const baselineSeries = baseline.series.find(item => item.origin === origin);
    return [Object.freeze({
      origin,
      color: baselineSeries.color,
      strokeDash: baselineSeries.strokeDash,
      values: Object.freeze(values),
      points: Object.freeze(values.map(item => Object.freeze({
        x: mapValue(item.time, baseline.scales.x.domain, baseline.scales.x.range),
        y: mapValue(item.value, yDomain, yRange)
      })))
    })];
  });

  return Object.freeze({
    ...baseline,
    aggregates: Object.freeze(aggregates),
    series: Object.freeze(series),
    scales: Object.freeze({
      ...baseline.scales,
      y: Object.freeze({ domain: yDomain, range: yRange })
    }),
    axes: Object.freeze({
      ...baseline.axes,
      y: Object.freeze({
        ...baseline.axes.y,
        ticks: Object.freeze(yTicks),
        title: Object.freeze({
          ...baseline.axes.y.title,
          text: aggregateTitle(aggregate)
        })
      })
    })
  });
}

export function createMedianPrimitiveValues(cars) {
  return createAggregatePrimitiveValues(cars, "median");
}

export function createDispersionPrimitiveValues(cars) {
  return createAggregatePrimitiveValues(cars, "stdev");
}

export function createQuantilePrimitiveValues(cars) {
  return createAggregatePrimitiveValues(cars, {
    op: "quantile",
    probability: 0.75
  });
}

export function createOrderedPrimitiveValues(cars) {
  return createAggregatePrimitiveValues(cars, {
    op: "first",
    orderBy: "Horsepower"
  });
}

const COMPOSITE_SYMBOL = Object.freeze({
  lineLength: 36,
  lineWidth: 3,
  pointRadius: 5,
  pointStroke: "white",
  pointStrokeWidth: 1,
  labelOffset: 10,
  itemGap: 18
});

function compositeCells(count, columns, direction) {
  const columnCount = Math.min(columns, count);
  const rowCount = Math.ceil(count / columnCount);
  return Object.freeze(Array.from({ length: count }, (_, index) =>
    direction === "horizontal"
      ? Object.freeze({
          column: index % columnCount,
          row: Math.floor(index / columnCount)
        })
      : Object.freeze({
          column: Math.floor(index / rowCount),
          row: index % rowCount
        })
  ));
}

function alignedStart(bounds, width, align) {
  if (align === "left") return bounds.x;
  if (align === "right") return bounds.x + bounds.width - width;
  return bounds.x + (bounds.width - width) / 2;
}

function createCompositeLegendLayout(baseline, canvas, config) {
  const labels = baseline.origins.map(String);
  const cells = compositeCells(labels.length, config.columns, config.direction);
  const columnCount = Math.max(...cells.map(cell => cell.column)) + 1;
  const rowCount = Math.max(...cells.map(cell => cell.row)) + 1;
  const itemWidths = labels.map(label =>
    COMPOSITE_SYMBOL.lineLength + COMPOSITE_SYMBOL.labelOffset + label.length * 7
  );
  const columnWidths = Array.from({ length: columnCount }, (_, column) =>
    Math.max(...cells.map((cell, index) =>
      cell.column === column ? itemWidths[index] : 0
    ))
  );
  const rowHeight = 12;
  const gridWidth = columnWidths.reduce((sum, value) => sum + value, 0) +
    COMPOSITE_SYMBOL.itemGap * Math.max(0, columnCount - 1);
  const gridHeight = rowHeight * rowCount +
    COMPOSITE_SYMBOL.itemGap * Math.max(0, rowCount - 1);
  const titleWidth = 6 * 7;
  const titleGap = config.titlePosition === "left" ? 20 : 12;
  const totalWidth = config.titlePosition === "left"
    ? titleWidth + titleGap + gridWidth
    : Math.max(titleWidth, gridWidth);
  const start = alignedStart(baseline.bounds, totalWidth, config.align);
  const gridStart = config.titlePosition === "left"
    ? start + titleWidth + titleGap
    : start + (totalWidth - gridWidth) / 2;
  let gridTop;
  let blockTop;
  let blockBottom;
  let titleX;
  let titleY;

  if (config.position === "top") {
    blockBottom = baseline.bounds.y - config.offset;
    gridTop = blockBottom - gridHeight;
    blockTop = gridTop;
    titleX = start;
    titleY = gridTop + gridHeight / 2;
  } else {
    blockTop = baseline.bounds.y + baseline.bounds.height + config.offset;
    titleX = start + totalWidth / 2;
    titleY = blockTop + 13 / 2;
    gridTop = blockTop + 13 + titleGap;
    blockBottom = gridTop + gridHeight;
  }

  const columnX = [];
  let cursor = gridStart;
  for (const width of columnWidths) {
    columnX.push(cursor);
    cursor += width + COMPOSITE_SYMBOL.itemGap;
  }
  const items = cells.map((cell, index) => {
    const x1 = columnX[cell.column];
    const y = gridTop + rowHeight / 2 +
      cell.row * (rowHeight + COMPOSITE_SYMBOL.itemGap);
    return Object.freeze({
      origin: baseline.origins[index],
      color: baseline.series[index].color,
      strokeDash: baseline.series[index].strokeDash,
      x1,
      x2: x1 + COMPOSITE_SYMBOL.lineLength,
      pointX: x1 + COMPOSITE_SYMBOL.lineLength / 2,
      y,
      labelX: x1 + COMPOSITE_SYMBOL.lineLength +
        COMPOSITE_SYMBOL.labelOffset
    });
  });
  const padding = 10;
  const background = Object.freeze({
    x: start - padding,
    y: blockTop - padding,
    width: totalWidth + padding * 2,
    height: blockBottom - blockTop + padding * 2,
    fill: config.position === "top" ? "white" : "#f8fafc",
    stroke: "#94a3b8",
    strokeWidth: 1
  });
  const backgroundBottom = background.y + background.height;
  const titleBottom = baseline.title.subtitleY + 14 / 2;
  const xAxisTitleBottom = baseline.axes.x.title.y + 13 / 2;
  if (
    background.x < 0 ||
    background.x + background.width > canvas.width
  ) {
    throw new Error("Composite legend requires more horizontal Canvas space.");
  }
  if (config.position === "top" &&
      (background.y <= titleBottom || backgroundBottom > baseline.bounds.y)) {
    throw new Error("Composite legend requires more top-margin space.");
  }
  if (config.position === "bottom" &&
      (background.y <= xAxisTitleBottom || backgroundBottom > canvas.height)) {
    throw new Error("Composite legend requires more bottom-margin space.");
  }

  return Object.freeze({
    position: config.position,
    align: config.align,
    direction: config.direction,
    columns: config.columns,
    offset: config.offset,
    titlePosition: config.titlePosition,
    symbol: COMPOSITE_SYMBOL,
    title: Object.freeze({ x: titleX, y: titleY, text: "Origin" }),
    items: Object.freeze(items),
    background,
    occupiedBounds: background
  });
}

export function createCompositeLegendPrimitiveValues(
  cars,
  {
    position,
    width = 720,
    height = position === "top" ? 520 : 560,
    margin = position === "top"
      ? { top: 170, right: 40, bottom: 60, left: 80 }
      : { top: 80, right: 40, bottom: 160, left: 80 }
  } = {}
) {
  if (!["top", "bottom"].includes(position)) {
    throw new Error('Composite legend position must be "top" or "bottom".');
  }
  const baseline = createCarsLineChartValues(cars, { width, height, margin });
  const axes = {
    ...baseline.axes,
    x: {
      ...baseline.axes.x,
      title: {
        ...baseline.axes.x.title,
        y: baseline.bounds.y + baseline.bounds.height + 42
      }
    }
  };
  const adjusted = { ...baseline, axes };
  const canvas = Object.freeze({ width, height, margin: Object.freeze({ ...margin }) });
  const config = position === "top"
    ? {
        position,
        align: "center",
        direction: "vertical",
        columns: 2,
        offset: 10,
        titlePosition: "left"
      }
    : {
        position,
        align: "right",
        direction: "horizontal",
        columns: 2,
        offset: 70,
        titlePosition: "top"
      };
  const legend = createCompositeLegendLayout(adjusted, canvas, config);

  return Object.freeze({
    ...adjusted,
    canvas,
    axes: Object.freeze({
      x: Object.freeze({
        ...axes.x,
        title: Object.freeze(axes.x.title)
      }),
      y: Object.freeze(axes.y)
    }),
    legend
  });
}

export { DEFAULT_DASH_PATTERNS, NAMED_DASH_PATTERNS };
