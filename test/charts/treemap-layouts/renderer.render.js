import test from "node:test";
import { assertHierarchyRendererParity } from "../../support/hierarchy-renderer-parity.js";
import { visualVariants } from "./manifest.js";

for (const variant of visualVariants) test(`treemap ${variant.variant} preserves primitive Canvas, SVG and PDF output`, () =>
  assertHierarchyRendererParity(variant));
