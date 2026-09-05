import { areaLayoutExamples } from "../../../examples/area-layout/program.js";
import { defineVisualVariant } from "../../support/visual-variants.js";
import { targetDefinitions } from "./reference-values.js";
import { createAreaPrimitive, createBarPrimitive } from "./primitive.program.js";

const titles = {
  "area-simple": "Area: zero baseline",
  "area-signed-baseline": "Area: signed values around baseline 1",
  "area-horizontal-log": "Area: horizontal log scale with baseline 1",
  "ribbon-crossing": "Ribbon: preserve crossing boundaries",
  "area-missing-break": "Area: two segments with a missing middle sample",
  "area-stack": "Area: stack identity separate from color",
  "area-fill": "Area: normalized series thickness",
  "area-diverging": "Area: independent positive and negative accumulation",
  "area-center": "Area: centered total thickness",
  "bar-independent-stack": "Bars: stack series without color",
  "bar-layout-roundtrip": "Bars: final group state after group, stack, group"
};

export const visualVariants = Object.freeze(targetDefinitions.map(target => {
  const bar = target.id.startsWith("bar-");
  const colored = ["area-stack", "area-fill", "area-diverging", "area-center"].includes(target.id);
  const colors = (bar ? ["#4c78a8"] : colored ? ["#dbe4ee", "#fde7d2"] : ["#dbe4ee"])
    .map(value => ({ value, tolerance: 2, minimumPixels: 100 }));
  const region = { name: "plot-area", x: 155, y: 155, width: 690, height: 390,
    minimumInkPixels: 1000, colors };
  return defineVisualVariant({
    chart: "area-layout", variant: target.id, title: titles[target.id],
    userFacing: areaLayoutExamples[target.id],
    primitive: () => bar ? createBarPrimitive(target.id) : createAreaPrimitive(target.id),
    width: target.dimensions.width, height: target.dimensions.height,
    callChain: "chart()\n" + target.publicCalls.map(call => `  .${call.op}(${JSON.stringify(call.args)})`).join("\n") + ";",
    colors, regions: [region], artifact: { scope: "charts", capability: "series-layout" }
  });
}));
