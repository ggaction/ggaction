import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { ChartProgram } from "../../src/ChartProgram.js";
import { visualVariants } from "../gates/point-jitter/manifest.js";

const root = fileURLToPath(new URL("../..", import.meta.url));
const read = relative => readFileSync(path.join(root, relative), "utf8");
const proposals = JSON.parse(read(
  "agent_docs/impl/roadmap4/phase4/PROPOSALS.json"
));

test("keeps the approved P4-A jitter contract exact before implementation", () => {
  assert.equal(proposals.version, 1);
  assert.equal(proposals.phase, "roadmap4/phase4");
  assert.equal(proposals.gate, "P4-A");
  assert.equal(proposals.status, "approved");
  assert.deepEqual(
    proposals.actions.map(action => action.name),
    ["jitterPoints", "removeJitter"]
  );
  const index = JSON.parse(read("agent_docs/contract/ACTION_INDEX.json"));
  const declarations = read("types/program.d.ts");
  for (const action of proposals.actions) {
    assert.equal(action.status, "planned", action.name);
    assert.equal(ChartProgram.prototype[action.name], undefined, action.name);
    assert.equal(index.actions.some(item => item.name === action.name), false, action.name);
    assert.equal(index.plannedActions.some(item => item.name === action.name), false, action.name);
    assert.doesNotMatch(
      declarations,
      new RegExp(`^  ${action.name}\\(`, "m"),
      action.name
    );
  }
});

test("registers two primitive-only P4-A targets with the approved API shape", () => {
  assert.deepEqual(
    visualVariants.map(variant => variant.artifact.capability),
    ["point-jitter", "point-jitter"]
  );
  assert.deepEqual(
    visualVariants.map(variant => variant.artifact.phase),
    ["phase4", "phase4"]
  );
  for (const variant of visualVariants) {
    assert.equal(variant.userFacing, undefined);
    assert.match(variant.callChain, /\.jitterPoints\(\{/);
    assert.equal(variant.primitive().semanticSpec.layers[0].mark.type, "point");
  }
  assert.match(visualVariants[0].callChain, /channel: "x"/);
  assert.match(visualVariants[0].callChain, /maxOffset: \{ band: 0\.168 \}/);
  assert.match(visualVariants[1].callChain, /channel: "y"/);
  assert.match(visualVariants[1].callChain, /maxOffset: \{ band: 0\.16 \}/);
});

test("records the P4-A state, replacement, containment, and non-goal boundaries", () => {
  const goal = read("agent_docs/impl/roadmap4/phase4/GOAL.md");
  assert.match(goal, /materializationConfigs\.jitters\[target\]/);
  assert.match(goal, /effective slot width/);
  assert.match(goal, /같은 target의 policy를 교체/);
  assert.match(goal, /removeJitter/);
  assert.match(goal, /collision-free beeswarm/);
  assert.match(goal, /Polar point jitter/);
});
