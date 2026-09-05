import { defineVisualVariant } from "../../support/visual-variants.js";
import { cases, layout } from "./fixture.js";
import { referenceFor } from "./reference-values.js";
import { createTemporalInputPrimitive } from "./primitive.program.js";
export function targetCall(variant) {
  const plot = { id: "events", x: { field: "time", fieldType: "temporal", temporalUnit: variant.unit, scale: { nice: false } },
    y: { field: "value", scale: { domain: layout.yDomain, nice: false, zero: false } }, point: { fill: layout.color },
    guides: { axes: { x: { ticksAndLabels: { values: referenceFor(variant).timestamps }, title: { text: "Time (UTC)" } },
      y: { ticksAndLabels: { values: [0, 1, 2, 3] }, title: { text: "Value" } } }, legend: false } };
  return `chart()
  .createCanvas(${JSON.stringify({ width: layout.width, height: layout.height, margin: layout.margin }, null, 2)})
  .createData({ values: [{ time: 1000, value: 1 }, { time: 2000, value: 2 }] })
  .createScatterPlot(${JSON.stringify(plot, null, 2)})
  .createTitle(${JSON.stringify({ text: variant.title, subtitle: variant.subtitle, titleStyle: { fontSize: 20 }, subtitleStyle: { fontSize: 13 } }, null, 2)});`;
}
export const visualVariants = Object.freeze(cases.map(variant => defineVisualVariant({
  chart: "temporal-input", variant: variant.id, title: variant.title,
  callChain: targetCall(variant), primitive: () => createTemporalInputPrimitive(variant),
  width: layout.width, height: layout.height, colors: [layout.color],
  compareSemanticSpec: false, artifact: { scope: "review" },
  regions: [{ name: "time-plot", ...referenceFor(variant).plot, minimumInkPixels: 400 }]
})));

export const inputHashes = Object.freeze({
  "timestamp": "71af39b3cc53c3a6a6e30eb97e5f9e3e92cbe6266c445db0d1006765fe573672",
  "year": "43fbe7a00990a5531dc8ddbdb9848d90d50dfac146812badd9ca7a410e274e88",
  "auto": "4aba6446fc8de57e7b2e7e0fb370ea3998a1f78f0ac3aff71351afaf26fee3d8"
});
