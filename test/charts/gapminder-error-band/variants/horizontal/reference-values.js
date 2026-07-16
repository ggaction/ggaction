import { createMeanConfidenceIntervalReference } from
  "../../../../support/interval-reference.js";

export const CARS_HORIZONTAL_LAYOUT = Object.freeze({
  width: 760,
  height: 480,
  margin: Object.freeze({ top: 90, right: 50, bottom: 70, left: 80 })
});

export const CARS_HORIZONTAL_FIELDS = Object.freeze({
  center: "__errorBand_center",
  lower: "__errorBand_lower",
  upper: "__errorBand_upper"
});

export const CARS_HORIZONTAL_STYLE = Object.freeze({
  fill: "#4c78a8",
  opacity: 0.2,
  boundaryStroke: "#355f8a",
  boundaryStrokeWidth: 1.5
});

const T_975 = new Map([
  [1, 12.706204736432095],
  [26, 2.055529438642871],
  [27, 2.0518305164802833],
  [28, 2.048407141795244],
  [29, 2.0452296421327034],
  [33, 2.034515297449338],
  [34, 2.032244509317718],
  [35, 2.0301079282503425],
  [39, 2.0226909200367604],
  [60, 2.00029782201426]
]);

function stableNumber(value) {
  return Number(value.toFixed(12));
}

function criticalValue(degreesOfFreedom, confidence) {
  if (confidence !== 0.95 || !T_975.has(degreesOfFreedom)) {
    throw new Error(
      `Missing independent 95% Student-t value for df=${degreesOfFreedom}.`
    );
  }
  return T_975.get(degreesOfFreedom);
}

function parseIsoDate(value) {
  if (typeof value !== "string") return NaN;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match === null) return NaN;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const time = Date.UTC(year, month - 1, day);
  const date = new Date(time);
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? time
    : NaN;
}

function normalizeCars(cars) {
  if (!Array.isArray(cars)) throw new TypeError("Cars must be an array.");
  return cars.flatMap(row => {
    if (row === null || typeof row !== "object" || Array.isArray(row)) return [];
    const time = parseIsoDate(row.Year);
    if (!Number.isFinite(time) || !Number.isFinite(row.Acceleration)) return [];
    return [{ row, time }];
  });
}

function requireBounds({ width, height, margin }) {
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    throw new TypeError("Horizontal error-band layout requires finite dimensions.");
  }
  if (
    margin === null ||
    typeof margin !== "object" ||
    ![margin.top, margin.right, margin.bottom, margin.left].every(Number.isFinite)
  ) {
    throw new TypeError("Horizontal error-band layout requires four finite margins.");
  }
  const bounds = {
    x: margin.left,
    y: margin.top,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom
  };
  if (bounds.width <= 0 || bounds.height <= 0) {
    throw new RangeError("Horizontal error-band plot region must be positive.");
  }
  return bounds;
}

function niceStep(span, count = 5) {
  const rough = span / Math.max(1, count);
  const power = 10 ** Math.floor(Math.log10(rough));
  const fraction = rough / power;
  const factor = [1, 2, 3, 5, 10].find(candidate => candidate >= fraction);
  return factor * power;
}

function niceDomain(values) {
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const step = niceStep(maximum - minimum);
  return Object.freeze([
    Number((Math.floor(minimum / step) * step).toPrecision(12)),
    Number((Math.ceil(maximum / step) * step).toPrecision(12))
  ]);
}

function numericTicks(domain, count = 5) {
  const step = niceStep(domain[1] - domain[0], count);
  const tolerance = step * 1e-10;
  const ticks = [];
  for (
    let value = Math.ceil((domain[0] - tolerance) / step) * step;
    value <= domain[1] + tolerance;
    value += step
  ) {
    ticks.push(Number(value.toPrecision(12)));
  }
  return ticks;
}

function yearTicks(minimumTime, maximumTime) {
  const minimum = new Date(minimumTime).getUTCFullYear();
  const maximum = new Date(maximumTime).getUTCFullYear();
  const step = maximum - minimum > 8 ? 2 : 1;
  const ticks = [];
  for (let year = Math.ceil(minimum / step) * step; year <= maximum; year += step) {
    ticks.push(Date.UTC(year, 0, 1));
  }
  return ticks;
}

function mapLinear(value, domain, range) {
  if (domain[0] === domain[1]) return (range[0] + range[1]) / 2;
  const ratio = (value - domain[0]) / (domain[1] - domain[0]);
  return range[0] + ratio * (range[1] - range[0]);
}

function freezeRows(rows) {
  return Object.freeze(rows.map(row => Object.freeze(row)));
}

export function createCarsHorizontalErrorBandReferenceValues(cars, {
  width = CARS_HORIZONTAL_LAYOUT.width,
  height = CARS_HORIZONTAL_LAYOUT.height,
  margin = CARS_HORIZONTAL_LAYOUT.margin
} = {}) {
  const normalized = normalizeCars(cars);
  if (normalized.length === 0) {
    throw new Error("Horizontal error band requires at least one valid car row.");
  }
  const bounds = requireBounds({ width, height, margin });
  const intervals = createMeanConfidenceIntervalReference(
    normalized.map(item => item.row),
    {
      field: "Acceleration",
      groupBy: "Year",
      confidence: 0.95,
      criticalValue
    }
  );
  const rows = freezeRows(intervals.map(interval => ({
    Year: interval.Year,
    [CARS_HORIZONTAL_FIELDS.center]: stableNumber(interval.mean),
    [CARS_HORIZONTAL_FIELDS.lower]: stableNumber(interval.lower),
    [CARS_HORIZONTAL_FIELDS.upper]: stableNumber(interval.upper)
  })));
  const ordered = freezeRows(rows.map(row => ({
    ...row,
    time: parseIsoDate(row.Year)
  })).sort((left, right) => left.time - right.time));
  const times = ordered.map(row => row.time);
  const xDomain = niceDomain(rows.flatMap(row => [
    row[CARS_HORIZONTAL_FIELDS.lower],
    row[CARS_HORIZONTAL_FIELDS.upper]
  ]));
  const yDomain = Object.freeze([Math.min(...times), Math.max(...times)]);
  const xRange = Object.freeze([bounds.x, bounds.x + bounds.width]);
  const yRange = Object.freeze([bounds.y + bounds.height, bounds.y]);
  const lowerPoints = freezeRows(ordered.map(row => ({
    x: mapLinear(row[CARS_HORIZONTAL_FIELDS.lower], xDomain, xRange),
    y: mapLinear(row.time, yDomain, yRange)
  })));
  const upperPoints = freezeRows(ordered.map(row => ({
    x: mapLinear(row[CARS_HORIZONTAL_FIELDS.upper], xDomain, xRange),
    y: mapLinear(row.time, yDomain, yRange)
  })));
  const bandPoints = freezeRows([
    ...lowerPoints,
    ...[...upperPoints].reverse()
  ]);
  const xTicks = Object.freeze(numericTicks(xDomain).map(value => Object.freeze({
    value,
    position: mapLinear(value, xDomain, xRange),
    label: String(value)
  })));
  const yTicks = Object.freeze(yearTicks(...yDomain).map(value => Object.freeze({
    value,
    position: mapLinear(value, yDomain, yRange),
    label: String(new Date(value).getUTCFullYear())
  })));
  const transform = Object.freeze({
    type: "interval",
    field: "Acceleration",
    groupBy: Object.freeze(["Year"]),
    center: "mean",
    extent: "ci",
    level: 0.95,
    as: CARS_HORIZONTAL_FIELDS
  });

  return Object.freeze({
    validCars: freezeRows(normalized.map(item => structuredClone(item.row))),
    normalizedTimes: Object.freeze(normalized.map(item => item.time)),
    transform,
    intervals: freezeRows(intervals),
    rows,
    ordered,
    bounds: Object.freeze(bounds),
    scales: Object.freeze({
      x: Object.freeze({ domain: xDomain, range: xRange }),
      y: Object.freeze({ domain: yDomain, range: yRange })
    }),
    band: Object.freeze({
      points: bandPoints,
      fill: CARS_HORIZONTAL_STYLE.fill,
      opacity: CARS_HORIZONTAL_STYLE.opacity
    }),
    boundaries: Object.freeze({
      lower: Object.freeze({
        points: lowerPoints,
        stroke: CARS_HORIZONTAL_STYLE.boundaryStroke,
        strokeWidth: CARS_HORIZONTAL_STYLE.boundaryStrokeWidth
      }),
      upper: Object.freeze({
        points: upperPoints,
        stroke: CARS_HORIZONTAL_STYLE.boundaryStroke,
        strokeWidth: CARS_HORIZONTAL_STYLE.boundaryStrokeWidth
      })
    }),
    grid: Object.freeze({
      horizontal: Object.freeze([]),
      vertical: freezeRows(xTicks.map(tick => ({
        x1: tick.position,
        y1: bounds.y,
        x2: tick.position,
        y2: bounds.y + bounds.height
      })))
    }),
    axes: Object.freeze({
      x: Object.freeze({
        line: Object.freeze({
          x1: bounds.x,
          y1: bounds.y + bounds.height,
          x2: bounds.x + bounds.width,
          y2: bounds.y + bounds.height
        }),
        ticks: xTicks,
        title: Object.freeze({
          x: bounds.x + bounds.width / 2,
          y: height - 28,
          text: "mean(Acceleration)"
        })
      }),
      y: Object.freeze({
        line: Object.freeze({
          x1: bounds.x,
          y1: bounds.y + bounds.height,
          x2: bounds.x,
          y2: bounds.y
        }),
        ticks: yTicks,
        title: Object.freeze({
          x: 28,
          y: bounds.y + bounds.height / 2,
          text: "Year",
          rotation: -Math.PI / 2
        })
      })
    }),
    title: Object.freeze({
      x: bounds.x,
      titleY: 27,
      subtitleY: 53,
      text: "Acceleration over Time",
      subtitle: "Mean and 95% confidence interval across cars"
    })
  });
}
