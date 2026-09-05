import test from "node:test";
import { assertVectorParity } from "../../support/vector-parity.js";
import { visualVariants } from "./manifest.js";

for (const variant of visualVariants) {
  test(`preserves ${variant.title} in vector SVG and PDF`, () => assertVectorParity(variant, { geometry: variant.variant.startsWith("bar-") ? "rect" : "path" }));
}
