import { chart } from "../../src/index.js";
import { cases, layout } from "./data.js";

export function createSeriesIdentity(variant = cases[0]) {
  let program = chart()
    .createCanvas({ width: layout.width, height: layout.height, margin: layout.margin })
    .createData({ values: variant.rows })
    .createLinePlot({
      id: "series",
      x: { field: "period", scale: { domain: layout.xDomain, nice: false, zero: false } },
      y: { field: "value", scale: { domain: layout.yDomain, nice: false, zero: false } },
      groupBy: variant.fields.length === 1 ? variant.fields[0] : variant.fields,
      color: { field: "continent", scale: { domain: layout.continents, range: layout.colors } },
      ...(variant.id === "tuple-color-dash" ? {
        strokeDash: { field: "scenario", scale: { domain: ["observed", "projection"], range: [[], [6, 4]] } }
      } : {}),
      line: { strokeWidth: 3 }, guides: false
    });
  if (variant.id === "series-appearance") {
    program = program
      .encodeStrokeWidth({ target: "series", field: "weight", scale: { domain: [1, 4], range: [2, 8] } })
      .encodeOpacity({ target: "series", field: "quality", scale: { domain: [1, 4], range: [0.25, 1] } });
  }
  return program
    .createGuides({
      axes: { x: { ticksAndLabels: { values: [1, 2, 3, 4] }, title: { text: "Period" } },
        y: { ticksAndLabels: { values: [0, 7, 14, 21, 28] }, title: { text: "Value" } } },
      legend: { channels: ["color"], title: "Continent" }
    })
    .createTitle({ text: variant.title, subtitle: variant.subtitle,
      titleStyle: { fontSize: 20 }, subtitleStyle: { fontSize: 12 } });
}
