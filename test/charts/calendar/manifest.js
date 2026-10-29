import { calendarOptions, canvas, variants } from "../../../examples/calendar/fixture.js";
import { createCalendar } from "../../../examples/calendar/program.js";
import { defineVisualVariant } from "../../support/visual-variants.js";
import { createCalendarPrimitive } from "./primitive.program.js";
export const visualVariants = variants.map(variant => {
  const options = calendarOptions(variant.id), calls = [["createCanvas", options.canvas], ["createData", options.data],
    ["createCalendarLayout", options.layout], ["createCalendarPlot", options.plot], ["createTitle", options.title]];
  return defineVisualVariant({ chart: variant.chart, variant: variant.id, title: variant.title,
    width: canvas.width, height: canvas.height, primitive: () => createCalendarPrimitive(variant.id), userFacing: () => createCalendar(variant.id),
    programEquivalence: "render", compareSemanticSpec: false,
    callChain: "chart()" + calls.map(([op, value]) => `\n  .${op}(${JSON.stringify(value)})`).join("") + ";",
    artifact: { scope: "charts", capability: "calendar" }, colors: ["#2563eb"],
    regions: [{ name: "calendar", x: 40, y: 80, width: 1000, height: 240, minimumInkPixels: 1000 }]
  });
});
