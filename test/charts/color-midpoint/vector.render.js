import test from "node:test";
import { assertVectorParity } from "../../support/vector-parity.js";
import { visualVariants } from "./manifest.js";
for (const variant of visualVariants) {
  test(`preserves ${variant.variant} color semantics in SVG and PDF`, () => assertVectorParity(variant, { geometry: "circle" }));
}
