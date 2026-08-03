import { defineVisualVariant } from "../../support/visual-variants.js";
import { loadJobs } from "../../support/data.js";

import { createCenteredAreaStreamPrimitives } from "./primitive.program.js";
import {
  CENTER_AREA_COLORS,
  CENTER_AREA_LAYOUT
} from "./reference-values.js";

const jobs = loadJobs();

export const comparisonCallChain = `hconcat({
  id: "centeredAreaStreamComparison",
  programs: [
    { id: "zero", program: zero },
    { id: "center", program: center }
  ],
  gap: 20,
  padding: 8,
  align: "start"
});`;

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "centered-area-stream",
    variant: "jobs-zero-vs-center",
    title: "Jobs Area · Zero Stack vs Center Stack",
    callChain: comparisonCallChain,
    artifact: { scope: "review" },
    primitive: () => createCenteredAreaStreamPrimitives(jobs),
    width: CENTER_AREA_LAYOUT.padding * 2 +
      CENTER_AREA_LAYOUT.panelWidth * 2 + CENTER_AREA_LAYOUT.gap,
    height: CENTER_AREA_LAYOUT.padding * 2 + CENTER_AREA_LAYOUT.panelHeight,
    colors: CENTER_AREA_COLORS.map(value => ({ value, minimumPixels: 500 })),
    regions: ["zero stack", "center stack"].map((name, index) => ({
      name,
      x: CENTER_AREA_LAYOUT.padding + index * (
        CENTER_AREA_LAYOUT.panelWidth + CENTER_AREA_LAYOUT.gap
      ),
      y: CENTER_AREA_LAYOUT.padding,
      width: CENTER_AREA_LAYOUT.panelWidth,
      height: CENTER_AREA_LAYOUT.panelHeight,
      minimumInkPixels: 1_500
    }))
  })
]);
