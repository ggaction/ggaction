const COLORS = ["#4c78a8", "#f58518"];

function requireLayout({ width, height, margin, band }) {
  if (!Number.isFinite(width) || width <= 0) {
    throw new TypeError("Grouped bar layout requires a positive finite width.");
  }
  if (!Number.isFinite(height) || height <= 0) {
    throw new TypeError("Grouped bar layout requires a positive finite height.");
  }
  if (
    margin === null ||
    typeof margin !== "object" ||
    ![margin.top, margin.right, margin.bottom, margin.left].every(
      value => Number.isFinite(value) && value >= 0
    )
  ) {
    throw new TypeError("Grouped bar layout requires four non-negative margins.");
  }
  if (!Number.isFinite(band) || band <= 0 || band > 1) {
    throw new RangeError("Grouped bar band must be greater than 0 and at most 1.");
  }

  const bounds = {
    x: margin.left,
    y: margin.top,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom
  };
  if (bounds.width <= 0 || bounds.height <= 0) {
    throw new Error("Grouped bar margins must leave positive plot bounds.");
  }
  return bounds;
}

function normalizeRows(jobs) {
  if (!Array.isArray(jobs)) {
    throw new TypeError("Jobs must be an array.");
  }
  return jobs.filter(row =>
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

function niceCeilingStep(span, count) {
  if (span === 0) return 1;
  const rough = span / count;
  const power = 10 ** Math.floor(Math.log10(rough));
  const fraction = rough / power;
  const factor = [1, 2, 3, 5, 10].find(candidate => candidate >= fraction);
  return factor * power;
}

function resolveNiceScale(values, count = 5) {
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const step = niceCeilingStep(maximum - minimum, count);
  let start = Math.floor(minimum / step) * step;
  let stop = Math.ceil(maximum / step) * step;
  if (start === stop) {
    start -= step / 2;
    stop += step / 2;
  }
  const ticks = [];
  for (let value = start; value <= stop + step / 2; value += step) {
    ticks.push(Number(value.toPrecision(12)));
  }
  return { domain: [start, stop], ticks, step };
}

function mapValue(value, domain, range) {
  if (domain[0] === domain[1]) return (range[0] + range[1]) / 2;
  const ratio = (value - domain[0]) / (domain[1] - domain[0]);
  return range[0] + ratio * (range[1] - range[0]);
}

function aggregateMeans(rows, years, sexes) {
  const groups = new Map();
  for (const row of rows) {
    const key = JSON.stringify([row.year, row.sex]);
    const group = groups.get(key) ?? { sum: 0, count: 0 };
    group.sum += row.perc;
    group.count += 1;
    groups.set(key, group);
  }

  const cells = [];
  for (const year of years) {
    for (const sex of sexes) {
      const group = groups.get(JSON.stringify([year, sex]));
      if (group === undefined) continue;
      cells.push({ year, sex, mean: group.sum / group.count, count: group.count });
    }
  }
  return cells;
}

function formatTick(value) {
  return value === 0 ? "0" : value.toFixed(3);
}

export function createJobsGroupedBarValues(
  jobs,
  { width, height, margin, band = 0.72 }
) {
  const bounds = requireLayout({ width, height, margin, band });
  const validJobs = normalizeRows(jobs);
  if (validJobs.length === 0) {
    throw new Error("Grouped bar chart requires at least one valid job row.");
  }

  const years = unique(validJobs.map(row => row.year));
  const sexes = unique(validJobs.map(row => row.sex));
  const cells = aggregateMeans(validJobs, years, sexes);
  const yScale = resolveNiceScale(cells.map(cell => cell.mean));
  const xRange = [bounds.x, bounds.x + bounds.width];
  const yRange = [bounds.y + bounds.height, bounds.y];
  const categoryWidth = bounds.width / years.length;
  const slotWidth = categoryWidth / sexes.length;
  const barWidth = slotWidth * band;
  const baseline = mapValue(yScale.domain[0], yScale.domain, yRange);

  const rects = cells.map(cell => {
    const yearIndex = years.indexOf(cell.year);
    const sexIndex = sexes.indexOf(cell.sex);
    const x = bounds.x + yearIndex * categoryWidth + sexIndex * slotWidth +
      (slotWidth - barWidth) / 2;
    const y = mapValue(cell.mean, yScale.domain, yRange);
    return {
      ...cell,
      x,
      y,
      width: barWidth,
      height: baseline - y,
      fill: COLORS[sexIndex % COLORS.length]
    };
  });

  const xTicks = years.map((year, index) => ({
    value: year,
    position: bounds.x + (index + 0.5) * categoryWidth,
    label: String(year)
  }));
  const yTicks = yScale.ticks.map(value => ({
    value,
    position: mapValue(value, yScale.domain, yRange),
    label: formatTick(value)
  }));
  const legendX = bounds.x + bounds.width + 30;
  const legendItems = sexes.map((sex, index) => ({
    sex,
    color: COLORS[index % COLORS.length],
    x: legendX,
    y: bounds.y + 46 + index * 28,
    width: 14,
    height: 12,
    labelX: legendX + 22,
    labelY: bounds.y + 52 + index * 28
  }));

  return {
    validJobs,
    bounds,
    years,
    sexes,
    cells,
    rects,
    scales: {
      x: { domain: years, range: xRange, bandwidth: categoryWidth },
      xOffset: { domain: sexes, range: [0, categoryWidth], bandwidth: slotWidth },
      y: { domain: yScale.domain, range: yRange, step: yScale.step },
      color: { domain: sexes, range: COLORS.slice(0, sexes.length) }
    },
    grid: {
      horizontal: yTicks.map(tick => ({
        value: tick.value,
        x1: bounds.x,
        y1: tick.position,
        x2: bounds.x + bounds.width,
        y2: tick.position
      }))
    },
    axes: {
      x: {
        line: {
          x1: bounds.x,
          y1: bounds.y + bounds.height,
          x2: bounds.x + bounds.width,
          y2: bounds.y + bounds.height
        },
        ticks: xTicks,
        title: {
          x: bounds.x + bounds.width / 2,
          y: height - 20,
          text: "year",
          rotation: 0
        }
      },
      y: {
        line: {
          x1: bounds.x,
          y1: bounds.y,
          x2: bounds.x,
          y2: bounds.y + bounds.height
        },
        ticks: yTicks,
        title: {
          x: 24,
          y: bounds.y + bounds.height / 2,
          text: "mean(perc)",
          rotation: -Math.PI / 2
        }
      }
    },
    legend: {
      title: { x: legendX, y: bounds.y + 20, text: "sex" },
      items: legendItems
    }
  };
}
