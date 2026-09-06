import { defineVisualVariant } from "../../support/visual-variants.js";
import { createRepeatChartsExample } from "../../../examples/repeat-charts/program.js";
import { createRepeatChartsPrimitive } from "./primitive.program.js";

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "repeat-charts",
    variant: "three-independent-metrics",
    title: "Repeated Metric Charts",
    callChain: "program.repeatCharts({ id: \"metrics\", target: \"product\", channel: \"x\", fields: [\"speed\", \"quality\", \"cost\"], gap: 14, guides: { legend: \"shared\" } });",
    primitive: createRepeatChartsPrimitive,
    userFacing: createRepeatChartsExample,
    width: 838,
    height: 150,
    colors: ["#4c78a8", "#f58518", "#0f172a"],
    regions: [
      { name: "metric panels", x: 0, y: 0, width: 688, height: 150, minimumInkPixels: 40 },
      { name: "shared legend", x: 700, y: 35, width: 120, height: 100, minimumInkPixels: 20 }
    ],
    programEquivalence: "render",
    artifact: false
  })
]);
