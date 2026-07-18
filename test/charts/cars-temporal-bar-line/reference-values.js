const WIDTH = 720;
const HEIGHT = 440;
const MARGIN = Object.freeze({ top: 64, right: 50, bottom: 64, left: 72 });
const Y_DOMAIN = Object.freeze([0, 20]);
const Y_TICKS = Object.freeze([0, 5, 10, 15, 20]);

function deepFreeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function parseYear(value, index) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw new TypeError(`Cars row ${index} requires a valid Year.`);
  }
  return timestamp;
}

function summarize(rows) {
  const groups = new Map();
  rows.forEach((row, index) => {
    if (!Number.isFinite(row?.Acceleration)) return;
    const timestamp = parseYear(row.Year, index);
    const values = groups.get(timestamp) ?? [];
    values.push(row.Acceleration);
    groups.set(timestamp, values);
  });
  if (groups.size < 2) {
    throw new Error("Temporal bar-line reference requires at least two years.");
  }
  return [...groups.entries()]
    .sort(([left], [right]) => left - right)
    .map(([timestamp, values]) => ({
      timestamp,
      year: new Date(timestamp).getUTCFullYear(),
      count: values.length,
      mean: values.reduce((sum, value) => sum + value, 0) / values.length
    }));
}

function positionScale(summaries, bounds) {
  const domain = [summaries[0].timestamp, summaries.at(-1).timestamp];
  const gaps = summaries.slice(1).map((summary, index) =>
    summary.timestamp - summaries[index].timestamp
  );
  const minimumGap = Math.min(...gaps);
  const domainSpan = domain[1] - domain[0];
  const estimatedBandwidth = bounds.width * minimumGap / (domainSpan + minimumGap);
  const range = [
    bounds.x + estimatedBandwidth / 2,
    bounds.x + bounds.width - estimatedBandwidth / 2
  ];
  const map = value => range[0] +
    (value - domain[0]) / domainSpan * (range[1] - range[0]);
  const centers = summaries.map(summary => map(summary.timestamp));
  const bandwidth = Math.min(
    ...centers.slice(1).map((center, index) => center - centers[index])
  );
  return { domain, range, centers, bandwidth };
}

function yPosition(value, bounds) {
  return bounds.y + bounds.height -
    (value - Y_DOMAIN[0]) / (Y_DOMAIN[1] - Y_DOMAIN[0]) * bounds.height;
}

export function createCarsTemporalBarLineValues(rows) {
  if (!Array.isArray(rows)) {
    throw new TypeError("Cars temporal bar-line reference requires rows.");
  }
  const bounds = {
    x: MARGIN.left,
    y: MARGIN.top,
    width: WIDTH - MARGIN.left - MARGIN.right,
    height: HEIGHT - MARGIN.top - MARGIN.bottom
  };
  const summaries = summarize(rows);
  const x = positionScale(summaries, bounds);
  const barWidth = x.bandwidth * 0.72;
  const baseline = bounds.y + bounds.height;
  const points = summaries.map((summary, index) => ({
    x: x.centers[index],
    y: yPosition(summary.mean, bounds),
    value: summary.mean,
    year: summary.year
  }));
  const bars = points.map(point => ({
    x: point.x - barWidth / 2,
    y: point.y,
    width: barWidth,
    height: baseline - point.y
  }));
  const shownYears = new Set([1970, 1972, 1974, 1976, 1978, 1980, 1982]);
  const xTicks = points.filter(point => shownYears.has(point.year)).map(point => ({
    value: point.year,
    label: String(point.year),
    position: point.x
  }));
  const yTicks = Y_TICKS.map(value => ({
    value,
    label: String(value),
    position: yPosition(value, bounds)
  }));
  return deepFreeze({
    width: WIDTH,
    height: HEIGHT,
    margin: MARGIN,
    bounds,
    summaries,
    scales: {
      x: { domain: x.domain, range: x.range, bandwidth: x.bandwidth },
      y: { domain: Y_DOMAIN, range: [baseline, bounds.y] }
    },
    bars,
    points,
    lineCommands: points.map((point, index) => ({
      op: index === 0 ? "M" : "L",
      x: point.x,
      y: point.y
    })),
    axes: {
      x: {
        line: { x1: x.range[0], y1: baseline, x2: x.range[1], y2: baseline },
        ticks: xTicks,
        title: { x: bounds.x + bounds.width / 2, y: baseline + 42, text: "Year" }
      },
      y: {
        line: { x1: bounds.x, y1: baseline, x2: bounds.x, y2: bounds.y },
        ticks: yTicks,
        title: {
          x: 20,
          y: bounds.y + bounds.height / 2,
          text: "Mean acceleration",
          rotation: -Math.PI / 2
        }
      }
    },
    title: {
      text: "Average Acceleration by Model Year",
      subtitle: "Shared temporal scale for bars and trend",
      x: bounds.x + bounds.width / 2,
      y: 25,
      subtitleY: 48
    }
  });
}
