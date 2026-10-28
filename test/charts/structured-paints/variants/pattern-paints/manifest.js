import { frame, paint, styles, patternFixture } from "./fixture.js";
import { createPatternPrimitive } from "./primitive.program.js";
import { defineVisualVariant } from "../../../../support/visual-variants.js";
export { frame, styles, patternFixture } from "./fixture.js";

function displayedCalls(style) {
  const fixture = patternFixture(style);
  const create = (id, type, extra = {}) => ({ op: "createGraphics", args: { id, type, ...extra } });
  const edit = (target, property, value) => ({ op: "editGraphics", args: { target, property, value } });
  return [create("canvas", "canvas"), edit("canvas", "width", frame.width), edit("canvas", "height", frame.height), edit("canvas", "background", "white"),
    create("plot-main", "collection", { parent: "canvas" }),
    ...["underlay", "background"].flatMap(id => [create(id, "path", { parent: "plot-main" }),
      edit(id, "commands", fixture[id]), edit(id, "fillRule", "nonzero"), edit(id, "fill", paint[id])]),
    ...fixture.bars.flatMap((bar, index) => {
      const id = `pattern-${index}`;
      return [create(id, "path", { parent: "plot-main" }), edit(id, "commands", bar.commands), edit(id, "fillRule", "nonzero"),
        edit(id, "fill", bar.options.foreground), edit(id, "opacity", bar.opacity), edit(id, "clip", bar.clip)];
    }), create("labels", "text", { parent: "plot-main", length: 12 }),
    ...Object.entries({ ...fixture.labels, fill: paint.text, fontSize: 12, fontFamily: "Arial", fontWeight: "normal", textAlign: "left", textBaseline: "alphabetic", rotation: 0 })
      .map(([property, value]) => edit("labels", property, value))];
}
export const visualVariants = styles.map(style => defineVisualVariant({
  chart: "pattern-paints", variant: style, title: `${style} · coordinate space, phase, alpha and clip`, ...frame,
  primitive: () => createPatternPrimitive(style),
  callChain: "chart()\n" + displayedCalls(style).map(call => `  .${call.op}(${JSON.stringify(call.args)})`).join("\n") + ";",
  artifact: { scope: "charts", capability: "paint" },
  regions: [{ name: "pattern-panels", x: 40, y: 50, width: 510, height: 265, minimumInkPixels: 9000 }],
  colors: [{ value: paint.underlay, minimumPixels: 1000 }]
}));
