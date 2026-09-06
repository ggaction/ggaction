import { defineVisualVariant } from "../../support/visual-variants.js";
import { createDotPlotExample } from "../../../examples/dot-plot/program.js";
import { createLollipopPlotExample } from "../../../examples/lollipop-plot/program.js";
import { createDumbbellPlotExample } from "../../../examples/dumbbell-plot/program.js";
import {
  createDotPrimitive, createLollipopPrimitive, createDumbbellPrimitive
} from "./primitive.program.js";

const shared = {
  width: 480,
  height: 320,
  colors: ["#4c78a8"],
  regions: [{ name: "endpoint geometry", x: 40, y: 40, width: 400, height: 240, minimumInkPixels: 20 }],
  artifact: false
};

export const visualVariants = Object.freeze([
  defineVisualVariant({ ...shared, chart: "dot-plot", variant: "raw-horizontal", title: "Dot Plot", callChain: "program.createDotPlot({ id: \"dot\", category: \"category\", value: \"value\", guides: false });", primitive: createDotPrimitive, userFacing: createDotPlotExample }),
  defineVisualVariant({ ...shared, chart: "lollipop-plot", variant: "zero-baseline", title: "Lollipop Plot", callChain: "program.createLollipopPlot({ id: \"lollipop\", category: \"category\", value: \"value\", baseline: 0, guides: false });", primitive: createLollipopPrimitive, userFacing: createLollipopPlotExample }),
  defineVisualVariant({ ...shared, chart: "dumbbell-plot", variant: "role-preserving", title: "Dumbbell Plot", callChain: "program.createDumbbellPlot({ id: \"dumbbell\", category: \"category\", start: \"before\", end: \"after\", guides: false });", primitive: createDumbbellPrimitive, userFacing: createDumbbellPlotExample })
]);
