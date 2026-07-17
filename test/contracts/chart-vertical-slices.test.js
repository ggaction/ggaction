import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { PUBLIC_CHARTS } from "../../examples/registry.js";

const chartRoot = fileURLToPath(new URL("../charts/", import.meta.url));

test("keeps the public chart registry and vertical slices synchronized", () => {
  const charts = readdirSync(chartRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();
  const registeredDirectories = [...new Set(
    PUBLIC_CHARTS.map(chart => chart.testDirectory)
  )].sort();

  assert.deepEqual(charts, registeredDirectories);
  assert.equal(new Set(PUBLIC_CHARTS.map(chart => chart.id)).size, PUBLIC_CHARTS.length);

  for (const chart of PUBLIC_CHARTS) {
    const directory = path.join(chartRoot, chart.testDirectory);
    assert.equal(existsSync(fileURLToPath(chart.programFile)), true);
    for (const file of [
      "primitive.program.js",
      "primitive.test.js",
      "public.test.js",
      "png.render.js"
    ]) {
      assert.equal(
        existsSync(path.join(directory, file)),
        true,
        `${chart.id} is missing ${file}`
      );
    }

    const publicTest = readFileSync(
      path.join(directory, "public.test.js"),
      "utf8"
    );
    assert.match(
      publicTest,
      /assertChartProgramsEquivalent\s*\(/,
      `${chart.id} must enforce complete primitive/public equivalence`
    );
  }
});
