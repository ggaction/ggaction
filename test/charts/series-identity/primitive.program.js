import { chart } from "../../../src/index.js";
import { layout } from "./fixture.js";
import { referenceFor } from "./reference-values.js";

// Existing actions establish scales and guides. Explicit graphical primitives
// realize the proposed partition; no future grouping/opacity API is executed.
export function createSeriesIdentityPrimitive(variant) {
  const { paths } = referenceFor(variant);
  let program = chart()
    .createCanvas({ width: layout.width, height: layout.height, margin: layout.margin })
    .createData({ values: variant.rows })
    .createLineMark({ id: "series", strokeWidth: 3 })
    .encodeX({ field: "period", scale: { domain: layout.xDomain, nice: false, zero: false } })
    .encodeY({ field: "value", scale: { domain: layout.yDomain, nice: false, zero: false } })
    .encodeColor({ field: "continent", scale: { domain: layout.continents, range: layout.colors } })
    .createGuides({
      axes: { x: { ticksAndLabels: { values: [1, 2, 3, 4] }, title: { text: "Period" } },
        y: { ticksAndLabels: { values: [0, 7, 14, 21, 28] }, title: { text: "Value" } } },
      legend: { channels: ["color"], title: "Continent" }
    })
    .createTitle({ text: variant.title, subtitle: variant.subtitle,
      titleStyle: { fontSize: 20 }, subtitleStyle: { fontSize: 12 } })
    .editGraphics({ target: "series", property: "length", value: paths.length })
    .editGraphics({ target: "series", property: "commands", value: paths.map(path => path.commands) })
    .editGraphics({ target: "series", property: "stroke", value: paths.map(path => path.color) })
    .editGraphics({ target: "series", property: "strokeWidth", value: paths.map(path => path.width) })
    .editGraphics({ target: "series", property: "strokeDash", value: paths.map(path => path.dash) });
  if (variant.id === "series-appearance") {
    program = program.editGraphics({ target: "series", property: "opacity", value: paths.map(path => path.opacity) });
  }
  return program;
}
