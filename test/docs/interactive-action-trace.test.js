import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  createInteractiveActionTrace,
  TRACE_DEMO_STEP_IDS
} from "../../examples/interactive-action-trace/program.js";
import { generateInteractiveActionTrace } from
  "../../scripts/generate-interactive-action-trace.js";

const root = fileURLToPath(new URL("../..", import.meta.url));

test("builds the ordered immutable interactive action trace", () => {
  const stages = createInteractiveActionTrace();

  assert.deepEqual(stages.map(stage => stage.id), TRACE_DEMO_STEP_IDS);
  assert.deepEqual(TRACE_DEMO_STEP_IDS, [
    "canvas",
    "data",
    "scatterplot",
    "guides",
    "title"
  ]);
  assert.equal(new Set(stages.map(stage => stage.program)).size, stages.length);
  assert.equal(stages.every(stage => Object.isFrozen(stage.program)), true);
  assert.deepEqual(
    stages.at(-1).program.trace.children.map(node => node.op),
    ["createCanvas", "createData", "createScatterPlot", "createGuides", "createTitle"]
  );
  assert.equal(stages.at(-1).program.semanticSpec.datasets[0].values.length, 10);
  assert.equal(Object.keys(stages.at(-1).program.graphicSpec.objects).length > 1, true);
});

test("keeps the release-site demo generated from the example source", async () => {
  await generateInteractiveActionTrace({ check: true });

  const html = readFileSync(
    path.join(root, "docs/demos/action-trace/index.html"),
    "utf8"
  );
  assert.match(html, /Generated from examples\/interactive-action-trace\/index\.html/);
  assert.match(html, /interactive-action-trace\.js/);
  assert.doesNotMatch(html, /src="\.\/main\.js"/);
});
