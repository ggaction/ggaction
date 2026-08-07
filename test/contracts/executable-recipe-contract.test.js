import assert from "node:assert/strict";
import test from "node:test";

import { verifyExecutableRecipes } from "../../scripts/verify-executable-recipes.js";

test("executes and renders every generated recipe source with only declared host inputs", async () => {
  const manifest = await verifyExecutableRecipes();
  assert.equal(manifest.recipeCount, 33);
  assert.equal(manifest.results.length, 33);
  assert.equal(manifest.results.every(result => result.canvasBytes > 100), true);
  assert.equal(new Set(manifest.results.map(result => result.exampleSourceSha256)).size, 33);
});
