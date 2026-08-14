import { chart } from "../../src/index.js";

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
  margin: Object.freeze({ top: 92, right: 142, bottom: 70, left: 96 }),
  yDomain: Object.freeze([-18_000_000, 18_000_000])
});

export function createCenteredAreaRows(jobs) {
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
      throw new RangeError("Centered area rows require non-negative counts.");
    }
    const partition = partitions.get(row.year) ?? new Map();
    partition.set(row.job, (partition.get(row.job) ?? 0) + row.count);
    partitions.set(row.year, partition);
  }
  const years = [...partitions.keys()].sort((left, right) => left - right);
  if (years.length < 2) {
    throw new Error("Centered area rows require at least two years.");
  }
  return Object.freeze(years.flatMap(year => CENTERED_AREA_JOBS.map(job => {
    const count = partitions.get(year).get(job);
    if (count === undefined) {
      throw new Error(`Centered area rows are missing ${job} at ${year}.`);
    }
    return Object.freeze({ year, job, count });
  })));
}

export function createCenteredAreaStream(jobs) {
  return chart()
    .createCanvas({
      width: CENTERED_AREA_LAYOUT.width,
      height: CENTERED_AREA_LAYOUT.height,
      margin: CENTERED_AREA_LAYOUT.margin
    })
    .createData({ id: "jobs", values: createCenteredAreaRows(jobs) })
    .createAreaMark({ id: "occupations", opacity: 1 })
    .encodeX({
      target: "occupations",
      field: "year",
      fieldType: "quantitative"
    })
    .encodeY({
      target: "occupations",
      field: "count",
      fieldType: "quantitative",
      scale: {
        domain: CENTERED_AREA_LAYOUT.yDomain,
        nice: false,
        zero: false
      }
    })
    .encodeColor({
      target: "occupations",
      field: "job",
      fieldType: "nominal",
      layout: "center",
      scale: { range: CENTERED_AREA_COLORS }
    })
    .createGuides({
      axes: {
        x: { title: { text: "Year" } },
        y: { title: { text: "Count" } }
      },
      grid: { horizontal: {}, vertical: false },
      legend: { position: "right" }
    })
    .createTitle({
      text: "U.S. occupation counts",
      subtitle: "Center-stacked around half of each year's total"
    });
}
