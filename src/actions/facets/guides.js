import { action } from "../../core/action.js";
import { validateKeys } from "../../core/validation.js";
import { applyFacetGuideComposition } from
  "../../materialization/facetGuides.js";

export const composeFacetGuides = action(
  {
    op: "composeFacetGuides",
    description: "Apply outer-axis ownership and promote shared facet legends.",
    scope: "composition"
  },
  function ({ layout, plot } = {}) {
    validateKeys({ layout, plot }, ["layout", "plot"], "composeFacetGuides");
    return applyFacetGuideComposition(this, { layout, plot });
  }
);
