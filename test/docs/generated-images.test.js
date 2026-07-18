import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildDocImageManifest,
  chartImages,
  docThumbnailDimensions,
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

function assertThumbnail(id, width, height) {
  const image = readFileSync(
    path.join(root, `docs/assets/images/${id}-thumb.png`)
  );
  const dimensions = docThumbnailDimensions(width * 2, height * 2);
  assert.deepEqual([...image.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(image.readUInt32BE(16), dimensions.width, `${id} thumbnail width`);
  assert.equal(image.readUInt32BE(20), dimensions.height, `${id} thumbnail height`);
}

test("keeps one generated gallery image for every public chart", async () => {
  const index = read("docs/index.md");
  const tutorials = read("docs/tutorials/index.md");
  const catalog = read("docs/_data/chart_examples.yml");

  assert.equal(chartImages.length, 18);
  for (const { id, width, height } of chartImages) {
    assertPng(id, width, height);
    assertThumbnail(id, width, height);
    assert.match(catalog, new RegExp(`image: /assets/images/${id}\\.png`));
    assert.match(catalog, new RegExp(`thumbnail: /assets/images/${id}-thumb\\.png`));
  }
  assert.equal((catalog.match(/^  home_group:/gm) ?? []).length, chartImages.length);
  assert.match(index, /chart-gallery-card\.html/);
  assert.match(index, /home_group", "essentials"/);
  assert.match(index, /home_group", "statistical"/);
  assert.match(index, /home_group", "coordinates"/);

  assert.match(tutorials, /example\.tutorial_order/);

  const manifest = JSON.parse(read("docs/assets/images/manifest.json"));
  assert.deepEqual(manifest, await buildDocImageManifest());
  assert.equal(manifest.version, 4);
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
    assertThumbnail(id, width, height);
    assert.match(tutorial, new RegExp(`assets/images/${id}\\.png`));
  }
  assert.match(tutorial, /examples\/mark-selection\/program\.js/);
  assert.match(tutorial, /filterMarks/);
  assert.match(tutorial, /selectMarks/);
  assert.match(tutorial, /highlightMarks/);
});
