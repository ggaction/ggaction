import { tableOptions } from "../../../examples/table/fixture.js";
import { createTable } from "../../../examples/table/program.js";
import { createTablePrimitive } from "./primitive.program.js";
import { defineVisualVariant } from "../../support/visual-variants.js";
const options = tableOptions();
export const visualVariants = [defineVisualVariant({ chart: "table", variant: "cells", title: "A keyed table with bars, sparklines and a footer",
  width: options.canvas.width, height: options.canvas.height, primitive: createTablePrimitive, userFacing: createTable,
  programEquivalence: "render", compareSemanticSpec: false,
  callChain: "chart()" + [["createCanvas", options.canvas], ["createData", options.data], ["createTablePlot", options.plot]]
    .map(([op, args]) => `\n  .${op}(${JSON.stringify(args)})`).join("") + ";",
  artifact: { scope: "charts", capability: "table" }, colors: ["#93c5fd", "#2563eb"],
  regions: [{ name: "cells", x: 20, y: 20, width: 320, height: 112, minimumInkPixels: 3000 }]
})];
