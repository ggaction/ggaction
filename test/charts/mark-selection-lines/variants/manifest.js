import { defineVisualVariant } from "../../../support/visual-variants.js";
import { loadCars } from "../../../support/data.js";
import { createJapanLineHighlightPrimitive } from "../primitive.program.js";
import { createJapanLineSeriesHighlight } from "../../../../examples/mark-selection/program.js";
import {
  LINE_HIGHLIGHT_LAYOUT,
  LINE_HIGHLIGHT_TARGET
} from "../reference-values.js";

export const lineHighlightCallChain = `chart()
  .createCanvas({
    width: 720,
    height: 460,
    margin: { top: 80, right: 170, bottom: 60, left: 80 }
  })
  .createData({ id: "cars", values: rows })
  .createLineMark({ id: "trends" })
  .encodeX({
    field: "Year",
    fieldType: "temporal",
    scale: { nice: true }
  })
  .encodeY({
    field: "Acceleration",
    aggregate: "mean",
    scale: { nice: true, zero: false }
  })
  .encodeColor({
    field: "Origin",
    scale: { palette: "tableau10" }
  })
  .encodeStrokeDash({ field: "Origin" })
  .createGuides({
    axes: { y: { ticksAndLabels: { count: 6 } } }
  })
  .createTitle({
    text: "The trend of acceleration by year",
    subtitle: "from 1970 to 1982"
  })
  .highlightMarks({
    target: "trends",
    select: { field: "Origin", op: "eq", value: "Japan" },
    stroke: "#dc2626",
    strokeWidth: 5,
    strokeDash: "dashed",
    opacity: 1,
    dimOthers: { opacity: 0.16 },
    bringToFront: true
  });`;

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "mark-selection",
    variant: "line-series-japan",
    title: "Japan Line-Series Highlight",
    callChain: lineHighlightCallChain,
    primitive: () => createJapanLineHighlightPrimitive(loadCars()),
    userFacing: () => createJapanLineSeriesHighlight(loadCars()),
    width: LINE_HIGHLIGHT_LAYOUT.width,
    height: LINE_HIGHLIGHT_LAYOUT.height,
    colors: [LINE_HIGHLIGHT_TARGET.stroke],
    regions: [
      {
        name: "plot",
        x: 80,
        y: 80,
        width: 470,
        height: 320,
        colors: [LINE_HIGHLIGHT_TARGET.stroke]
      }
    ]
  })
]);
