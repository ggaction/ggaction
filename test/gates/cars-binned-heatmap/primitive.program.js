import { chart } from "../../../src/index.js";

import {
  BINNED_HEATMAP_FIELDS,
  BINNED_HEATMAP_LAYOUT,
  createCarsBinnedHeatmapReference
} from "./fixture.js";

export function createCarsBinnedHeatmapPrimitives(cars) {
  const reference = createCarsBinnedHeatmapReference(cars);
  const countMaximum = Math.max(...reference.rows.map(row => row.count));

  return chart()
    .createCanvas({
      width: BINNED_HEATMAP_LAYOUT.width,
      height: BINNED_HEATMAP_LAYOUT.height,
      margin: BINNED_HEATMAP_LAYOUT.margin
    })
    .createData({ id: "carsWeightMpgCells", values: reference.rows })
    .createRectMark({
      id: "heatmap",
      data: "carsWeightMpgCells",
      stroke: "#ffffff",
      strokeWidth: 1
    })
    .encodeX({
      target: "heatmap",
      field: BINNED_HEATMAP_FIELDS.x0,
      fieldType: "quantitative",
      scale: {
        type: "linear",
        domain: BINNED_HEATMAP_LAYOUT.xExtent,
        nice: false,
        zero: false
      }
    })
    .encodeX2({
      target: "heatmap",
      field: BINNED_HEATMAP_FIELDS.x1,
      fieldType: "quantitative"
    })
    .encodeY({
      target: "heatmap",
      field: BINNED_HEATMAP_FIELDS.y0,
      fieldType: "quantitative",
      scale: {
        type: "linear",
        domain: BINNED_HEATMAP_LAYOUT.yExtent,
        nice: false,
        zero: false
      }
    })
    .encodeY2({
      target: "heatmap",
      field: BINNED_HEATMAP_FIELDS.y1,
      fieldType: "quantitative"
    })
    .encodeColor({
      target: "heatmap",
      field: BINNED_HEATMAP_FIELDS.count,
      fieldType: "quantitative",
      scale: {
        type: "sequential",
        domain: [0, countMaximum],
        palette: "blues"
      }
    })
    .createGuides({
      axes: {
        x: { title: { text: "Vehicle weight (lb)" } },
        y: { title: { text: "Miles per gallon" } }
      },
      grid: false,
      legend: {
        title: "Cars per bin",
        position: "right"
      }
    })
    .createTitle({
      text: "Fuel Economy by Vehicle Weight",
      subtitle: "398 cars binned into a 10 × 8 grid",
      align: "center"
    });
}
