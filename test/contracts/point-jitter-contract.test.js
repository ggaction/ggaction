import { assertEquivalentMeaning } from "../support/identity-equivalence.js";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { visualVariants } from "../charts/point-jitter/manifest.js";

const root = fileURLToPath(new URL("../..", import.meta.url));
const ACTIONS = Object.freeze(["jitterPoints", "removeJitter"]);

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

test("keeps point jitter actions Current and out of Planned", () => {
  const index = JSON.parse(read("agent_docs/contract/ACTION_INDEX.json"));
  for (const name of ACTIONS) {
    const current = index.actions.filter(action => action.name === name);
    assert.equal(current.length, 1, name);
    assert.equal(current[0].status, "implemented", name);
    assert.equal(
      current[0].contract.file,
      "agent_docs/contract/current/MARKS.md",
      name
    );
    assert.equal(index.plannedActions.some(action => action.name === name), false, name);
    assert.equal(index.plannedCapabilities.some(capability =>
      capability.name === name || capability.actions?.includes(name)
    ), false, name);
  }
  assert.doesNotMatch(
    read("agent_docs/contract/planned/MARKS_AND_PATHS.md"),
    /jitterPoints|removeJitter/
  );
});

test("exports the complete strict point jitter option surface", () => {
  const programTypes = read("types/program.d.ts");
  const rootTypes = read("types/index.d.ts");
  for (const name of [
    "JitterMaxOffset",
    "JitterPointsOptions",
    "RemoveJitterOptions"
  ]) {
    assert.match(rootTypes, new RegExp(`^  ${name},?$`, "m"), name);
  }
  assert.match(
    programTypes,
    /jitterPoints\(options: TargetedOptions<JitterPointsOptions>\): ChartProgram/
  );
  assert.match(
    programTypes,
    /removeJitter\(options\?: TargetedOptions<RemoveJitterOptions>\): ChartProgram/
  );
});

test("keeps both point jitter visual targets executable and equivalent", () => {
  assert.equal(visualVariants.length, 2);
  for (const variant of visualVariants) {
    assert.equal(variant.artifact.scope, "charts");
    assert.equal(variant.artifact.capability, "point-jitter");
    const primitive = variant.primitive();
    const userFacing = variant.userFacing();
    assertEquivalentMeaning(userFacing.semanticSpec, primitive.semanticSpec);
    assertEquivalentMeaning(userFacing.graphicSpec, primitive.graphicSpec);
  }
});

test("documents and package-tests the additive point jitter contract", () => {
  const pointDocs = read("docs/api/marks/point.md");
  const reference = read("docs/reference/actions/marks.md");
  const packageConsumer = read("scripts/consumers/fixtures/types-2.ts");
  assert.match(pointDocs, /maxOffset: \{ band: 0\.168 \}/);
  assert.match(pointDocs, /semantic x\/y values/);
  assert.match(pointDocs, /not collision-free packing or a beeswarm layout/);
  for (const action of ACTIONS) {
    assert.match(reference, new RegExp("^## `" + action + "`$", "m"), action);
  }
  assert.match(packageConsumer, /type JitterPointsOptions/);
  assert.match(packageConsumer, /\.jitterPoints\(jitterOptions\)/);
  assert.match(packageConsumer, /\.removeJitter\(removeJitterOptions\)/);
});
