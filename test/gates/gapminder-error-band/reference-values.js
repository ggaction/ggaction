import { createMeanConfidenceIntervalReference } from
  "../../support/interval-reference.js";

export const ERROR_BAND_LAYOUT = Object.freeze({
  width: 760,
  height: 480,
  margin: Object.freeze({ top: 90, right: 150, bottom: 70, left: 80 })
});

export const ERROR_BAND_FIELDS = Object.freeze({
  center: "__errorBand_center",
  lower: "__errorBand_lower",
  upper: "__errorBand_upper"
});

export const ERROR_BAND_COLORS = Object.freeze([
  "#4c78a8",
  "#f58518",
  "#e45756",
  "#72b7b2",
  "#54a24b",
  "#eeca3b"
]);

const T_975 = new Map([
  [3, 3.182446305284263],
  [5, 2.570581835636314],
  [8, 2.306004135204166],
  [18, 2.10092204024096],
  [19, 2.093024054408263]
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

function requireLayout({ width, height, margin }) {
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    throw new TypeError("Error-band layout requires finite dimensions.");
  }
  if (
    margin === null ||
    typeof margin !== "object" ||
    ![margin.top, margin.right, margin.bottom, margin.left].every(Number.isFinite)
  ) {
    throw new TypeError("Error-band layout requires four finite margins.");
  }
  const bounds = {
    x: margin.left,
    y: margin.top,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom
  };
  if (bounds.width <= 0 || bounds.height <= 0) {
    throw new RangeError("Error-band layout requires a positive plot region.");
  }
  return bounds;
}

function normalizeGapminder(gapminder) {
  if (!Array.isArray(gapminder)) {
    throw new TypeError("Gapminder must be an array.");
  }
  return gapminder.flatMap(row => {
    if (row === null || typeof row !== "object" || Array.isArray(row)) return [];
    const time = Number.isInteger(row.year) && row.year >= 0 && row.year <= 9999
      ? Date.UTC(row.year, 0, 1)
      : NaN;
    if (
      !Number.isFinite(time) ||
      !Number.isFinite(row.life_expect) ||
      !Number.isFinite(row.cluster)
    ) {
      return [];
    }
    return [{ row, time, year: new Date(time).getUTCFullYear() }];
  });
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
  return [
    Number((Math.floor(minimum / step) * step).toPrecision(12)),
    Number((Math.ceil(maximum / step) * step).toPrecision(12))
  ];
}

function ticksForDomain(domain, count = 5) {
  const step = niceStep(domain[1] - domain[0], count);
  const tolerance = step * 1e-10;
  const start = Math.ceil((domain[0] - tolerance) / step) * step;
  const stop = Math.floor((domain[1] + tolerance) / step) * step;
  const ticks = [];
  for (let value = start; value <= stop + tolerance; value += step) {
    ticks.push(Number(value.toPrecision(12)));
  }
  return ticks;
}

function yearTicks(minimum, maximum) {
  const step = maximum - minimum >= 20 ? 10 : maximum - minimum > 8 ? 2 : 1;
  const start = Math.ceil(minimum / step) * step;
  const ticks = [];
  for (let year = start; year <= maximum; year += step) ticks.push(year);
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

export function createGapminderErrorBandReferenceValues(gapminder, {
  width = ERROR_BAND_LAYOUT.width,
  height = ERROR_BAND_LAYOUT.height,
  margin = ERROR_BAND_LAYOUT.margin
} = {}) {
  const normalized = normalizeGapminder(gapminder);
  if (normalized.length === 0) {
    throw new Error("Error band requires at least one valid gapminder row.");
  }
  const bounds = requireLayout({ width, height, margin });
  const intervals = createMeanConfidenceIntervalReference(
    normalized.map(item => item.row),
    {
      field: "life_expect",
      groupBy: ["year", "cluster"],
      confidence: 0.95,
      criticalValue
    }
  );
  const rows = freezeRows(intervals.map(interval => ({
    year: interval.year,
    cluster: interval.cluster,
    [ERROR_BAND_FIELDS.center]: stableNumber(interval.mean),
    [ERROR_BAND_FIELDS.lower]: stableNumber(interval.lower),
    [ERROR_BAND_FIELDS.upper]: stableNumber(interval.upper)
  })));
  const clusters = Object.freeze([
    ...new Set(normalized.map(item => item.row.cluster))
  ]);
  const times = rows.map(row => Date.UTC(row.year, 0, 1));
  const years = times.map(time => new Date(time).getUTCFullYear());
  const xDomain = Object.freeze([Math.min(...times), Math.max(...times)]);
  const yDomain = Object.freeze(niceDomain(rows.flatMap(row => [
    row[ERROR_BAND_FIELDS.lower],
    row[ERROR_BAND_FIELDS.upper]
  ])));
  const xRange = Object.freeze([bounds.x, bounds.x + bounds.width]);
  const yRange = Object.freeze([bounds.y + bounds.height, bounds.y]);
  const series = Object.freeze(clusters.map((cluster, index) => {
    const values = rows
      .filter(row => row.cluster === cluster)
      .map(row => ({ ...row, time: Date.UTC(row.year, 0, 1) }))
      .sort((left, right) => left.time - right.time);
    const lower = values.map(row => ({
      x: mapLinear(row.time, xDomain, xRange),
      y: mapLinear(row[ERROR_BAND_FIELDS.lower], yDomain, yRange)
    }));
    const upper = [...values].reverse().map(row => ({
      x: mapLinear(row.time, xDomain, xRange),
      y: mapLinear(row[ERROR_BAND_FIELDS.upper], yDomain, yRange)
    }));
    return Object.freeze({
      cluster,
      color: ERROR_BAND_COLORS[index % ERROR_BAND_COLORS.length],
      opacity: 0.2,
      values: freezeRows(values),
      points: freezeRows([...lower, ...upper])
    });
  }));
  const xTicks = Object.freeze(yearTicks(
    Math.min(...years),
    Math.max(...years)
  ).map(year => {
    const value = Date.UTC(year, 0, 1);
    return Object.freeze({
      value,
      position: mapLinear(value, xDomain, xRange),
      label: String(year)
    });
  }));
  const yTicks = Object.freeze(ticksForDomain(yDomain).map(value =>
    Object.freeze({
      value,
      position: mapLinear(value, yDomain, yRange),
      label: String(value)
    })
  ));
  const legendSymbolX = bounds.x + bounds.width + 30;
  const legendItems = Object.freeze(clusters.map((cluster, index) => {
    const centerY = bounds.y + 52 + index * 28;
    return Object.freeze({
      cluster,
      color: ERROR_BAND_COLORS[index],
      x: legendSymbolX,
      y: centerY - 6,
      width: 14,
      height: 12,
      labelX: legendSymbolX + 22,
      labelY: centerY
    });
  }));
  const transform = Object.freeze({
    type: "interval",
    field: "life_expect",
    groupBy: Object.freeze(["year", "cluster"]),
    center: "mean",
    extent: "ci",
    level: 0.95,
    as: ERROR_BAND_FIELDS
  });

  return Object.freeze({
    validGapminder: freezeRows(normalized.map(item => structuredClone(item.row))),
    transform,
    rows,
    intervals: freezeRows(intervals),
    clusters,
    bounds: Object.freeze(bounds),
    scales: Object.freeze({
      x: Object.freeze({ domain: xDomain, range: xRange }),
      y: Object.freeze({ domain: yDomain, range: yRange }),
      color: Object.freeze({
        domain: clusters,
        range: ERROR_BAND_COLORS.slice(0, clusters.length)
      })
    }),
    series,
    grid: Object.freeze({
      horizontal: Object.freeze(yTicks.map(tick => Object.freeze({
        x1: bounds.x,
        y1: tick.position,
        x2: bounds.x + bounds.width,
        y2: tick.position
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
          text: "year"
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
          text: "mean(life_expect)",
          rotation: -Math.PI / 2
        })
      })
    }),
    legend: Object.freeze({
      title: Object.freeze({
        x: legendSymbolX,
        y: bounds.y + 20,
        text: "cluster"
      }),
      items: legendItems
    }),
    title: Object.freeze({
      x: bounds.x,
      titleY: 27,
      subtitleY: 53,
      text: "Life Expectancy by Cluster",
      subtitle: "Mean and 95% confidence interval"
    })
  });
}
