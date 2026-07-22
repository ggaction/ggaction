import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { ChartProgram } from "../../src/ChartProgram.js";
import * as ggaction from "../../src/index.js";
import { visualVariants as annotationVariants } from "../charts/annotated-imdb-scatterplot/manifest.js";
import { visualVariants as facetVariants } from "../charts/cars-origin-scatterplot-facet/manifest.js";
import { visualVariants as resolutionVariants } from "../charts/cross-feature-integration/variants/facet-resolution/manifest.js";
import { visualVariants as heatmapVariants } from "../charts/gapminder-life-expectancy-heatmap/manifest.js";
import { visualVariants as binnedHeatmapVariants } from "../charts/cars-binned-heatmap/manifest.js";
import { visualVariants as windowVariants } from "../charts/cars-window-rank-scatterplot/manifest.js";
import { visualVariants as arcVariants } from "../charts/polar-arcs/manifest.js";
import { visualVariants as lineVariants } from "../charts/polar-line-radar/manifest.js";
import { visualVariants as pointVariants } from "../charts/polar-points/variants/manifest.js";
import { visualVariants as compositionVariants } from "../charts/program-composition/variants/layouts/manifest.js";

const ACTIONS = Object.freeze([
  "encodeTheta", "encodeR", "encodePointRadius",
  "createArcMark", "editArcMark",
  "createTextMark", "editTextMark", "encodeText", "encodeYOffset",
  "createRectMark", "editRectMark",
  "editCompositionLayout", "replaceCompositionChild", "facet", "editFacetHeaders",
  "editFacetScales", "editFacetGuides"
]);

const EXPECTED_CAPABILITIES = new Set([
  "polar-point", "polar-line-radar", "polar-arcs", "weighted-theta",
  "program-composition", "direct-source-facet", "facet-resolution",
  "text-annotation", "rect-heatmap", "window-data"
]);

test("keeps the implemented visual actions Current, callable, and typed", () => {
  const index = JSON.parse(readFileSync(new URL(
    "../../agent_docs/contract/ACTION_INDEX.json",
    import.meta.url
  ), "utf8"));
  const declarations = readFileSync(new URL("../../types/program.d.ts", import.meta.url), "utf8");
  const current = new Set(index.actions.map(action => action.name));
  const planned = new Set(index.plannedActions.map(action => action.name));
  for (const action of ACTIONS) {
    assert.equal(current.has(action), true, action);
    assert.equal(planned.has(action), false, action);
    assert.equal(typeof ChartProgram.prototype[action], "function", action);
    assert.match(declarations, new RegExp(`^  ${action}\\(`, "m"), action);
  }
  assert.equal(typeof ggaction.hconcat, "function");
  assert.equal(typeof ggaction.vconcat, "function");
});

test("keeps approved visual evidence owned by current capabilities", () => {
  const variants = [
    ...pointVariants,
    ...lineVariants,
    ...arcVariants,
    ...compositionVariants,
    ...facetVariants,
    ...resolutionVariants,
    ...annotationVariants,
    ...heatmapVariants,
    ...binnedHeatmapVariants,
    ...windowVariants
  ];
  const capabilities = new Set(variants.map(variant => variant.artifact.capability));
  for (const capability of EXPECTED_CAPABILITIES) {
    assert.equal(capabilities.has(capability), true, capability);
  }
  for (const variant of variants) {
    assert.equal(variant.artifact.scope, "charts");
    assert.equal("roadmap" in variant.artifact, false);
    assert.equal("phase" in variant.artifact, false);
    assert.equal(typeof variant.primitive, "function");
    assert.equal(typeof variant.userFacing, "function");
  }
});

test("keeps closed polar lines and advanced facets in the strict public types", () => {
  const declarations = readFileSync(new URL("../../types/program.d.ts", import.meta.url), "utf8");
  const rootDeclarations = readFileSync(new URL("../../types/index.d.ts", import.meta.url), "utf8");
  assert.match(declarations, /createLineMark\(options\?: \{[\s\S]*?closed\?: boolean;/);
  assert.match(declarations, /editLineMark\(options: \{[\s\S]*?closed\?: boolean;/);
  assert.match(declarations, /export interface FacetGuideOptions \{[\s\S]*?axes\?: "each" \| "outer";/);
  assert.match(declarations, /guides\?: FacetGuideOptions/);
  assert.match(rootDeclarations, /FacetGuideOptions/);
});
