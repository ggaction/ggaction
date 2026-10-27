import assert from "node:assert/strict";
import test from "node:test";
import { variants, pixelCommands } from "./manifest.js";
import { targetProgram } from "./target.program.js";
import { resolvePathSubpaths } from "../../../src/grammar/pathTopology.js";
import { chart } from "../../../src/index.js";

test("keeps pending compound targets outside the current public graphic contract", () => {
  for (const variant of variants) {
    assert.ok(resolvePathSubpaths(pixelCommands(variant)).length >= 2);
    assert.throws(() => targetProgram(variant), /subpath|clip/);
  }
});

test("preserves the original program and trace when a pending target is rejected", () => {
  const before = chart().createCanvas({ width: 100, height: 100, margin: 0 })
    .createGraphics({ id: "path", type: "path", parent: "plot-main" });
  const snapshot = JSON.stringify(before);
  for (const variant of variants) {
    assert.throws(() => before.editGraphics({ target: "path", property: "commands", value: pixelCommands(variant) }));
    assert.equal(JSON.stringify(before), snapshot);
  }
});
