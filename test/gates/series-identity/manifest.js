import { defineVisualVariant } from "../../support/visual-variants.js";
import { cases, layout } from "./fixture.js";
import { referenceFor } from "./reference-values.js";
import { createSeriesIdentityPrimitive } from "./primitive.program.js";

export function targetCall(variant) {
  const plot = {
    id: "series", x: { field: "period", scale: { domain: layout.xDomain, nice: false, zero: false } },
    y: { field: "value", scale: { domain: layout.yDomain, nice: false, zero: false } },
    groupBy: variant.fields.length === 1 ? variant.fields[0] : variant.fields,
    color: { field: "continent", scale: { domain: layout.continents, range: layout.colors } },
    ...(variant.id === "tuple-color-dash" ? { strokeDash: { field: "scenario", scale: { domain: ["observed", "projection"], range: [[], [6, 4]] } } } : {}),
    line: { strokeWidth: 3 }, guides: false
  };
  const guides = { axes: { x: { ticksAndLabels: { values: [1, 2, 3, 4] }, title: { text: "Period" } },
    y: { ticksAndLabels: { values: [0, 7, 14, 21, 28] }, title: { text: "Value" } } },
    legend: { channels: ["color"], title: "Continent" } };
  return `chart()
  .createCanvas(${JSON.stringify({ width: layout.width, height: layout.height, margin: layout.margin }, null, 2)})
  .createData({ values: rows })
  .createLinePlot(${JSON.stringify(plot, null, 2)})${variant.id === "series-appearance" ? `
  .encodeStrokeWidth({ target: "series", field: "weight", scale: { domain: [1, 4], range: [2, 8] } })
  .encodeOpacity({ target: "series", field: "quality", scale: { domain: [1, 4], range: [0.25, 1] } })` : ""}
  .createGuides(${JSON.stringify(guides, null, 2)})
  .createTitle(${JSON.stringify({ text: variant.title, subtitle: variant.subtitle, titleStyle: { fontSize: 20 }, subtitleStyle: { fontSize: 12 } }, null, 2)});`;
}
export const visualVariants = Object.freeze(cases.map(variant => defineVisualVariant({
  chart: "series-identity", variant: variant.id, title: variant.title,
  callChain: targetCall(variant), primitive: () => createSeriesIdentityPrimitive(variant),
  width: layout.width, height: layout.height, colors: layout.colors,
  compareSemanticSpec: false, artifact: { scope: "review" },
  regions: [{ name: "series-plot", ...referenceFor(variant).plot, minimumInkPixels: 1600,
    colors: variant.id === "series-appearance" ? undefined : layout.colors }]
})));

export const inputHashes = Object.freeze({
  "country-color": "a8e746fe496e35c8104b61cae76df77e2a2c10e21577fc3776cab5d1418369cc",
  "tuple-color-dash": "1698786379b7f005b5d91e5f992cd6fe898e0657eb406762b86e2e9f057352c9",
  "series-appearance": "9d4036fd5504899eeee55c9036ac2d31d83d74be20e353814c07b3d694e0bcb8"
});
