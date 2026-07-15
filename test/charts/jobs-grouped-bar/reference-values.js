const COLORS = ["#4c78a8", "#f58518", "#e45756"];

function requireLayout({
  width,
  height,
  margin,
  band,
  pixels,
  paddingInner,
  paddingOuter
}) {
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
  if (pixels === undefined && (!Number.isFinite(band) || band <= 0 || band > 1)) {
    throw new RangeError("Grouped bar band must be greater than 0 and at most 1.");
  }
  if (pixels !== undefined && (!Number.isFinite(pixels) || pixels <= 0)) {
    throw new RangeError("Grouped bar pixels must be a positive finite number.");
  }
  if (!Number.isFinite(paddingInner) || paddingInner < 0 || paddingInner >= 1) {
    throw new RangeError("Offset paddingInner must be from 0 (inclusive) to 1 (exclusive).");
  }
  if (!Number.isFinite(paddingOuter) || paddingOuter < 0) {
    throw new RangeError("Offset paddingOuter must be a non-negative finite number.");
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

function normalizeRows(jobs, field, groupField) {
  if (!Array.isArray(jobs)) {
    throw new TypeError("Jobs must be an array.");
  }
  return jobs.filter(row =>
    row !== null &&
    typeof row === "object" &&
    Number.isFinite(row.year) &&
    Number.isFinite(row[field]) &&
    typeof row[groupField] === "string" &&
    row[groupField].length > 0
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

function aggregateMeans(rows, years, groups, field, groupField) {
  const aggregates = new Map();
  for (const row of rows) {
    const key = JSON.stringify([row.year, row[groupField]]);
    const group = aggregates.get(key) ?? { sum: 0, count: 0 };
    group.sum += row[field];
    group.count += 1;
    aggregates.set(key, group);
  }

  const cells = [];
  for (const year of years) {
    for (const groupValue of groups) {
      const group = aggregates.get(JSON.stringify([year, groupValue]));
      if (group === undefined) continue;
      cells.push({
        year,
        group: groupValue,
        [groupField]: groupValue,
        mean: group.sum / group.count,
        count: group.count
      });
    }
  }
  return cells;
}

function formatTick(value, step) {
  if (value === 0) return "0";
  const digits = Math.max(3, Math.ceil(-Math.log10(step)));
  return value.toFixed(digits);
}

export function createJobsGroupedBarValues(
  jobs,
  {
    width,
    height,
    margin,
    band = 0.72,
    pixels,
    paddingInner = 0,
    paddingOuter = 0,
    field = "perc",
    layout = "group",
    groupField = "sex",
    legendTitle = groupField
  }
) {
  const bounds = requireLayout({
    width,
    height,
    margin,
    band,
    pixels,
    paddingInner,
    paddingOuter
  });
  if (typeof field !== "string" || field.length === 0) {
    throw new TypeError("Bar reference field must be a non-empty string.");
  }
  if (!["group", "overlay", "diverging"].includes(layout)) {
    throw new Error(`Unsupported bar reference layout "${layout}".`);
  }
  if (typeof groupField !== "string" || groupField.length === 0) {
    throw new TypeError("Bar reference groupField must be a non-empty string.");
  }
  const validJobs = normalizeRows(jobs, field, groupField);
  if (validJobs.length === 0) {
    throw new Error("Grouped bar chart requires at least one valid job row.");
  }

  const years = unique(validJobs.map(row => row.year));
  const groups = unique(validJobs.map(row => row[groupField]));
  const cells = aggregateMeans(validJobs, years, groups, field, groupField);
  const xRange = [bounds.x, bounds.x + bounds.width];
  const yRange = [bounds.y + bounds.height, bounds.y];
  const categoryWidth = bounds.width / years.length;
  const offsetStep = categoryWidth /
    Math.max(1, groups.length - paddingInner + paddingOuter * 2);
  const offsetBandwidth = offsetStep * (1 - paddingInner);
  const offsetStart = offsetStep * paddingOuter;
  const groupedWidth = pixels ?? offsetBandwidth * band;
  const sharedWidth = categoryWidth * band;
  const partitions = new Map();

  for (const year of years) {
    let positive = 0;
    let negative = 0;
    for (const groupValue of groups) {
      const cell = cells.find(candidate =>
        candidate.year === year && candidate.group === groupValue
      );
      if (cell === undefined) continue;
      const stackStart = cell.mean >= 0 ? positive : negative;
      const stackEnd = stackStart + cell.mean;
      if (cell.mean >= 0) positive = stackEnd;
      else negative = stackEnd;
      partitions.set(JSON.stringify([year, groupValue]), { stackStart, stackEnd });
    }
  }

  const yValues = layout === "diverging"
    ? [0, ...partitions.values()].flatMap(value =>
      typeof value === "number"
        ? [value]
        : [value.stackStart, value.stackEnd]
    )
    : cells.map(cell => cell.mean);
  const yScale = resolveNiceScale(yValues);
  const baselineValue = layout === "diverging" ? 0 : yScale.domain[0];

  const rects = cells
    .filter(cell => layout !== "diverging" || cell.mean !== 0)
    .map(cell => {
      const yearIndex = years.indexOf(cell.year);
      const groupIndex = groups.indexOf(cell.group);
      const isGrouped = layout === "group";
      const width = isGrouped ? groupedWidth : sharedWidth;
      const x = isGrouped
        ? bounds.x + yearIndex * categoryWidth + offsetStart +
          groupIndex * offsetStep + (offsetBandwidth - width) / 2
        : bounds.x + yearIndex * categoryWidth + (categoryWidth - width) / 2;
      const partition = partitions.get(JSON.stringify([cell.year, cell.group]));
      const start = layout === "diverging"
        ? partition.stackStart
        : baselineValue;
      const end = layout === "diverging" ? partition.stackEnd : cell.mean;
      const startPosition = mapValue(start, yScale.domain, yRange);
      const endPosition = mapValue(end, yScale.domain, yRange);
      return {
        ...cell,
        ...(layout === "diverging"
          ? { stackStart: start, stackEnd: end }
          : {}),
        x,
        y: Math.min(startPosition, endPosition),
        width,
        height: Math.abs(startPosition - endPosition),
        fill: COLORS[groupIndex % COLORS.length]
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
    label: formatTick(value, yScale.step)
  }));
  const legendX = bounds.x + bounds.width + 30;
  const legendItems = groups.map((group, index) => ({
    label: group,
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
    field,
    groupField,
    layout,
    years,
    groups,
    ...(groupField === "sex" ? { sexes: groups } : {}),
    cells,
    rects,
    scales: {
      x: { domain: years, range: xRange, bandwidth: categoryWidth },
      ...(layout === "group"
        ? {
            xOffset: {
              domain: groups,
              range: [0, categoryWidth],
              step: offsetStep,
              bandwidth: offsetBandwidth,
              paddingInner,
              paddingOuter
            }
          }
        : {}),
      y: { domain: yScale.domain, range: yRange, step: yScale.step },
      color: { domain: groups, range: groups.map((_, index) => COLORS[index % COLORS.length]) }
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
          text: `mean(${field})`,
          rotation: -Math.PI / 2
        }
      }
    },
    legend: {
      title: { x: legendX, y: bounds.y + 20, text: legendTitle },
      items: legendItems
    }
  };
}
