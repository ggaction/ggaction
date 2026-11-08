import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { SHOWCASE_CHARTS } from "../../examples/registry.js";
import { SHOWCASE_DATASETS } from "../../examples/showcase-data.js";
import { showcaseImages } from "../../scripts/generate-doc-images.js";
import { SHOWCASE_PAGES } from "../../scripts/generate-doc-showcase.js";
import { readDocChartCatalog } from "../../scripts/doc-chart-catalog.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { deserializeProgram, serializeProgram } from "../../src/persistence.js";

const root = fileURLToPath(new URL("../..", import.meta.url));
const read = file => readFileSync(path.join(root, file));
// Each SVG render draws a fresh clip-path id prefix; the drawing itself must match.
const svgOf = program => renderToSVG(program).replace(/ggaction-clip-[a-z0-9]+-/g, "ggaction-clip-");

test("pins every showcase data file to its recorded source, license, and bytes", () => {
  const manifest = JSON.parse(read("data/showcase/manifest.json"));
  const files = Object.values(SHOWCASE_DATASETS).map(dataset => path.basename(dataset.file)).sort();
  assert.deepEqual(Object.keys(manifest).sort(), files);
  for (const [file, entry] of Object.entries(manifest)) {
    const bytes = read(`data/showcase/${file}`);
    assert.equal(entry.bytes, bytes.length, file);
    assert.equal(entry.sha256, createHash("sha256").update(bytes).digest("hex"), file);
    for (const key of ["name", "url", "origin", "license", "attribution", "retrievedAt"]) {
      assert.equal(typeof entry[key], "string", `${file} ${key}`);
      assert.ok(entry[key].length > 0, `${file} ${key}`);
    }
  }
});

test("lists every showcase chart in the gallery and on exactly one owning page", () => {
  const catalog = new Map(readDocChartCatalog(read("docs/_data/chart_examples.yml").toString())
    .map(entry => [entry.id, entry]));
  assert.deepEqual(Object.keys(SHOWCASE_PAGES).sort(), SHOWCASE_CHARTS.map(chart => chart.id).sort());
  for (const chart of SHOWCASE_CHARTS) {
    const entry = catalog.get(chart.id);
    assert.ok(entry, `${chart.id} catalog entry`);
    assert.notEqual(entry.figure_only, true, `${chart.id} stays in the gallery`);
    assert.equal(entry.example, `/examples/${chart.id}/`);
    assert.deepEqual([entry.width, entry.height], [chart.width * 2, chart.height * 2]);
    const page = read(SHOWCASE_PAGES[chart.id]).toString();
    assert.equal(page.split(`<!-- showcase-program:${chart.id}:start -->`).length, 2, chart.id);
  }
});

test("renders every showcase chart deterministically and restores it from a snapshot", () => {
  for (const definition of showcaseImages) {
    const program = definition.createProgram();
    const svg = svgOf(program);
    assert.match(svg, new RegExp(`width="${definition.width}"`), definition.id);
    assert.equal(svgOf(definition.createProgram()), svg, `${definition.id} is deterministic`);
    assert.equal(svgOf(deserializeProgram(serializeProgram(program))), svg, `${definition.id} restores`);
  }
});
