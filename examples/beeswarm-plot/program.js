import { chart } from "../../src/index.js";

export const beeswarmRows = Object.freeze([
  { id: "a1", group: "A", value: 2.0 },
  { id: "a2", group: "A", value: 2.0 },
  { id: "a3", group: "A", value: 2.0 },
  { id: "a4", group: "A", value: 3.1 },
  { id: "a5", group: "A", value: 3.1 },
  { id: "b1", group: "B", value: 1.5 },
  { id: "b2", group: "B", value: 1.5 },
  { id: "b3", group: "B", value: 2.7 },
  { id: "b4", group: "B", value: 2.7 },
  { id: "b5", group: "B", value: 2.7 },
  { id: "c1", group: "C", value: 2.2 },
  { id: "c2", group: "C", value: 2.2 },
  { id: "c3", group: "C", value: 3.6 },
  { id: "c4", group: "C", value: 3.6 }
].map(Object.freeze));

export function createBeeswarmExample(values = beeswarmRows) {
  return chart()
    .createCanvas({ width: 520, height: 340, margin: 55 })
    .createData({ id: "data", values })
    .createBeeswarmPlot({
      id: "swarm",
      x: { field: "group", fieldType: "nominal", scale: { domain: ["A", "B", "C"] } },
      y: { field: "value", fieldType: "quantitative", scale: { domain: [1, 4], zero: false } },
      point: { radius: 5, fill: "#4c78a8", stroke: "white", strokeWidth: 1 },
      packing: { key: "id", padding: 1 },
      guides: {
        axes: {
          x: { title: { text: "Group" } },
          y: { title: { text: "Value" } }
        },
        grid: { horizontal: true, vertical: false },
        legend: false
      }
    });
}
