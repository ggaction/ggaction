const COLORS = ["#4c78a8", "#f58518"];

function boundsFrom({ width, height, margin }) {
  const bounds = {
    x: margin.left,
    y: margin.top,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom
  };
  if (![bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite)) {
    throw new TypeError("Position reference layout requires finite bounds.");
  }
  if (bounds.width <= 0 || bounds.height <= 0) {
    throw new RangeError("Position reference margins must leave positive bounds.");
  }
  return bounds;
}

function unique(values) {
  return [...new Set(values)];
}

function mapValue(value, domain, range) {
  const ratio = (value - domain[0]) / (domain[1] - domain[0]);
  return range[0] + ratio * (range[1] - range[0]);
}

function niceStep(span, count = 5) {
  const rough = span / count;
  const power = 10 ** Math.floor(Math.log10(rough));
  const fraction = rough / power;
  return ([1, 2, 3, 5, 10].find(value => value >= fraction) ?? 10) * power;
}

function niceScale(values) {
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const step = niceStep(maximum - minimum);
  const start = Number((Math.floor(minimum / step) * step).toPrecision(12));
  const stop = Number((Math.ceil(maximum / step) * step).toPrecision(12));
  const ticks = [];
  for (let value = start; value <= stop + step / 2; value += step) {
    ticks.push(Number(value.toPrecision(12)));
  }
  return { domain: [start, stop], step, ticks };
}

function formatNumber(value, step) {
  if (value === 0) return "0";
  const digits = Math.max(3, Math.ceil(-Math.log10(step)));
  return value.toFixed(digits);
}

function aggregate(rows, categoryField) {
  const categories = unique(rows.map(row => row[categoryField])).sort((a, b) => a - b);
  const groups = unique(rows.map(row => row.sex));
  const sums = new Map();
  for (const row of rows) {
    const key = JSON.stringify([row[categoryField], row.sex]);
    const current = sums.get(key) ?? { sum: 0, count: 0 };
    current.sum += row.perc;
    current.count += 1;
    sums.set(key, current);
  }
  const cells = [];
  for (const category of categories) {
    for (const group of groups) {
      const summary = sums.get(JSON.stringify([category, group]));
      if (summary === undefined) continue;
      cells.push({
        category,
        sex: group,
        mean: summary.sum / summary.count,
        count: summary.count
      });
    }
  }
  return { categories, groups, cells };
}

function legend(groups, bounds, title = "sex") {
  const x = bounds.x + bounds.width + 30;
  return {
    title: { x, y: bounds.y + 20, text: title },
    items: groups.map((group, index) => ({
      label: group,
      color: COLORS[index % COLORS.length],
      x,
      y: bounds.y + 46 + index * 28,
      width: 14,
      height: 12,
      labelX: x + 22,
      labelY: bounds.y + 52 + index * 28
    }))
  };
}

export function createTemporalBarReference(rows, layout) {
  const bounds = boundsFrom(layout);
  const validRows = rows.filter(row =>
    row !== null &&
    typeof row === "object" &&
    Number.isFinite(row.yearDate) &&
    Number.isFinite(row.perc) &&
    typeof row.sex === "string" &&
    row.sex.length > 0
  );
  if (validRows.length === 0) {
    throw new Error("Temporal bar reference requires valid rows.");
  }
  const { categories: dates, groups, cells } = aggregate(validRows, "yearDate");
  const timeDomain = [dates[0], dates.at(-1)];
  const differences = dates.slice(1).map((value, index) => value - dates[index]);
  const minimumDifference = Math.min(...differences);
  const domainSpan = timeDomain[1] - timeDomain[0];
  const inset = bounds.width * minimumDifference /
    (2 * (domainSpan + minimumDifference));
  const timeRange = [bounds.x + inset, bounds.x + bounds.width - inset];
  const positions = dates.map(value => mapValue(value, timeDomain, timeRange));
  const categoryBandwidth = Math.min(
    ...positions.slice(1).map((value, index) => value - positions[index])
  );
  const offsetBandwidth = categoryBandwidth / groups.length;
  const barWidth = offsetBandwidth * 0.72;
  const yScale = niceScale(cells.map(cell => cell.mean));
  const yRange = [bounds.y + bounds.height, bounds.y];
  const baseline = mapValue(yScale.domain[0], yScale.domain, yRange);
  const rects = cells.map(cell => {
    const category = dates.indexOf(cell.category);
    const group = groups.indexOf(cell.sex);
    const center = positions[category] - categoryBandwidth / 2 +
      (group + 0.5) * offsetBandwidth;
    const valueY = mapValue(cell.mean, yScale.domain, yRange);
    return {
      ...cell,
      x: center - barWidth / 2,
      y: Math.min(valueY, baseline),
      width: barWidth,
      height: Math.abs(valueY - baseline),
      fill: COLORS[group]
    };
  });
  const startYear = new Date(timeDomain[0]).getUTCFullYear();
  const stopYear = new Date(timeDomain[1]).getUTCFullYear();
  const xTicks = [];
  for (let year = startYear; year <= stopYear; year += 10) {
    const value = Date.UTC(year, 0, 1);
    xTicks.push({
      value,
      position: mapValue(value, timeDomain, timeRange),
      label: String(year)
    });
  }
  const yTicks = yScale.ticks.map(value => ({
    value,
    position: mapValue(value, yScale.domain, yRange),
    label: formatNumber(value, yScale.step)
  }));

  return {
    validRows,
    bounds,
    dates,
    groups,
    cells,
    rects,
    scales: {
      x: { type: "time", domain: timeDomain, range: timeRange },
      xOffset: {
        type: "ordinal",
        domain: groups,
        range: [0, categoryBandwidth],
        step: offsetBandwidth,
        bandwidth: offsetBandwidth
      },
      y: { type: "linear", domain: yScale.domain, range: yRange, step: yScale.step },
      color: { type: "ordinal", domain: groups, range: COLORS }
    },
    grid: {
      horizontal: yTicks.map(tick => ({
        x1: bounds.x,
        y1: tick.position,
        x2: bounds.x + bounds.width,
        y2: tick.position
      }))
    },
    axes: {
      x: {
        line: { x1: bounds.x, y1: bounds.y + bounds.height, x2: bounds.x + bounds.width, y2: bounds.y + bounds.height },
        ticks: xTicks,
        title: { x: bounds.x + bounds.width / 2, y: layout.height - 20, text: "yearDate", rotation: 0 }
      },
      y: {
        line: { x1: bounds.x, y1: bounds.y, x2: bounds.x, y2: bounds.y + bounds.height },
        ticks: yTicks,
        title: { x: 24, y: bounds.y + bounds.height / 2, text: "mean(perc)", rotation: -Math.PI / 2 }
      }
    },
    legend: legend(groups, bounds)
  };
}

export function createHorizontalBarReference(rows, layout) {
  const bounds = boundsFrom(layout);
  const validRows = rows.filter(row =>
    row !== null &&
    typeof row === "object" &&
    Number.isFinite(row.year) &&
    Number.isFinite(row.perc) &&
    typeof row.sex === "string" &&
    row.sex.length > 0
  );
  if (validRows.length === 0) {
    throw new Error("Horizontal bar reference requires valid rows.");
  }
  const { categories: years, groups, cells } = aggregate(validRows, "year");
  const partitions = new Map();
  const totals = [];
  for (const year of years) {
    let total = 0;
    for (const group of groups) {
      const cell = cells.find(candidate =>
        candidate.category === year && candidate.sex === group
      );
      if (cell === undefined) continue;
      const start = total;
      total += cell.mean;
      partitions.set(JSON.stringify([year, group]), { start, end: total });
    }
    totals.push(total);
  }
  const xScale = niceScale([0, ...totals]);
  const xRange = [bounds.x, bounds.x + bounds.width];
  const categoryBandwidth = bounds.height / years.length;
  const barHeight = categoryBandwidth * 0.72;
  const rects = cells.map(cell => {
    const category = years.indexOf(cell.category);
    const group = groups.indexOf(cell.sex);
    const partition = partitions.get(JSON.stringify([cell.category, cell.sex]));
    const start = mapValue(partition.start, xScale.domain, xRange);
    const end = mapValue(partition.end, xScale.domain, xRange);
    return {
      ...cell,
      stackStart: partition.start,
      stackEnd: partition.end,
      x: Math.min(start, end),
      y: bounds.y + category * categoryBandwidth +
        (categoryBandwidth - barHeight) / 2,
      width: Math.abs(end - start),
      height: barHeight,
      fill: COLORS[group]
    };
  });
  const xTicks = xScale.ticks.map(value => ({
    value,
    position: mapValue(value, xScale.domain, xRange),
    label: formatNumber(value, xScale.step)
  }));
  const yTicks = years.map((year, index) => ({
    value: year,
    position: bounds.y + (index + 0.5) * categoryBandwidth,
    label: String(year)
  }));

  return {
    validRows,
    bounds,
    years,
    groups,
    cells,
    rects,
    scales: {
      x: { type: "linear", domain: xScale.domain, range: xRange, step: xScale.step },
      y: { type: "ordinal", domain: years, range: [bounds.y, bounds.y + bounds.height], bandwidth: categoryBandwidth },
      color: { type: "ordinal", domain: groups, range: COLORS }
    },
    grid: {
      vertical: xTicks.map(tick => ({
        x1: tick.position,
        y1: bounds.y,
        x2: tick.position,
        y2: bounds.y + bounds.height
      }))
    },
    axes: {
      x: {
        line: { x1: bounds.x, y1: bounds.y + bounds.height, x2: bounds.x + bounds.width, y2: bounds.y + bounds.height },
        ticks: xTicks,
        title: { x: bounds.x + bounds.width / 2, y: layout.height - 20, text: "mean(perc)", rotation: 0 }
      },
      y: {
        line: { x1: bounds.x, y1: bounds.y, x2: bounds.x, y2: bounds.y + bounds.height },
        ticks: yTicks,
        title: { x: 24, y: bounds.y + bounds.height / 2, text: "year", rotation: -Math.PI / 2 }
      }
    },
    legend: legend(groups, bounds)
  };
}
