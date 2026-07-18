const COLORS = Object.freeze(["#4c78a8", "#f58518"]);

function deepFreeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function requireLayout(width, height, margin) {
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    throw new TypeError("Horizontal grouped bar requires positive dimensions.");
  }
  if (
    margin === null ||
    typeof margin !== "object" ||
    ![margin.top, margin.right, margin.bottom, margin.left].every(
      value => Number.isFinite(value) && value >= 0
    )
  ) {
    throw new TypeError("Horizontal grouped bar requires four non-negative margins.");
  }
  const bounds = {
    x: margin.left,
    y: margin.top,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom
  };
  if (bounds.width <= 0 || bounds.height <= 0) {
    throw new RangeError("Horizontal grouped bar margins must leave positive plot bounds.");
  }
  return bounds;
}

function validRows(rows) {
  if (!Array.isArray(rows)) throw new TypeError("Jobs rows must be an array.");
  return rows.filter(row =>
    row !== null &&
    typeof row === "object" &&
    Number.isFinite(row.year) &&
    Number.isFinite(row.perc) &&
    typeof row.sex === "string" &&
    row.sex.length > 0
  );
}

function unique(values) {
  return [...new Set(values)];
}

function aggregateMeans(rows, years, groups) {
  const aggregates = new Map();
  for (const row of rows) {
    const key = JSON.stringify([row.year, row.sex]);
    const aggregate = aggregates.get(key) ?? { sum: 0, count: 0 };
    aggregate.sum += row.perc;
    aggregate.count += 1;
    aggregates.set(key, aggregate);
  }
  return years.flatMap(year => groups.flatMap(sex => {
    const aggregate = aggregates.get(JSON.stringify([year, sex]));
    return aggregate === undefined
      ? []
      : [{ year, sex, mean: aggregate.sum / aggregate.count, count: aggregate.count }];
  }));
}

function niceCeilingStep(maximum, count) {
  if (maximum === 0) return 1;
  const rough = maximum / count;
  const power = 10 ** Math.floor(Math.log10(rough));
  const fraction = rough / power;
  const factor = [1, 2, 3, 5, 10].find(candidate => candidate >= fraction);
  return factor * power;
}

function mapLinear(value, domain, range) {
  if (domain[0] === domain[1]) return (range[0] + range[1]) / 2;
  return range[0] + (value - domain[0]) /
    (domain[1] - domain[0]) * (range[1] - range[0]);
}

function formatTick(value, step) {
  if (value === 0) return "0";
  const digits = Math.max(0, Math.ceil(-Math.log10(step)));
  return value.toFixed(digits);
}

export function createHorizontalGroupedBarValues(
  rows,
  {
    width = 760,
    height = 640,
    margin = { top: 82, right: 140, bottom: 72, left: 82 },
    band = 0.72,
    paddingInner = 0,
    paddingOuter = 0
  } = {}
) {
  const bounds = requireLayout(width, height, margin);
  if (!Number.isFinite(band) || band <= 0 || band > 1) {
    throw new RangeError("Horizontal grouped bar band must be greater than 0 and at most 1.");
  }
  if (!Number.isFinite(paddingInner) || paddingInner < 0 || paddingInner >= 1) {
    throw new RangeError("yOffset paddingInner must be from 0 (inclusive) to 1 (exclusive).");
  }
  if (!Number.isFinite(paddingOuter) || paddingOuter < 0) {
    throw new RangeError("yOffset paddingOuter must be a non-negative finite number.");
  }

  const jobs = validRows(rows);
  if (jobs.length === 0) {
    throw new Error("Horizontal grouped bar requires at least one valid job row.");
  }
  const years = unique(jobs.map(row => row.year));
  const groups = unique(jobs.map(row => row.sex));
  const cells = aggregateMeans(jobs, years, groups);
  const maximum = Math.max(...cells.map(cell => cell.mean));
  const xStep = niceCeilingStep(maximum, 5);
  const xDomain = [0, Math.ceil(maximum / xStep) * xStep];
  const xTicks = [];
  for (let value = 0; value <= xDomain[1] + xStep / 2; value += xStep) {
    xTicks.push(Number(value.toPrecision(12)));
  }

  const categoryStep = bounds.height / years.length;
  const offsetStep = categoryStep /
    Math.max(1, groups.length - paddingInner + paddingOuter * 2);
  const offsetBandwidth = offsetStep * (1 - paddingInner);
  const offsetStart = offsetStep * paddingOuter;
  const barHeight = offsetBandwidth * band;
  const xRange = [bounds.x, bounds.x + bounds.width];
  const rects = cells.map(cell => {
    const category = years.indexOf(cell.year);
    const group = groups.indexOf(cell.sex);
    const x2 = mapLinear(cell.mean, xDomain, xRange);
    const categoryCenter = bounds.y + (category + 0.5) * categoryStep;
    const offsetCenter = offsetStart + group * offsetStep + offsetBandwidth / 2;
    const center = categoryCenter + (offsetCenter - categoryStep / 2);
    return {
      ...cell,
      x: bounds.x,
      y: center - barHeight / 2,
      width: x2 - bounds.x,
      height: barHeight,
      fill: COLORS[group % COLORS.length]
    };
  });
  const xAxisTicks = xTicks.map(value => ({
    value,
    label: formatTick(value, xStep),
    position: mapLinear(value, xDomain, xRange)
  }));
  const yAxisTicks = years.map((value, index) => ({
    value,
    label: String(value),
    position: bounds.y + (index + 0.5) * categoryStep
  }));
  const legendX = bounds.x + bounds.width + 30;
  const legendY = bounds.y + 20;

  return deepFreeze({
    width,
    height,
    margin: { ...margin },
    bounds,
    rows: jobs,
    years,
    groups,
    cells,
    rects,
    scales: {
      x: { domain: xDomain, range: xRange, step: xStep },
      y: { domain: years, range: [bounds.y, bounds.y + bounds.height], step: categoryStep },
      yOffset: {
        domain: groups,
        range: [0, categoryStep],
        step: offsetStep,
        bandwidth: offsetBandwidth,
        start: offsetStart
      },
      color: { domain: groups, range: COLORS }
    },
    axes: {
      x: {
        ticks: xAxisTicks,
        line: {
          x1: bounds.x,
          y1: bounds.y + bounds.height,
          x2: bounds.x + bounds.width,
          y2: bounds.y + bounds.height
        },
        title: {
          x: bounds.x + bounds.width / 2,
          y: height - 24,
          text: "Mean workforce share"
        }
      },
      y: {
        ticks: yAxisTicks,
        line: {
          x1: bounds.x,
          y1: bounds.y,
          x2: bounds.x,
          y2: bounds.y + bounds.height
        },
        title: {
          x: 24,
          y: bounds.y + bounds.height / 2,
          text: "Year",
          rotation: -Math.PI / 2
        }
      }
    },
    grid: xAxisTicks.map(tick => ({
      x1: tick.position,
      y1: bounds.y,
      x2: tick.position,
      y2: bounds.y + bounds.height
    })),
    legend: {
      title: { x: legendX, y: legendY, text: "Sex" },
      items: groups.map((group, index) => ({
        label: group,
        color: COLORS[index % COLORS.length],
        x: legendX,
        y: bounds.y + 46 + index * 28,
        width: 14,
        height: 12,
        labelX: legendX + 22,
        labelY: bounds.y + 52 + index * 28
      }))
    },
    title: {
      x: bounds.x + bounds.width / 2,
      y: 25,
      text: "Workforce Share by Year and Sex",
      subtitleY: 49,
      subtitle: "Mean occupation share in the jobs dataset"
    }
  });
}
