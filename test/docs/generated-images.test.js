import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildDocImageManifest,
  chartImages,
  tutorialImages
} from "../../scripts/generate-doc-images.js";

const root = fileURLToPath(new URL("../..", import.meta.url));

function read(relative) {
  return readFileSync(path.join(root, relative), "utf8");
}

function assertPng(id, width, height) {
  const image = readFileSync(path.join(root, `docs/assets/images/${id}.png`));
  assert.deepEqual([...image.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(image.readUInt32BE(16), width * 2, `${id} width`);
  assert.equal(image.readUInt32BE(20), height * 2, `${id} height`);
}

test("keeps one generated gallery image for every public chart", async () => {
  const index = read("docs/index.md");
  const tutorials = read("docs/tutorials/index.md");

  assert.equal(chartImages.length, 13);
  for (const { id, width, height } of chartImages) {
    assertPng(id, width, height);
    assert.match(index, new RegExp(`assets/images/${id}\\.png`));
  }
  assert.equal((index.match(/<article>/g) ?? []).length, chartImages.length);
  assert.equal(
    (index.match(/class="docs-chart-gallery__image"/g) ?? []).length,
    chartImages.length
  );
  assert.equal(
    (index.match(/class="docs-chart-gallery__title"/g) ?? []).length,
    chartImages.length
  );
  assert.equal((index.match(/loading="lazy"/g) ?? []).length, chartImages.length - 1);
  assert.equal((index.match(/loading="eager"/g) ?? []).length, 1);
  assert.equal(
    (index.match(/<img [^>]*width="\d+"[^>]*height="\d+"/g) ?? []).length,
    chartImages.length
  );

  for (const tutorial of [
    "scatterplot", "polar-points", "line-chart", "histogram", "grouped-bar",
    "regression-scatterplot", "density-area", "error-bar"
  ]) {
    assert.match(tutorials, new RegExp(`/tutorials/${tutorial}/`));
  }

  const manifest = JSON.parse(read("docs/assets/images/manifest.json"));
  assert.deepEqual(manifest, await buildDocImageManifest());
  assert.equal(manifest.version, 3);
  for (const entry of [
    ...Object.values(manifest.charts),
    ...Object.values(manifest.tutorials)
  ]) {
    assert.match(entry.sourceHash, /^[a-f0-9]{64}$/);
    assert.equal("pixelHash" in entry, false);
  }
});

test("keeps generated mark-selection tutorial images canonical and fresh", () => {
  const tutorial = read("docs/tutorials/mark-selection.md");

  assert.equal(tutorialImages.length, 3);
  for (const { id, width, height } of tutorialImages) {
    assertPng(id, width, height);
    assert.match(tutorial, new RegExp(`assets/images/${id}\\.png`));
  }
  assert.match(tutorial, /examples\/mark-selection\/program\.js/);
  assert.match(tutorial, /filterMarks/);
  assert.match(tutorial, /selectMarks/);
  assert.match(tutorial, /highlightMarks/);
});
