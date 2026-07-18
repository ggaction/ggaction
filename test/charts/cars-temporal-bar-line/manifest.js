import { loadCars } from "../../support/data.js";
import { defineVisualVariant } from "../../support/visual-variants.js";
import { createCarsTemporalBarLine } from
  "../../../examples/cars-temporal-bar-line/program.js";

import { createCarsTemporalBarLinePrimitives } from "./primitive.program.js";
import { createCarsTemporalBarLineValues } from "./reference-values.js";

const rows = loadCars();
const values = createCarsTemporalBarLineValues(rows);

export const carsTemporalBarLineTarget = `chart()
  .createCanvas({
    width: 720,
    height: 440,
    margin: { top: 64, right: 50, bottom: 64, left: 72 }
  })
  .createData({ values: rows })
  .createBarMark({ id: "bars", fill: "#bfdbfe" })
  .encodeX({ field: "Year", fieldType: "temporal" })
  .encodeY({ field: "Acceleration", aggregate: "mean" })
  .createLineMark({ id: "trend", stroke: "#1d4ed8", strokeWidth: 3 })
  .createGuides({
    axes: {
      x: { title: { text: "Year" } },
      y: { title: { text: "Mean acceleration" } }
    },
    legend: false
  })
  .createTitle({
    text: "Average Acceleration by Model Year",
    subtitle: "Shared temporal scale for bars and trend",
    align: "center",
    titleStyle: { color: "#334155", fontSize: 18, fontWeight: 700 },
    subtitleStyle: { fontSize: 12 }
  });`;

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "cars-temporal-bar-line",
    variant: "shared-position",
    title: "Cars Temporal Bar and Line",
    callChain: carsTemporalBarLineTarget,
    artifact: {
      roadmap: "roadmap3",
      phase: "phase10",
      capability: "shared-position-scale"
    },
    primitive: () => createCarsTemporalBarLinePrimitives(rows),
    userFacing: () => createCarsTemporalBarLine(rows),
    width: values.width,
    height: values.height,
    colors: ["#bfdbfe", "#1d4ed8"],
    regions: [{
      name: "shared-position-plot",
      x: values.bounds.x,
      y: values.bounds.y,
      width: values.bounds.width,
      height: values.bounds.height,
      minimumInkPixels: 1800,
      colors: ["#bfdbfe", "#1d4ed8"]
    }]
  })
]);
