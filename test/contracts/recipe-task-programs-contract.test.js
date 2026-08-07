import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  defaultRecipeTaskArtifactRoot,
  verifyRecipeTaskPrograms
} from "../../scripts/verify-recipe-task-programs.js";
import { recipeTaskPrograms } from "../llm/recipe-task-programs.js";

test("executes and renders every frozen task through a primary recipe", async () => {
  const manifest = await verifyRecipeTaskPrograms();

  assert.equal(Object.keys(recipeTaskPrograms).length, 24);
  assert.equal(manifest.total, 24);
  assert.equal(manifest.successful, 24);
  assert.deepEqual(manifest.splits, {
    authoring: { total: 12, successful: 12 },
    heldout: { total: 12, successful: 12 }
  });
  assert.equal(manifest.results.every(result => result.recipeId.length > 0), true);
  assert.equal(manifest.results.every(result => result.valid), true);
  assert.equal(manifest.results.every(result => result.canvasPNG?.endsWith("canvas.png")), true);
  assert.deepEqual(
    manifest.results.find(result => result.taskId === "renderer-parity")?.renderers,
    ["canvas", "svg", "png", "pdf"]
  );
  assert.equal(manifest.contactSheets.length, 3);
  for (const contactSheet of manifest.contactSheets) {
    const bytes = await readFile(new URL(`../../${contactSheet}`, import.meta.url));
    assert.equal(bytes.subarray(1, 4).toString(), "PNG");
    assert.equal(bytes.length > 1_000, true);
  }
  const manifestFile = JSON.parse(await readFile(`${defaultRecipeTaskArtifactRoot}/manifest.json`, "utf8"));
  assert.equal(manifestFile.successful, 24);
});
