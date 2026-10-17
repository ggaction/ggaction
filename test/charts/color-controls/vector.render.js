import test from "node:test";
import { assertVectorParity } from "../../support/vector-parity.js";
import { visualVariants } from "./manifest.js";
for (const variant of visualVariants) {
  test(`${variant.variant} preserves exact primitive SVG and PDF colors and rectangles`, () => assertVectorParity(variant, {geometry:"rect"}));
}
