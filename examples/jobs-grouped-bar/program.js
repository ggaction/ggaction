import { chart } from "../../src/index.js";

export function createJobsGroupedBar(jobs) {
  const rows = jobs.filter(
    row =>
      Number.isFinite(row.year) &&
      Number.isFinite(row.perc) &&
      typeof row.sex === "string" &&
      row.sex.length > 0
  );

  return chart()
    .createCanvas({
      width: 720,
      height: 460,
      margin: { top: 40, right: 140, bottom: 70, left: 80 }
    })
    .createData({ id: "jobs", values: rows })
    .createBarMark({ id: "bars" })
    .encodeX({ field: "year", fieldType: "ordinal" })
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
