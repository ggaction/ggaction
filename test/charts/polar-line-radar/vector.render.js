import test from "node:test";
import { assertVectorParity } from "../../support/vector-parity.js";
import { visualVariants } from "./manifest.js";

for (const variant of visualVariants.filter(value => value.chart === "jobs-radar-chart")) {
  test("Radar preserves its independent closed-path primitive in SVG and vector PDF", () => assertVectorParity(variant));
}
