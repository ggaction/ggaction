export const CENTER_AREA_JOBS = Object.freeze([
  "Farmer",
  "Operative",
  "Clerical Worker",
  "Teacher",
  "Nurse"
]);

export const CENTER_AREA_COLORS = Object.freeze([
  "#4c78a8",
  "#f58518",
  "#e45756",
  "#72b7b2",
  "#54a24b"
]);

export const CENTER_AREA_LAYOUT = Object.freeze({
  panelWidth: 690,
  panelHeight: 420,
  gap: 20,
  padding: 8,
  plot: Object.freeze({ left: 72, top: 92, right: 548, bottom: 350 }),
  labelX: 558,
  xTicks: Object.freeze([1850, 1900, 1950, 2000]),
  zeroDomain: Object.freeze([0, 36_000_000]),
  centerDomain: Object.freeze([-18_000_000, 18_000_000]),
  zeroTicks: Object.freeze([0, 10_000_000, 20_000_000, 30_000_000]),
  centerTicks: Object.freeze([-15_000_000, 0, 15_000_000])
});

function freezeRows(rows) {
  return Object.freeze(rows.map(row => Object.freeze(row)));
}

function mapLinear(value, domain, range) {
  const ratio = (value - domain[0]) / (domain[1] - domain[0]);
  return range[0] + ratio * (range[1] - range[0]);
}

function formatMillions(value) {
  if (value === 0) return "0";
  return `${value / 1_000_000}M`;
}

function aggregateJobs(jobs) {
  if (!Array.isArray(jobs)) throw new TypeError("Jobs data must be an array.");
  const selected = new Set(CENTER_AREA_JOBS);
  const partitions = new Map();
  for (const row of jobs) {
    if (
      row === null ||
      typeof row !== "object" ||
      !selected.has(row.job)
    ) continue;
    if (!Number.isInteger(row.year) || !Number.isFinite(row.count)) {
      throw new TypeError("Selected Jobs rows require integer year and finite count.");
    }
    if (row.count < 0) {
      throw new RangeError("Center area reference requires non-negative counts.");
    }
    const partition = partitions.get(row.year) ?? new Map();
    partition.set(row.job, (partition.get(row.job) ?? 0) + row.count);
    partitions.set(row.year, partition);
  }
  const years = [...partitions.keys()].sort((left, right) => left - right);
  if (years.length < 2) throw new Error("Center area reference requires two years.");
  const rows = years.flatMap(year => CENTER_AREA_JOBS.map(job => {
    const count = partitions.get(year).get(job);
    if (count === undefined) {
      throw new Error(`Center area reference is missing ${job} at ${year}.`);
    }
    return { year, job, count };
  }));
  return { years: Object.freeze(years), rows: freezeRows(rows) };
}

function layoutPartitions(rows, years, mode) {
  const series = CENTER_AREA_JOBS.map((job, index) => ({
    job,
    color: CENTER_AREA_COLORS[index],
    values: []
  }));
  for (const year of years) {
    const counts = CENTER_AREA_JOBS.map(job =>
      rows.find(row => row.year === year && row.job === job).count
    );
    const total = counts.reduce((sum, value) => sum + value, 0);
    let offset = mode === "center" ? -total / 2 : 0;
    counts.forEach((count, index) => {
      series[index].values.push({ year, count, lower: offset, upper: offset + count });
      offset += count;
    });
  }
  return Object.freeze(series.map(item => Object.freeze({
    job: item.job,
    color: item.color,
    values: freezeRows(item.values)
  })));
}

function panelValues(rows, years, mode) {
  const layout = CENTER_AREA_LAYOUT;
  const domain = mode === "center" ? layout.centerDomain : layout.zeroDomain;
  const tickValues = mode === "center" ? layout.centerTicks : layout.zeroTicks;
  const xRange = [layout.plot.left, layout.plot.right];
  const yRange = [layout.plot.bottom, layout.plot.top];
  const laidOut = layoutPartitions(rows, years, mode);
  const series = Object.freeze(laidOut.map(item => {
    const lower = item.values.map(value => ({
      x: mapLinear(value.year, [years[0], years.at(-1)], xRange),
      y: mapLinear(value.lower, domain, yRange)
    }));
    const upper = [...item.values].reverse().map(value => ({
      x: mapLinear(value.year, [years[0], years.at(-1)], xRange),
      y: mapLinear(value.upper, domain, yRange)
    }));
    const last = item.values.at(-1);
    return Object.freeze({
      ...item,
      points: freezeRows([...lower, ...upper]),
      label: Object.freeze({
        x: layout.labelX,
        y: mapLinear((last.lower + last.upper) / 2, domain, yRange),
        text: item.job
      })
    });
  }));
  return Object.freeze({
    mode,
    domain,
    series,
    xTicks: Object.freeze(layout.xTicks.map(value => Object.freeze({
      value,
      x: mapLinear(value, [years[0], years.at(-1)], xRange),
      label: String(value)
    }))),
    yTicks: Object.freeze(tickValues.map(value => Object.freeze({
      value,
      y: mapLinear(value, domain, yRange),
      label: formatMillions(value)
    }))),
    zeroY: mapLinear(0, domain, yRange)
  });
}

export function createCenterAreaReferenceValues(jobs) {
  const aggregate = aggregateJobs(jobs);
  return Object.freeze({
    rows: aggregate.rows,
    years: aggregate.years,
    zero: panelValues(aggregate.rows, aggregate.years, "zero"),
    center: panelValues(aggregate.rows, aggregate.years, "center")
  });
}
