import { chart } from "../../src/index.js";

function validJobsRows(jobs, field) {
  return jobs.filter(
    row =>
      Number.isFinite(row.year) &&
      Number.isFinite(row[field]) &&
      typeof row.sex === "string" &&
      row.sex.length > 0
  );
}

export function createJobsGroupedBar(jobs) {
  const rows = validJobsRows(jobs, "perc");

  return chart()
    .createCanvas({
      width: 720,
      height: 460,
      margin: { top: 40, right: 140, bottom: 70, left: 80 }
    })
    .createData({ id: "jobs", values: rows })
    .createBarPlot({
      id: "bars",
      x: { field: "year", fieldType: "ordinal" },
      y: {
        field: "perc",
        aggregate: "mean",
        scale: { nice: true, zero: false }
      },
      color: {
        field: "sex",
        layout: "group",
        scale: { palette: "tableau10" }
      },
      width: { band: 0.72 }
    });
}

function createJobsBar(
  jobs,
  {
    field = "perc",
    layout = "group",
    width = { band: 0.72 },
    offset,
    guides
  } = {}
) {
  const rows = validJobsRows(jobs, field);

  let program = chart()
    .createCanvas({
      width: 720,
      height: 460,
      margin: { top: 40, right: 140, bottom: 70, left: 80 }
    })
    .createData({ id: "jobs", values: rows })
    .createBarMark({ id: "bars" })
    .encodeX({ field: "year", fieldType: "ordinal" })
    .encodeY({
      field,
      aggregate: "mean",
      scale: { nice: true, zero: false }
    })
    .encodeColor({
      field: "sex",
      layout,
      scale: { palette: "tableau10" }
    });
  if (offset !== undefined) {
    program = program.encodeXOffset({ field: "sex", ...offset });
  }
  return program
    .encodeBarWidth(width)
    .createGuides(guides);
}

export function createJobsOverlayBar(jobs) {
  return createJobsBar(jobs, { layout: "overlay" });
}

export function createJobsDivergingBar(jobs) {
  return createJobsBar(jobs, { field: "signedPerc", layout: "diverging" });
}

export function createJobsFixedPixelBar(jobs) {
  return createJobsBar(jobs, { width: { pixels: 14 } });
}

export function createJobsOffsetPaddingBar(jobs) {
  return createJobsBar(jobs, {
    offset: { paddingInner: 0.2, paddingOuter: 0.1 }
  });
}

export function createJobsGroupReassignmentBar(jobs) {
  return createJobsBar(jobs, {
    guides: { legend: { title: "Occupation" } }
  }).encodeColor({ field: "job", layout: "group" });
}

export function createJobsTemporalXBar(jobs) {
  const rows = validJobsRows(jobs, "perc");
  return chart()
    .createCanvas({
      width: 720,
      height: 460,
      margin: { top: 40, right: 140, bottom: 70, left: 80 }
    })
    .createData({ id: "jobs", values: rows })
    .createBarMark({ id: "bars" })
    .encodeX({ field: "year", fieldType: "temporal" })
    .encodeY({
      field: "perc",
      aggregate: "mean",
      scale: { nice: true, zero: false }
    })
    .encodeColor({
      field: "sex",
      layout: "group",
      scale: { palette: "tableau10" }
    })
    .encodeBarWidth({ band: 0.72 })
    .createGuides();
}

export function createJobsHorizontalBar(jobs) {
  const rows = validJobsRows(jobs, "perc");
  return chart()
    .createCanvas({
      width: 720,
      height: 460,
      margin: { top: 40, right: 140, bottom: 70, left: 80 }
    })
    .createData({ id: "jobs", values: rows })
    .createBarMark({ id: "bars" })
    .encodeX({
      field: "perc",
      aggregate: "mean",
      scale: { nice: true, zero: true }
    })
    .encodeY({ field: "year", fieldType: "ordinal" })
    .encodeColor({
      field: "sex",
      layout: "stack",
      scale: { palette: "tableau10" }
    })
    .encodeBarWidth({ band: 0.72 })
    .createGuides();
}
