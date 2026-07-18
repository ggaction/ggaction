import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { visualVariants as annotationVariants } from
  "../gates/annotated-imdb-scatterplot/manifest.js";
import { visualVariants as horizontalBarVariants } from
  "../charts/jobs-horizontal-grouped-bar/manifest.js";
import { visualVariants as heatmapVariants } from
  "../charts/gapminder-life-expectancy-heatmap/manifest.js";

const root = fileURLToPath(new URL("../..", import.meta.url));
const read = file => readFileSync(path.join(root, file), "utf8");
const index = JSON.parse(read("agent_docs/contract/ACTION_INDEX.json"));
const inventory = JSON.parse(read(
  "agent_docs/impl/roadmap3/phase0/GATE_A_INVENTORY.json"
));
const declarations = read("types/program.d.ts");
const declarationIndex = read("types/index.d.ts");
const currentMarks = read("agent_docs/contract/current/MARKS.md");
const publicMarks = read("docs/api/marks/rect.md");
const architecture = read("agent_docs/SECOND_ARCHITECTURE.md");

test("leaves no Phase 9 action or capability in Planned inventory", () => {
  const actions = inventory.proposedActions
    .filter(action => action.phase === "phase9")
    .map(action => action.name);
  const capabilities = inventory.proposedCapabilities
    .filter(capability => capability.phase === "phase9")
    .map(capability => capability.id);
  const current = new Set(index.actions.map(action => action.name));
  const plannedActions = new Set(index.plannedActions.map(action => action.name));
  const plannedCapabilities = new Set(
    index.plannedCapabilities.map(capability => capability.id)
  );

  assert.deepEqual(actions, [
    "encodeYOffset",
    "createTextMark",
    "encodeText",
    "editTextMark",
    "createRectMark",
    "editRectMark"
  ]);
  assert.deepEqual(capabilities, [
    "horizontal-grouped-bar",
    "text-annotation",
    "rect-heatmap"
  ]);
  for (const name of actions) {
    assert.equal(current.has(name), true, name);
    assert.equal(plannedActions.has(name), false, name);
  }
  for (const id of capabilities) assert.equal(plannedCapabilities.has(id), false, id);
});

test("locks rect heatmaps into types, Current contracts, docs, and architecture", () => {
  assert.match(declarations, /export interface RectMarkOptions/);
  assert.match(declarations, /createRectMark\(options\?: RectMarkOptions\)/);
  assert.match(declarations, /editRectMark\(options: EditRectMarkOptions\)/);
  assert.match(declarationIndex, /RectMarkOptions/);
  assert.match(currentMarks, /two discrete band positions/);
  assert.match(publicMarks, /full-band cell/);
  assert.match(publicMarks, /complete continuous endpoint pairs/);
  assert.match(architecture, /Rect는 bar와 별도 semantic owner/);
  assert.equal(index.internal.materialization.includes("rematerializeRectMark"), true);
});

test("locks all Phase 9 visual targets to primitive and public pairs", () => {
  const variants = [
    ...horizontalBarVariants,
    ...annotationVariants,
    ...heatmapVariants
  ];
  assert.deepEqual(variants.map(variant => variant.artifact.capability), [
    "directional-offset",
    "text-annotation",
    "rect-heatmap"
  ]);
  for (const variant of variants) {
    assert.equal(variant.artifact.phase, "phase9");
    assert.equal(typeof variant.userFacing, "function");
  }
});
