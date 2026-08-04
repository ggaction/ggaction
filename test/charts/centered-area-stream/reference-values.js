export const CENTERED_AREA_JOBS = Object.freeze([
  "Farmer",
  "Operative",
  "Clerical Worker",
  "Teacher",
  "Nurse"
]);

export const CENTERED_AREA_COLORS = Object.freeze([
  "#4c78a8",
  "#f58518",
  "#e45756",
  "#72b7b2",
  "#54a24b"
]);

export const CENTERED_AREA_LAYOUT = Object.freeze({
  width: 690,
  height: 420,
  margin: Object.freeze({ top: 92, right: 142, bottom: 70, left: 72 }),
  plot: Object.freeze({ left: 72, top: 92, right: 548, bottom: 350 }),
  xDomain: Object.freeze([1850, 2000]),
  yDomain: Object.freeze([-18_000_000, 18_000_000])
});

function freezeRows(rows) {
  return Object.freeze(rows.map(row => Object.freeze(row)));
}

function mapLinear(value, domain, range) {
  const ratio = (value - domain[0]) / (domain[1] - domain[0]);
  return range[0] + ratio * (range[1] - range[0]);
}

function aggregateJobs(jobs) {
  if (!Array.isArray(jobs)) throw new TypeError("Jobs data must be an array.");
  const selected = new Set(CENTERED_AREA_JOBS);
  const partitions = new Map();
  for (const row of jobs) {
    if (row === null || typeof row !== "object" || !selected.has(row.job)) {
      continue;
    }
    if (!Number.isInteger(row.year) || !Number.isFinite(row.count)) {
      throw new TypeError("Selected Jobs rows require integer year and finite count.");
    }
    if (row.count < 0) {
      throw new RangeError("Centered area reference requires non-negative counts.");
    }
    const partition = partitions.get(row.year) ?? new Map();
    partition.set(row.job, (partition.get(row.job) ?? 0) + row.count);
    partitions.set(row.year, partition);
  }
  const years = [...partitions.keys()].sort((left, right) => left - right);
  if (years.length < 2) {
    throw new Error("Centered area reference requires at least two years.");
  }
  const rows = years.flatMap(year => CENTERED_AREA_JOBS.map(job => {
    const count = partitions.get(year).get(job);
    if (count === undefined) {
      throw new Error(`Centered area reference is missing ${job} at ${year}.`);
    }
    return { year, job, count };
  }));
  return { years: Object.freeze(years), rows: freezeRows(rows) };
}

function layoutSeries(rows, years) {
  const series = CENTERED_AREA_JOBS.map((job, index) => ({
    job,
    color: CENTERED_AREA_COLORS[index],
    values: []
  }));
  for (const year of years) {
    const counts = CENTERED_AREA_JOBS.map(job =>
      rows.find(row => row.year === year && row.job === job).count
    );
    const total = counts.reduce((sum, value) => sum + value, 0);
    let offset = -total / 2;
    counts.forEach((count, index) => {
      series[index].values.push({
        year,
        count,
        lower: offset,
        upper: offset + count
      });
      offset += count;
    });
  }
  return Object.freeze(series.map(item => Object.freeze({
    job: item.job,
    color: item.color,
    values: freezeRows(item.values)
  })));
}

export function createCenteredAreaReferenceValues(jobs) {
  const aggregate = aggregateJobs(jobs);
  const laidOut = layoutSeries(aggregate.rows, aggregate.years);
  const xRange = [CENTERED_AREA_LAYOUT.plot.left, CENTERED_AREA_LAYOUT.plot.right];
  const yRange = [CENTERED_AREA_LAYOUT.plot.bottom, CENTERED_AREA_LAYOUT.plot.top];
  const series = Object.freeze(laidOut.map(item => {
    const lower = item.values.map(value => ({
      x: mapLinear(value.year, CENTERED_AREA_LAYOUT.xDomain, xRange),
      y: mapLinear(value.lower, CENTERED_AREA_LAYOUT.yDomain, yRange)
    }));
    const upper = [...item.values].reverse().map(value => ({
      x: mapLinear(value.year, CENTERED_AREA_LAYOUT.xDomain, xRange),
      y: mapLinear(value.upper, CENTERED_AREA_LAYOUT.yDomain, yRange)
    }));
    return Object.freeze({
      ...item,
      points: freezeRows([...lower, ...upper])
    });
  }));
  return Object.freeze({
    rows: aggregate.rows,
    years: aggregate.years,
    series
  });
}
