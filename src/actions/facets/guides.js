import { closedAction } from "../../core/action.js";

import { applyFacetGuideComposition } from
  "../../materialization/facetGuides/index.js";

export const composeFacetGuides = /* @__PURE__ */ closedAction(
  {
    op: "composeFacetGuides",
    description: "Apply outer-axis ownership and promote shared facet legends.",
    scope: "composition"
  }, ["layout", "plot"],
  function ({ layout, plot } = {}) {
    return applyFacetGuideComposition(this, { layout, plot });
  }
);
