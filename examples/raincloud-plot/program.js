import { chart } from "../../src/index.js";

export const raincloudRows = Object.freeze([
  { id: "a1", group: "Control", value: 42 },
  { id: "a2", group: "Control", value: 45 },
  { id: "a3", group: "Control", value: 47 },
  { id: "a4", group: "Control", value: 49 },
  { id: "a5", group: "Control", value: 52 },
  { id: "a6", group: "Control", value: 54 },
  { id: "b1", group: "Treatment", value: 48 },
  { id: "b2", group: "Treatment", value: 52 },
  { id: "b3", group: "Treatment", value: 55 },
  { id: "b4", group: "Treatment", value: 58 },
  { id: "b5", group: "Treatment", value: 61 },
  { id: "b6", group: "Treatment", value: 64 },
  { id: "c1", group: "Follow-up", value: 53 },
  { id: "c2", group: "Follow-up", value: 57 },
  { id: "c3", group: "Follow-up", value: 60 },
  { id: "c4", group: "Follow-up", value: 63 },
  { id: "c5", group: "Follow-up", value: 67 },
  { id: "c6", group: "Follow-up", value: 70 }
].map(Object.freeze));

export function createRaincloudExample(values = raincloudRows) {
  return chart()
    .createCanvas({ width: 680, height: 420, margin: 65 })
    .createData({ id: "data", values })
    .createRaincloudPlot({
      id: "distribution",
      data: "data",
      category: {
        field: "group",
        fieldType: "nominal",
        scale: { domain: ["Control", "Treatment", "Follow-up"] }
      },
      value: {
        field: "value",
        fieldType: "quantitative",
        scale: { domain: [38, 74], zero: false }
      },
      color: "group",
      density: {
        bandwidth: 3.5,
        steps: 48,
        area: { opacity: 0.35, strokeWidth: 1.5, curve: "monotone" }
      },
      summary: {
        type: "box",
        outliers: false,
        box: { opacity: 0.75 },
        median: { stroke: "#0f172a", strokeWidth: 2 }
      },
      points: {
        type: "beeswarm",
        point: { radius: 3.5, stroke: "white", strokeWidth: 1 },
        packing: { key: "id", padding: 1 }
      },
      guides: {
        axes: {
          x: { title: { text: "Study group" } },
          y: { title: { text: "Score" } }
        },
        grid: { horizontal: true, vertical: false },
        legend: false
      }
    });
}
