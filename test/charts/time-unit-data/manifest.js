import { defineVisualVariant } from "../../support/visual-variants.js";

import { createTimeUnitComparisonPrimitives } from "./primitive.program.js";
import { createTimeUnitComparison } from "./public.program.js";
import { TIME_UNIT_LAYOUT } from "./reference-values.js";

export const bucketedCallChain = `chart()
  .createCanvas({ width: 440, height: 360 })
  .createData({ id: "events", values: rows })
  .createTimeUnitData({
    id: "monthlyEvents",
    field: "date",
    unit: "month",
    as: "month"
  })
  .createScatterPlot({
    id: "bucketedEvents",
    data: "monthlyEvents",
    x: { field: "month", fieldType: "temporal" },
    y: { field: "order", fieldType: "quantitative" }
  })
  .encodePointRadius({ target: "bucketedEvents", value: 7 })
  .createTitle({
    text: "After",
    subtitle: "Each event snaps to its UTC month start",
    align: "center"
  });`;

export const comparisonCallChain = `hconcat({
  id: "timeUnitComparison",
  programs: [
    { id: "raw", program: raw },
    { id: "bucketed", program: bucketed }
  ],
  gap: 24,
  padding: 12,
  align: "start"
});`;

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "time-unit-data",
    variant: "month-bucketing",
    title: "Raw Dates and UTC Month Buckets",
    callChain: comparisonCallChain,
    artifact: { capability: "data" },
    programEquivalence: "render",
    primitive: createTimeUnitComparisonPrimitives,
    userFacing: createTimeUnitComparison,
    width: TIME_UNIT_LAYOUT.padding * 2 +
      TIME_UNIT_LAYOUT.panelWidth * 2 + TIME_UNIT_LAYOUT.gap,
    height: TIME_UNIT_LAYOUT.padding * 2 + TIME_UNIT_LAYOUT.panelHeight,
    colors: ["#f59e0b", "#2563eb"],
    regions: [
      {
        name: "raw event dates",
        x: TIME_UNIT_LAYOUT.padding,
        y: TIME_UNIT_LAYOUT.padding,
        width: TIME_UNIT_LAYOUT.panelWidth,
        height: TIME_UNIT_LAYOUT.panelHeight,
        minimumInkPixels: 800
      },
      {
        name: "UTC month buckets",
        x: TIME_UNIT_LAYOUT.padding + TIME_UNIT_LAYOUT.panelWidth +
          TIME_UNIT_LAYOUT.gap,
        y: TIME_UNIT_LAYOUT.padding,
        width: TIME_UNIT_LAYOUT.panelWidth,
        height: TIME_UNIT_LAYOUT.panelHeight,
        minimumInkPixels: 800
      }
    ]
  })
]);
