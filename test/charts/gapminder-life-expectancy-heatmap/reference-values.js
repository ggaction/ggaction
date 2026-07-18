import {
  HEATMAP_COUNTRIES,
  HEATMAP_YEARS,
  selectHeatmapRows
} from "../../../examples/gapminder-life-expectancy-heatmap/program.js";

export { HEATMAP_COUNTRIES, HEATMAP_YEARS };

export const HEATMAP_LAYOUT = Object.freeze({
  width: 760,
  height: 440,
  margin: Object.freeze({ top: 70, right: 120, bottom: 75, left: 110 })
});

const VIRIDIS = Object.freeze([
  "#440154", "#470e61", "#481a6c", "#482575", "#472f7d",
  "#443a83", "#414487", "#3d4e8a", "#39568c", "#35608d",
  "#31688e", "#2d708e", "#2a788e", "#27818e", "#23888e",
  "#21918d", "#1f988b", "#1fa088", "#22a884", "#2ab07f",
  "#35b779", "#43bf71", "#54c568", "#66cc5d", "#7ad151",
  "#8fd744", "#a5db36", "#bcdf27", "#d2e21b", "#e9e51a",
  "#fde725"
]);

function freeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function mapLinear(value, domain, range) {
  if (domain[0] === domain[1]) return (range[0] + range[1]) / 2;
  return range[0] + (value - domain[0]) / (domain[1] - domain[0]) *
    (range[1] - range[0]);
}

function channel(color, offset) {
  return Number.parseInt(color.slice(offset, offset + 2), 16);
}

function interpolate(left, right, amount) {
  return `#${[1, 3, 5].map(offset => Math.round(
    channel(left, offset) +
      (channel(right, offset) - channel(left, offset)) * amount
  ).toString(16).padStart(2, "0")).join("")}`;
}

function sampleViridis(amount) {
  const bounded = Math.max(0, Math.min(1, amount));
  const position = bounded * (VIRIDIS.length - 1);
  const lower = Math.floor(position);
  const upper = Math.min(VIRIDIS.length - 1, lower + 1);
  return interpolate(VIRIDIS[lower], VIRIDIS[upper], position - lower);
}

function contrastTextColor(color) {
  const channels = [1, 3, 5].map(offset =>
    Number.parseInt(color.slice(offset, offset + 2), 16) / 255
  ).map(value => value <= 0.04045
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4
  );
  const luminance = 0.2126 * channels[0] +
    0.7152 * channels[1] +
    0.0722 * channels[2];
  return luminance >= 0.26 ? "#0f172a" : "#f8fafc";
}

function key(country, year) {
  return `${country}\u0000${year}`;
}

function selectedRows(gapminder) {
  const rows = selectHeatmapRows(gapminder);
  const identities = new Set();
  for (const row of rows) {
    const identity = key(row.country, row.year);
    if (identities.has(identity)) {
      throw new Error(`Duplicate heatmap cell for ${row.country} ${row.year}.`);
    }
    identities.add(identity);
  }
  if (rows.length === 0) {
    throw new Error("Heatmap reference requires at least one complete cell.");
  }
  return rows.map(row => ({
    country: row.country,
    year: row.year,
    life_expect: row.life_expect
  }));
}

function createLegend(domain, bounds) {
  const x = bounds.right + 30;
  const titleY = bounds.top + 20;
  const y = bounds.top + 46;
  const length = 120;
  const thickness = 12;
  const stripCount = 60;
  const stripHeight = length / stripCount;
  const strips = Array.from({ length: stripCount }, (_, index) => {
    const amount = 1 - (index + 0.5) / stripCount;
    const fill = sampleViridis(amount);
    return {
      x,
      y: y + index * stripHeight,
      width: thickness,
      height: stripHeight,
      fill,
      stroke: fill,
      strokeWidth: 0
    };
  });
  const values = Array.from({ length: 5 }, (_, index) =>
    domain[0] + index / 4 * (domain[1] - domain[0])
  );
  const positions = values.map(value =>
    mapLinear(value, domain, [y + length, y])
  );
  return freeze({
    title: { x, y: titleY, text: "Life expectancy" },
    strips,
    ticks: positions.map(position => ({
      x1: x + thickness,
      y1: position,
      x2: x + thickness + 6,
      y2: position
    })),
    labels: values.map((value, index) => ({
      x: x + thickness + 12,
      y: positions[index],
      text: String(+value.toPrecision(3))
    }))
  });
}

export function createHeatmapReference(gapminder) {
  const rows = selectedRows(gapminder);
  const { width, height, margin } = HEATMAP_LAYOUT;
  const bounds = freeze({
    left: margin.left,
    right: width - margin.right,
    top: margin.top,
    bottom: height - margin.bottom,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom
  });
  const xStep = bounds.width / HEATMAP_YEARS.length;
  const yStep = bounds.height / HEATMAP_COUNTRIES.length;
  const values = rows.map(row => row.life_expect);
  const colorDomain = freeze([Math.min(...values), Math.max(...values)]);
  const byCell = new Map(rows.map(row => [key(row.country, row.year), row]));
  const cells = [];
  for (const [countryIndex, country] of HEATMAP_COUNTRIES.entries()) {
    for (const [yearIndex, year] of HEATMAP_YEARS.entries()) {
      const row = byCell.get(key(country, year));
      if (row === undefined) continue;
      const amount = mapLinear(row.life_expect, colorDomain, [0, 1]);
      const fill = sampleViridis(amount);
      cells.push({
        key: key(country, year),
        country,
        year,
        value: row.life_expect,
        x: bounds.left + xStep * (yearIndex + 0.5) - xStep / 2,
        y: bounds.top + yStep * (countryIndex + 0.5) - yStep / 2,
        width: xStep,
        height: yStep,
        fill,
        label: String(Math.round(row.life_expect)),
        labelFill: contrastTextColor(fill)
      });
    }
  }
  return freeze({
    width,
    height,
    margin,
    rows,
    bounds,
    domains: {
      x: [...HEATMAP_YEARS],
      y: [...HEATMAP_COUNTRIES],
      color: colorDomain
    },
    cells,
    axes: {
      x: {
        values: [...HEATMAP_YEARS],
        positions: HEATMAP_YEARS.map((_, index) =>
          bounds.left + xStep * (index + 0.5)
        ),
        labels: HEATMAP_YEARS.map(String),
        title: "Year"
      },
      y: {
        values: [...HEATMAP_COUNTRIES],
        positions: HEATMAP_COUNTRIES.map((_, index) =>
          bounds.top + yStep * (index + 0.5)
        ),
        labels: [...HEATMAP_COUNTRIES],
        title: "Country"
      }
    },
    legend: createLegend(colorDomain, bounds),
    title: {
      x: bounds.left + bounds.width / 2,
      y: 30,
      text: "Life Expectancy over Time"
    }
  });
}

export function createRangedCellReference(gapminder) {
  const reference = createHeatmapReference(gapminder);
  return freeze(reference.cells.slice(0, 4).map(cell => ({
    x: cell.x,
    x2: cell.x + cell.width,
    y: cell.y,
    y2: cell.y + cell.height,
    fill: cell.fill
  })));
}
