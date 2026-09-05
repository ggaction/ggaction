import test from "node:test";
import { assertVectorParity } from "../../support/vector-parity.js";
import { visualVariants } from "./manifest.js";
for (const variant of visualVariants) {
  test(`preserves ${variant.variant} interval colors in SVG and PDF`, () => assertVectorParity(variant, { geometry: variant.variant === "point" ? "circle" : "rect" }));
}
