import { chart, hconcat } from "../../../src/index.js";

import {
  ORDERED_CATEGORY_LAYOUT,
  ORDERED_CATEGORY_ROWS
} from "./reference-values.js";

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
    .encodeX({ target: "bars", field: "category", fieldType: "nominal" })
    .encodeY({
      target: "bars",
      field: "value",
      fieldType: "quantitative",
      aggregate: "sum",
      scale: { domain: [0, 32], nice: false, zero: true }
    })
    .createGuides();
}

function applyOrder(program) {
  return program
    .editSemantic({
      property: "layer[bars].encoding.x.categoryOrder",
      value: {
        by: { field: "value", aggregate: "sum" },
        direction: "descending"
      }
    })
    .rematerializeScale({ id: "x" })
    .rematerializeBarMark({ id: "bars" });
}

function removeOrder(program) {
  return program
    .editSemantic({
      property: "layer[bars].encoding.x.categoryOrder",
      remove: true
    })
    .rematerializeScale({ id: "x" })
    .rematerializeBarMark({ id: "bars" });
}

export function createOrderedCategoryBarComparisonPrimitives() {
  const automatic = categoryBars().createTitle({
    text: "Automatic",
    subtitle: "Source first appearance",
    align: "center"
  });
  const ordered = applyOrder(categoryBars()).createTitle({
    text: "Descending total",
    subtitle: "Product → Sales → Operations → Support",
    align: "center"
  });
  const reset = removeOrder(applyOrder(categoryBars())).createTitle({
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
