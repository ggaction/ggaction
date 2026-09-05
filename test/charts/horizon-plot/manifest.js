import { createHorizonExample } from "../../../examples/horizon-plot/program.js";
import { defineVisualVariant } from "../../support/visual-variants.js";
import { layout, rows, targets, revisions, bandColors, translucentBandColors } from "./reference-values.js";
import { createSignedPrimitive, createTemporalPrimitive, createBaselineStylePrimitive } from "./primitive.program.js";

export const capability = "chart-authoring";
export const visualVariants = Object.freeze([
  ["signed", "Horizon: signed amplitude", createSignedPrimitive],
  ["temporal", "Horizon: explicit timestamps", createTemporalPrimitive],
  ["baseline-style", "Horizon: baseline, bands and opacity revision", createBaselineStylePrimitive]
].map(([variant, title, primitive]) => {
  const palette = variant === "baseline-style" ? translucentBandColors : bandColors;
  const colorChecks = sign => palette[sign].map(value => ({ value, tolerance: 2, minimumPixels: 1000 }));
  return defineVisualVariant({
    chart: "horizon-plot", variant, title, primitive, userFacing: () => createHorizonExample(variant),
    width: layout.width, height: layout.height,
    callChain: `chart()\n  .createCanvas(${JSON.stringify(layout)})\n  .createData(${JSON.stringify({ id: "source", values: rows[variant] })})\n  .createHorizonPlot(${JSON.stringify(targets[variant])})${(revisions[variant] ?? []).map(edit => `\n  .${edit.op}(${JSON.stringify(edit.args)})`).join("")};`,
    artifact: { scope: "charts", capability },
    colors: [...colorChecks("negative"), ...colorChecks("positive")],
    regions: [{ name: "negative-amplitude", x: 160, y: 180, width: 320, height: 340,
      minimumInkPixels: 5000, colors: colorChecks("negative") },
      { name: "positive-amplitude", x: 520, y: 180, width: 320, height: 340,
        minimumInkPixels: 5000, colors: colorChecks("positive") }]
  });
}));
