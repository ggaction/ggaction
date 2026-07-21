import assert from "node:assert/strict";
import test from "node:test";

import { renderTestCommands } from "../../../scripts/run-render-tests.js";

test("runs every render and gallery check for the complete suite", () => {
  assert.deepEqual(renderTestCommands(), [
    ["scripts/run-tests.js", "render"],
    ["scripts/generate-artifact-gallery.js"],
    ["scripts/test-artifact-gallery.js"]
  ]);
});

test("keeps a focused render isolated from complete gallery generation", () => {
  assert.deepEqual(renderTestCommands(["chart:cars-histogram"]), [
    ["scripts/run-tests.js", "render", "chart:cars-histogram"]
  ]);
});
