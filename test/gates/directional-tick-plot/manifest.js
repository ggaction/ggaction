import { defineVisualVariant } from "../../support/visual-variants.js";

import { createDirectionalTickPointPrimitives } from "./primitive.program.js";
import { DIRECTION_LAYOUT } from "./reference-values.js";

export const comparisonCallChain = `hconcat({
  id: "directionalTickPointComparison",
  programs: [
    { id: "baseline", program: baseline },
    { id: "directionalTicks", program: directionalTicks },
    { id: "directionalPoints", program: directionalPoints }
  ],
  gap: 20,
  padding: 6,
  align: "start"
});`;

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "directional-tick-plot",
    variant: "baseline-tick-point-directions",
    title: "Tick and Point Direction Convention",
    callChain: comparisonCallChain,
    artifact: { scope: "review" },
    primitive: createDirectionalTickPointPrimitives,
    width: DIRECTION_LAYOUT.padding * 2 +
      DIRECTION_LAYOUT.panelWidth * 3 + DIRECTION_LAYOUT.gap * 2,
    height: DIRECTION_LAYOUT.padding * 2 + DIRECTION_LAYOUT.panelHeight,
    colors: ["#64748b", "#2563eb", "#f97316"],
    regions: ["baseline Tick", "directional Tick", "directional point"].map(
      (name, index) => ({
        name,
        x: DIRECTION_LAYOUT.padding + index * (
          DIRECTION_LAYOUT.panelWidth + DIRECTION_LAYOUT.gap
        ),
        y: DIRECTION_LAYOUT.padding,
        width: DIRECTION_LAYOUT.panelWidth,
        height: DIRECTION_LAYOUT.panelHeight,
        minimumInkPixels: 500
      })
    )
  })
]);
