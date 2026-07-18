import { registerVisualVariantTests } from "../../support/visual-variants.js";
import { visualVariants as gateVariants } from
  "../../gates/direct-source-facet/manifest.js";

registerVisualVariantTests(gateVariants.filter(
  variant => variant.chart === "cars-origin-scatterplot-facet"
));
