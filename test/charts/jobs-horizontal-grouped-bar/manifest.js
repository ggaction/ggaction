import { loadJobs } from "../../support/data.js";
import { createJobsHorizontalGroupedBar } from
  "../../../examples/jobs-horizontal-grouped-bar/program.js";
import { defineVisualVariant } from "../../support/visual-variants.js";

import { createHorizontalGroupedBarPrimitives } from "./primitive.program.js";
import { createHorizontalGroupedBarValues } from "./reference-values.js";

const rows = loadJobs();
const values = createHorizontalGroupedBarValues(rows);

export const horizontalGroupedBarTarget = `chart()
  .createCanvas({
    width: 760,
    height: 640,
    margin: { top: 82, right: 140, bottom: 72, left: 82 }
  })
  .createData({ values: rows })
  .createBarMark()
  .encodeX({
    field: "perc",
    aggregate: "mean",
    scale: { nice: true, zero: true }
  })
  .encodeY({ field: "year", fieldType: "ordinal" })
  .encodeColor({
    field: "sex",
    layout: "group",
    scale: { palette: "tableau10" }
  })
  .encodeBarWidth({ band: 0.72 })
  .createGuides({
    axes: {
      x: { title: { text: "Mean workforce share", offset: 48 } },
      y: { title: { text: "Year", offset: 58 } }
    },
    grid: { horizontal: false, vertical: true },
    legend: { title: "Sex" }
  })
  .createTitle({
    text: "Workforce Share by Year and Sex",
    subtitle: "Mean occupation share in the jobs dataset",
    align: "center",
    offset: -1,
    titleStyle: { fontSize: 20, fontWeight: 700 },
    subtitleStyle: { fontSize: 12, color: "#475569" }
  });`;

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "jobs-horizontal-grouped-bar",
    variant: "default",
    title: "Jobs Horizontal Grouped Bar",
    callChain: horizontalGroupedBarTarget,
    artifact: {
      roadmap: "roadmap3",
      phase: "phase9",
      capability: "directional-offset"
    },
    primitive: () => createHorizontalGroupedBarPrimitives(rows),
    userFacing: () => createJobsHorizontalGroupedBar(rows),
    width: values.width,
    height: values.height,
    colors: values.scales.color.range,
    regions: [
      {
        name: "grouped-bars",
        x: values.bounds.x,
        y: values.bounds.y,
        width: values.bounds.width,
        height: values.bounds.height,
        minimumInkPixels: 1200,
        colors: values.scales.color.range
      },
      {
        name: "legend",
        x: values.bounds.x + values.bounds.width + 20,
        y: values.bounds.y,
        width: 110,
        height: 100,
        minimumInkPixels: 60,
        colors: values.scales.color.range
      }
    ]
  })
]);
