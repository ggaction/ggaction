import { chart, hconcat } from "../../src/index.js";

export const ORDERED_CATEGORY_ROWS = Object.freeze([
  Object.freeze({ category: "Support", value: 8 }),
  Object.freeze({ category: "Product", value: 16 }),
  Object.freeze({ category: "Sales", value: 14 }),
  Object.freeze({ category: "Operations", value: 11 }),
  Object.freeze({ category: "Support", value: 6 }),
  Object.freeze({ category: "Product", value: 15 }),
  Object.freeze({ category: "Sales", value: 10 }),
  Object.freeze({ category: "Operations", value: 7 })
]);

export const ORDERED_CATEGORY_LAYOUT = Object.freeze({
  panelWidth: 300,
  panelHeight: 320,
  gap: 12,
  padding: 6,
  margin: Object.freeze({ top: 74, right: 18, bottom: 58, left: 42 })
});

function categoryBars() {
  return chart()
    .createCanvas({
      width: ORDERED_CATEGORY_LAYOUT.panelWidth,
      height: ORDERED_CATEGORY_LAYOUT.panelHeight,
      margin: ORDERED_CATEGORY_LAYOUT.margin
    })
    .createData({ id: "categoryValues", values: ORDERED_CATEGORY_ROWS })
    .createBarMark({
      id: "bars",
      fill: "#f59e0b",
      stroke: "#ffffff",
      strokeWidth: 1
    })
    .encodeX({
      target: "bars",
      field: "category",
      fieldType: "nominal"
    })
    .encodeY({
      target: "bars",
      field: "value",
      fieldType: "quantitative",
      aggregate: "sum",
      scale: { domain: [0, 32], nice: false, zero: true }
    })
    .createGuides();
}

export function createOrderedCategoryBarComparison() {
  const automatic = categoryBars().createTitle({
    text: "Automatic",
    subtitle: "Source first appearance",
    align: "center"
  });
  const ordered = categoryBars()
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
    });
  const reset = categoryBars()
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
    });

  return hconcat({
    id: "orderedCategoryBarComparison",
    programs: [
      { id: "automatic", program: automatic },
      { id: "ordered", program: ordered },
      { id: "reset", program: reset }
    ],
    gap: ORDERED_CATEGORY_LAYOUT.gap,
    padding: ORDERED_CATEGORY_LAYOUT.padding,
    align: "start"
  });
}
