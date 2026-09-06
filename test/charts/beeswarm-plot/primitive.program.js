import { chart } from "../../../src/index.js";
import { beeswarmRows } from "../../../examples/beeswarm-plot/program.js";

export function createBeeswarmPrimitive(values = beeswarmRows) {
  return chart()
    .createCanvas({ width: 520, height: 340, margin: 55 })
    .createData({ id: "data", values })
    .createStripPlot({
      id: "swarm",
      x: { field: "group", fieldType: "nominal", scale: { id: "swarmX", domain: ["A", "B", "C"] } },
      y: { field: "value", fieldType: "quantitative", scale: { id: "swarmY", domain: [1, 4], zero: false } },
      point: { radius: 5, fill: "#4c78a8", stroke: "white", strokeWidth: 1 },
      guides: {
        axes: {
          x: { title: { text: "Group" } },
          y: { title: { text: "Value" } }
        },
        grid: { horizontal: true, vertical: false },
        legend: false
      }
    })
    .packPoints({ target: "swarm", channel: "x", key: "id", padding: 1 });
}
