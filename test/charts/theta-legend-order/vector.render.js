import test from "node:test";
import { assertVectorParity } from "../../support/vector-parity.js";
import { visualVariants } from "./manifest.js";
for (const variant of visualVariants) {
  test(`preserves ${variant.variant} category ordering in SVG and PDF`, () => assertVectorParity(variant));
}
