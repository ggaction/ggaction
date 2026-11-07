import test from "node:test";
import { assertHierarchyRendererParity } from "../../support/hierarchy-renderer-parity.js";
import { visualVariants } from "./manifest.js";

for (const variant of visualVariants.filter(value => ["icicle", "sunburst"].includes(value.variant))) {
  test(`${variant.variant} partition matches its independent primitive in Canvas, SVG and decoded PDF`, () =>
    assertHierarchyRendererParity(variant));
}
