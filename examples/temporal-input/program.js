import { chart } from "../../src/index.js";
import { cases, rows, layout } from "./data.js";

export function createTemporalInput(variant = cases[0]) {
  const ticks = variant.unit === "timestamp" ? [1000, 2000] : [-30610224000000, 946684800000];
  return chart()
    .createCanvas({ width: layout.width, height: layout.height, margin: layout.margin })
    .createData({ values: rows })
    .createScatterPlot({
      id: "events",
      x: { field: "time", fieldType: "temporal", temporalUnit: variant.unit, scale: { nice: false } },
      y: { field: "value", scale: { domain: layout.yDomain, nice: false, zero: false } },
      point: { fill: layout.color },
      guides: {
        axes: { x: { ticksAndLabels: { values: ticks }, title: { text: "Time (UTC)" } },
          y: { ticksAndLabels: { values: [0, 1, 2, 3] }, title: { text: "Value" } } },
        legend: false
      }
    })
    .createTitle({ text: variant.title, subtitle: variant.subtitle,
      titleStyle: { fontSize: 20 }, subtitleStyle: { fontSize: 13 } });
}
