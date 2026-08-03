import { defineVisualVariant } from "../../support/visual-variants.js";
import { loadJobs } from "../../support/data.js";

import { createCenteredAreaStreamPrimitives } from "./primitive.program.js";
import { createCenteredAreaStream } from "./public.program.js";
import {
  CENTERED_AREA_COLORS,
  CENTERED_AREA_LAYOUT
} from "./reference-values.js";

const jobs = loadJobs();

export const centerCallChain = `chart()
  .createCanvas({ width: 690, height: 420 })
  .createData({ id: "jobs", values })
  .createAreaMark({ id: "occupations", opacity: 1 })
  .encodeX({ target: "occupations", field: "year" })
  .encodeY({ target: "occupations", field: "count" })
  .encodeColor({
    target: "occupations",
    field: "job",
    layout: "center"
  })
  .createGuides()
  .createTitle({ text: "U.S. occupation counts" });`;

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "centered-area-stream",
    variant: "jobs-center-stack",
    title: "Jobs Center-stacked Area",
    callChain: centerCallChain,
    artifact: { capability: "center-stacked-area" },
    primitive: () => createCenteredAreaStreamPrimitives(jobs),
    userFacing: () => createCenteredAreaStream(jobs),
    width: CENTERED_AREA_LAYOUT.width,
    height: CENTERED_AREA_LAYOUT.height,
    colors: CENTERED_AREA_COLORS.map(value => ({ value, minimumPixels: 300 })),
    regions: [{
      name: "center-stacked occupations",
      x: CENTERED_AREA_LAYOUT.plot.left,
      y: CENTERED_AREA_LAYOUT.plot.top,
      width: CENTERED_AREA_LAYOUT.plot.right - CENTERED_AREA_LAYOUT.plot.left,
      height: CENTERED_AREA_LAYOUT.plot.bottom - CENTERED_AREA_LAYOUT.plot.top,
      minimumInkPixels: 1_500
    }]
  })
]);
