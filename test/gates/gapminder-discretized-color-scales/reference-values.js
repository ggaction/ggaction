import {
  createGapminderTransformedScaleValues
} from "../../charts/gapminder-transformed-scales/reference-values.js";

export const DISCRETIZED_COLOR_TYPES = Object.freeze([
  "quantize",
  "quantile",
  "threshold"
]);

export const DISCRETIZED_COLORS = Object.freeze([
  "#440154",
  "#3b528b",
  "#21918c",
  "#5ec962",
  "#fde725"
]);

export const DISCRETIZED_COLOR_LAYOUT = Object.freeze({
  width: 480,
  height: 312,
  margin: Object.freeze({
    top: 57.6,
    right: 114,
    bottom: 43.2,
    left: 50.4
  })
});

const FIXED_THRESHOLDS = Object.freeze([60, 70, 75, 80]);

function quantile(sorted, probability) {
  const position = (sorted.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return sorted[lower] + (sorted[upper] - sorted[lower]) *
    (position - lower);
}

function quantizeThresholds(values, count) {
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  return Array.from(
    { length: count - 1 },
    (_, index) => minimum + (index + 1) / count * (maximum - minimum)
  );
}

function quantileThresholds(values, count) {
  const sorted = [...values].sort((left, right) => left - right);
  return Array.from(
    { length: count - 1 },
    (_, index) => quantile(sorted, (index + 1) / count)
  );
}

function classIndex(value, thresholds) {
  let index = 0;
  while (index < thresholds.length && value >= thresholds[index]) index += 1;
  return index;
}

function formatBoundary(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function intervalLabels(thresholds) {
  return Object.freeze([
    `< ${formatBoundary(thresholds[0])}`,
    ...thresholds.slice(0, -1).map((value, index) =>
      `${formatBoundary(value)}–${formatBoundary(thresholds[index + 1])}`
    ),
    `≥ ${formatBoundary(thresholds.at(-1))}`
  ]);
}

function titleFor(type) {
  return {
    quantize: Object.freeze({
      text: "Life Expectancy: Equal Intervals",
      subtitle: "Gapminder countries in 2005 · quantize color classes"
    }),
    quantile: Object.freeze({
      text: "Life Expectancy: Equal Counts",
      subtitle: "Gapminder countries in 2005 · quantile color classes"
    }),
    threshold: Object.freeze({
      text: "Life Expectancy: Fixed Thresholds",
      subtitle: "Gapminder countries in 2005 · threshold color classes"
    })
  }[type];
}

export function createDiscretizedColorReference(gapminder, type) {
  if (!DISCRETIZED_COLOR_TYPES.includes(type)) {
    throw new Error(`Unsupported discretized color reference type "${type}".`);
  }
  const base = createGapminderTransformedScaleValues(gapminder);
  const samples = base.rows.map(row => row.life_expect);
  const thresholds = Object.freeze(
    type === "quantize"
      ? quantizeThresholds(samples, DISCRETIZED_COLORS.length)
      : type === "quantile"
        ? quantileThresholds(samples, DISCRETIZED_COLORS.length)
        : [...FIXED_THRESHOLDS]
  );
  const itemY = Object.freeze(Array.from(
    { length: DISCRETIZED_COLORS.length },
    (_, index) => base.bounds.top + 52 + index * 28
  ));
  const symbolX = base.bounds.right + 30;
  const points = Object.freeze(base.points.map((point, index) => Object.freeze({
    x: point.x,
    y: point.y,
    fill: DISCRETIZED_COLORS[classIndex(samples[index], thresholds)]
  })));

  return Object.freeze({
    type,
    rows: base.rows,
    bounds: base.bounds,
    axes: base.axes,
    domains: Object.freeze({
      x: base.domains.x,
      y: base.domains.y,
      color: type === "threshold" ? thresholds : "auto"
    }),
    thresholds,
    colors: DISCRETIZED_COLORS,
    points,
    title: titleFor(type),
    legend: Object.freeze({
      labels: intervalLabels(thresholds),
      symbolX,
      itemY,
      labelX: symbolX + 14 + 8,
      titleX: symbolX,
      titleY: base.bounds.top + 20
    })
  });
}
