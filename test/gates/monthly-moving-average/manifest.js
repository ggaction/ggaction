import { defineVisualVariant } from "../../support/visual-variants.js";

import { createAirlinePassengerMovingWindowPrimitives } from
  "./primitive.program.js";
import { MOVING_WINDOW_LAYOUT } from "./reference-values.js";

export const trailingMeanCallChain = `monthly.createWindowData({
  id: "trailingMean",
  sortBy: [{ field: "month" }],
  operations: [{
    op: "movingMean",
    field: "passengers",
    as: "movingMean",
    frame: { preceding: 2 }
  }]
});`;

export const centeredMeanCallChain = `monthly.createWindowData({
  id: "centeredMean",
  sortBy: [{ field: "month" }],
  operations: [{
    op: "movingMean",
    field: "passengers",
    as: "movingMean",
    frame: { preceding: 2, following: 2 }
  }]
});`;

export const trailingSumCallChain = `monthly.createWindowData({
  id: "trailingSum",
  sortBy: [{ field: "month" }],
  operations: [{
    op: "movingSum",
    field: "passengers",
    as: "movingSum",
    frame: { preceding: 2 }
  }]
});`;

export const comparisonCallChain = `hconcat({
  id: "airlinePassengerMovingWindows",
  programs: [
    { id: "trailingMean", program: trailingMean },
    { id: "centeredMean", program: centeredMean },
    { id: "trailingSum", program: trailingSum }
  ],
  gap: 20,
  padding: 6,
  align: "start"
});`;

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "airline-passenger-moving-windows",
    variant: "trailing-centered-and-sum",
    title: "U.S. Airline Passenger Moving Windows",
    callChain: comparisonCallChain,
    artifact: { scope: "review" },
    primitive: createAirlinePassengerMovingWindowPrimitives,
    width: MOVING_WINDOW_LAYOUT.padding * 2 +
      MOVING_WINDOW_LAYOUT.panelWidth * 3 + MOVING_WINDOW_LAYOUT.gap * 2,
    height: MOVING_WINDOW_LAYOUT.padding * 2 + MOVING_WINDOW_LAYOUT.panelHeight,
    colors: ["#f59e0b", "#2563eb", "#059669", "#7c3aed"],
    regions: ["trailing mean", "centered mean", "trailing sum"].map(
      (name, index) => ({
        name,
        x: MOVING_WINDOW_LAYOUT.padding + index * (
          MOVING_WINDOW_LAYOUT.panelWidth + MOVING_WINDOW_LAYOUT.gap
        ),
        y: MOVING_WINDOW_LAYOUT.padding,
        width: MOVING_WINDOW_LAYOUT.panelWidth,
        height: MOVING_WINDOW_LAYOUT.panelHeight,
        minimumInkPixels: 650
      })
    )
  })
]);
