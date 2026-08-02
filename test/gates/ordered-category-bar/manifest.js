import { defineVisualVariant } from "../../support/visual-variants.js";

import { createOrderedCategoryBarComparisonPrimitives } from
  "./primitive.program.js";
import { createOrderedCategoryBarComparison } from "./public.program.js";
import { ORDERED_CATEGORY_LAYOUT } from "./reference-values.js";

export const orderedCallChain = `base
  .orderCategories({
    target: "bars",
    channel: "x",
    by: { field: "value", aggregate: "sum" },
    direction: "descending"
  })
  .createTitle({
    text: "Descending total",
    subtitle: "Product → Sales → Operations → Support",
    align: "center"
  });`;

export const resetCallChain = `base
  .orderCategories({
    target: "bars",
    channel: "x",
    by: { field: "value", aggregate: "sum" },
    direction: "descending"
  })
  .removeCategoryOrder({ target: "bars", channel: "x" })
  .createTitle({
    text: "Reset",
    subtitle: "Automatic order restored",
    align: "center"
  });`;

export const comparisonCallChain = `hconcat({
  id: "orderedCategoryBarComparison",
  programs: [
    { id: "automatic", program: automatic },
    { id: "ordered", program: ordered },
    { id: "reset", program: reset }
  ],
  gap: 12,
  padding: 6,
  align: "start"
});`;

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "ordered-category-bar",
    variant: "automatic-ordered-reset",
    title: "Automatic, Descending Total, and Reset Category Order",
    callChain: comparisonCallChain,
    artifact: { scope: "review" },
    programEquivalence: "render",
    primitive: createOrderedCategoryBarComparisonPrimitives,
    userFacing: createOrderedCategoryBarComparison,
    width: ORDERED_CATEGORY_LAYOUT.padding * 2 +
      ORDERED_CATEGORY_LAYOUT.panelWidth * 3 +
      ORDERED_CATEGORY_LAYOUT.gap * 2,
    height: ORDERED_CATEGORY_LAYOUT.padding * 2 +
      ORDERED_CATEGORY_LAYOUT.panelHeight,
    colors: ["#f59e0b"],
    regions: ["automatic", "ordered", "reset"].map((name, index) => ({
      name: `${name} category bars`,
      x: ORDERED_CATEGORY_LAYOUT.padding + index * (
        ORDERED_CATEGORY_LAYOUT.panelWidth + ORDERED_CATEGORY_LAYOUT.gap
      ),
      y: ORDERED_CATEGORY_LAYOUT.padding,
      width: ORDERED_CATEGORY_LAYOUT.panelWidth,
      height: ORDERED_CATEGORY_LAYOUT.panelHeight,
      minimumInkPixels: 700
    }))
  })
]);
