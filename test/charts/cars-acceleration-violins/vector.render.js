import test from "node:test";
import { assertVectorParity } from "../../support/vector-parity.js";
import { visualVariants } from "./manifest.js";

for (const variant of visualVariants) {
  test(`Violin ${variant.variant} preserves independent density profiles in SVG and vector PDF`, () => assertVectorParity(variant));
}
