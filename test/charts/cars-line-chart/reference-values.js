const COLORS = ["#4c78a8", "#f58518", "#e45756"];
const DASHES = [[], [8, 4], [3, 3]];

function requireLayout({ width, height, margin }) {
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    throw new TypeError("Line-chart layout requires finite width and height.");
  }

  if (
    margin === null ||
    typeof margin !== "object" ||
    ![margin.top, margin.right, margin.bottom, margin.left].every(Number.isFinite)
  ) {
    throw new TypeError("Line-chart layout requires four finite margins.");
  }

  return {
    x: margin.left,
    y: margin.top,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom
  };
}

function normalizeRows(cars) {
  if (!Array.isArray(cars)) {
    throw new TypeError("Cars must be an array.");
  }

  return cars.flatMap(row => {
    const time = typeof row.Year === "string" ? Date.parse(row.Year) : NaN;

    if (
      !Number.isFinite(time) ||
      !Number.isFinite(row.Acceleration) ||
      typeof row.Origin !== "string" ||
      row.Origin.length === 0
    ) {
      return [];
    }

    return [{ row, time, year: new Date(time).getUTCFullYear() }];
  });
}

function aggregateMeans(rows) {
  const groups = new Map();

  for (const item of rows) {
    const key = `${item.row.Origin}\u0000${item.time}`;
    const group = groups.get(key) ?? {
      origin: item.row.Origin,
      time: item.time,
      year: item.year,
      sum: 0,
      count: 0
    };
    group.sum += item.row.Acceleration;
    group.count += 1;
    groups.set(key, group);
  }

  return [...groups.values()].map(group => ({
    origin: group.origin,
    time: group.time,
    year: group.year,
    value: group.sum / group.count
  }));
}

function niceStep(span, count) {
  const rough = span / Math.max(1, count);
  const power = 10 ** Math.floor(Math.log10(rough));
  const fraction = rough / power;
  const factor = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return factor * power;
}

function niceNumericScale(values, count = 5) {
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const step = niceStep(maximum - minimum, count);
  const domain = [
    Math.floor(minimum / step) * step,
    Math.ceil(maximum / step) * step
  ];
  const ticks = [];

  for (let value = domain[0]; value <= domain[1] + step / 2; value += step) {
    ticks.push(Number(value.toFixed(12)));
  }

  return { domain, ticks };
}

function mapValue(value, domain, range) {
  if (domain[0] === domain[1]) return (range[0] + range[1]) / 2;
  const ratio = (value - domain[0]) / (domain[1] - domain[0]);
  return range[0] + ratio * (range[1] - range[0]);
}

function yearTicks(minimum, maximum) {
  const span = maximum - minimum;
  const step = span > 8 ? 2 : 1;
  const ticks = [];

  for (let year = minimum; year <= maximum; year += step) {
    ticks.push(year);
  }

  if (ticks.at(-1) !== maximum) ticks.push(maximum);
  return ticks;
}

export function createCarsLineChartValues(cars, { width, height, margin }) {
  const bounds = requireLayout({ width, height, margin });
  const normalized = normalizeRows(cars);

  if (normalized.length === 0) {
    throw new Error("Line chart requires at least one valid car row.");
  }

  const validCars = normalized.map(item => item.row);
  const aggregates = aggregateMeans(normalized);
  const origins = [...new Set(normalized.map(item => item.row.Origin))];
  const years = aggregates.map(item => item.year);
  const minimumYear = Math.min(...years);
  const maximumYear = Math.max(...years);
  const xDomain = [
    Date.UTC(minimumYear, 0, 1),
    Date.UTC(maximumYear, 0, 1)
  ];
  const xRange = [bounds.x, bounds.x + bounds.width];
  const yScale = niceNumericScale(aggregates.map(item => item.value));
  const yRange = [bounds.y + bounds.height, bounds.y];
  const series = origins.map((origin, index) => {
    const values = aggregates
      .filter(item => item.origin === origin)
      .sort((left, right) => left.time - right.time);

    return {
      origin,
      color: COLORS[index % COLORS.length],
      strokeDash: DASHES[index % DASHES.length],
      values,
      points: values.map(item => ({
        x: mapValue(item.time, xDomain, xRange),
        y: mapValue(item.value, yScale.domain, yRange)
      }))
    };
  });
  const xTickYears = yearTicks(minimumYear, maximumYear);
  const xTicks = xTickYears.map(year => {
    const value = Date.UTC(year, 0, 1);
    return {
      value,
      position: mapValue(value, xDomain, xRange),
      label: String(year)
    };
  });
  const yTicks = yScale.ticks.map(value => ({
    value,
    position: mapValue(value, yScale.domain, yRange),
    label: String(value)
  }));
  const legend = {
    title: { x: width - margin.right + 8, y: bounds.y + 20, text: "Origin" },
    items: series.map((item, index) => ({
      origin: item.origin,
      color: item.color,
      strokeDash: item.strokeDash,
      x1: width - margin.right + 9,
      x2: width - margin.right + 41,
      y: bounds.y + 52 + index * 28,
      labelX: width - margin.right + 52
    }))
  };
  const title = {
    x: bounds.x,
    titleY: 27,
    subtitleY: 53,
    text: "The trend of acceleration by year",
    subtitle: "from 1970 to 1982"
  };

  return {
    validCars,
    aggregates,
    bounds,
    origins,
    series,
    scales: {
      x: { domain: xDomain, range: xRange },
      y: { domain: yScale.domain, range: yRange }
    },
    axes: {
      x: {
        ticks: xTicks,
        line: {
          x1: xRange[0],
          y1: bounds.y + bounds.height,
          x2: xRange[1],
          y2: bounds.y + bounds.height
        },
        title: {
          x: bounds.x + bounds.width / 2,
          y: height - 18,
          text: "Year"
        }
      },
      y: {
        ticks: yTicks,
        line: {
          x1: bounds.x,
          y1: yRange[0],
          x2: bounds.x,
          y2: yRange[1]
        },
        title: {
          x: 28,
          y: bounds.y + bounds.height / 2,
          text: "mean(Acceleration)",
          rotation: -Math.PI / 2
        }
      }
    },
    legend,
    title
  };
}
