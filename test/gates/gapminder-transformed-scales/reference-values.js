const VIRIDIS = Object.freeze([
  "#440154", "#470e61", "#481a6c", "#482575", "#472f7d",
  "#443a83", "#414487", "#3d4e8a", "#39568c", "#35608d",
  "#31688e", "#2d708e", "#2a788e", "#27818e", "#23888e",
  "#21918d", "#1f988b", "#1fa088", "#22a884", "#2ab07f",
  "#35b779", "#43bf71", "#54c568", "#66cc5d", "#7ad151",
  "#8fd744", "#a5db36", "#bcdf27", "#d2e21b", "#e9e51a",
  "#fde725"
]);

export const TRANSFORMED_SCATTER_LAYOUT = Object.freeze({
  width: 760,
  height: 520,
  margin: Object.freeze({ top: 96, right: 150, bottom: 72, left: 84 })
});

function parseHex(value) {
  return [1, 3, 5].map(offset => Number.parseInt(value.slice(offset, offset + 2), 16));
}

function toHex(value) {
  return Math.round(value).toString(16).padStart(2, "0");
}

function interpolateColor(left, right, ratio) {
  const start = parseHex(left);
  const end = parseHex(right);
  return `#${start.map((value, index) =>
    toHex(value + (end[index] - value) * ratio)
  ).join("")}`;
}

function samplePalette(ratio) {
  const clamped = Math.max(0, Math.min(1, ratio));
  const offset = clamped * (VIRIDIS.length - 1);
  const lower = Math.floor(offset);
  const upper = Math.min(VIRIDIS.length - 1, lower + 1);
  return interpolateColor(VIRIDIS[lower], VIRIDIS[upper], offset - lower);
}

function extent(rows, field) {
  const values = rows.map(row => row[field]);
  return [Math.min(...values), Math.max(...values)];
}

function mapLog(value, domain, range) {
  const [domainStart, domainEnd] = domain.map(Math.log10);
  const ratio = (Math.log10(value) - domainStart) / (domainEnd - domainStart);
  return range[0] + ratio * (range[1] - range[0]);
}

function mapSqrt(value, domain, range) {
  const [domainStart, domainEnd] = domain.map(Math.sqrt);
  const ratio = (Math.sqrt(value) - domainStart) / (domainEnd - domainStart);
  return range[0] + ratio * (range[1] - range[0]);
}

function mapLinear(value, domain, range) {
  const ratio = (value - domain[0]) / (domain[1] - domain[0]);
  return range[0] + ratio * (range[1] - range[0]);
}

function freezeRows(rows) {
  return Object.freeze(rows.map(row => Object.freeze({ ...row })));
}

export function createGapminderTransformedScaleValues(gapminder) {
  if (!Array.isArray(gapminder)) {
    throw new TypeError("gapminder must be an array.");
  }
  const rows = freezeRows(gapminder.filter(row =>
    row?.year === 2005 &&
    Number.isFinite(row.pop) && row.pop > 0 &&
    Number.isFinite(row.fertility) && row.fertility >= 0 &&
    Number.isFinite(row.life_expect)
  ));
  const { width, height, margin } = TRANSFORMED_SCATTER_LAYOUT;
  const bounds = Object.freeze({
    left: margin.left,
    right: width - margin.right,
    top: margin.top,
    bottom: height - margin.bottom
  });
  const xDomain = Object.freeze([100_000, 10_000_000_000]);
  const yDomain = Object.freeze([0, 8]);
  const colorDomain = Object.freeze(extent(rows, "life_expect"));
  const xTicks = Object.freeze([100_000, 1_000_000, 10_000_000, 100_000_000, 1_000_000_000, 10_000_000_000]);
  const yTicks = Object.freeze([0, 2, 4, 6, 8]);
  const legendTicks = Object.freeze([
    colorDomain[0], 60, 68, 76, colorDomain[1]
  ]);
  const gradientSteps = 60;
  const gradient = Object.freeze(Array.from({ length: gradientSteps }, (_, index) => {
    const ratio = index / (gradientSteps - 1);
    return Object.freeze({
      x: 646,
      y: 152 + ratio * 220,
      width: 16,
      height: 220 / gradientSteps + 0.6,
      fill: samplePalette(1 - ratio)
    });
  }));

  return Object.freeze({
    rows,
    bounds,
    domains: Object.freeze({ x: xDomain, y: yDomain, color: colorDomain }),
    points: Object.freeze(rows.map(row => Object.freeze({
      x: mapLog(row.pop, xDomain, [bounds.left, bounds.right]),
      y: mapSqrt(row.fertility, yDomain, [bounds.bottom, bounds.top]),
      fill: samplePalette(mapLinear(row.life_expect, colorDomain, [0, 1]))
    }))),
    axes: Object.freeze({
      x: Object.freeze({
        values: xTicks,
        positions: Object.freeze(xTicks.map(value =>
          mapLog(value, xDomain, [bounds.left, bounds.right])
        )),
        labels: Object.freeze(["100K", "1M", "10M", "100M", "1B", "10B"])
      }),
      y: Object.freeze({
        values: yTicks,
        positions: Object.freeze(yTicks.map(value =>
          mapSqrt(value, yDomain, [bounds.bottom, bounds.top])
        )),
        labels: Object.freeze(yTicks.map(String))
      })
    }),
    legend: Object.freeze({
      gradient,
      ticks: legendTicks,
      positions: Object.freeze(legendTicks.map(value =>
        mapLinear(value, colorDomain, [372, 152])
      )),
      labels: Object.freeze(legendTicks.map(value =>
        Number.isInteger(value) ? String(value) : value.toFixed(1)
      ))
    })
  });
}
