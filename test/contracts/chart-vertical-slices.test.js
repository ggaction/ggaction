import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { PUBLIC_CHARTS } from "../../examples/registry.js";
import { assertChartProgramsEquivalent } from "../support/chart-equivalence.js";
import { assertDisplayedProgram } from "../support/visual-variants.js";

const chartRoot = fileURLToPath(new URL("../charts/", import.meta.url));

function manifestFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return manifestFiles(target);
    return entry.name === "manifest.js" ? [target] : [];
  });
}

async function equivalenceVariants(directory) {
  const variants = [];
  for (const file of manifestFiles(directory)) {
    const module = await import(pathToFileURL(file).href);
    if (Array.isArray(module.visualVariants)) variants.push(...module.visualVariants);
  }
  return variants.filter(variant =>
    typeof variant.primitive === "function" && typeof variant.userFacing === "function"
  );
}

test("keeps the public chart registry and vertical slices synchronized", async () => {
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

  }

  const chartsByDirectory = new Map();
  for (const chart of PUBLIC_CHARTS) {
    const charts = chartsByDirectory.get(chart.testDirectory) ?? [];
    charts.push(chart);
    chartsByDirectory.set(chart.testDirectory, charts);
  }
  for (const [testDirectory, registeredCharts] of chartsByDirectory) {
    const directory = path.join(chartRoot, testDirectory);
    const variants = await equivalenceVariants(directory);
    for (const chart of registeredCharts) {
      const variant = variants.find(candidate => candidate.chart === chart.id);
      assert.notEqual(
        variant,
        undefined,
        `${chart.id} requires an executable primitive/public pair`
      );
      const publicProgram = variant.userFacing();
      assertDisplayedProgram(variant, publicProgram);
      const primitiveProgram = variant.primitive();
      if (variant.programEquivalence === "state") {
        try {
          assertChartProgramsEquivalent({
            primitiveProgram,
            publicProgram,
            compareSemanticSpec: variant.compareSemanticSpec
          });
        } catch {
          assert.fail(
            `${chart.id} primitive/public state drifted; run its public.test.js for the detailed diff`
          );
        }
      } else {
        assert.equal(
          variant.programEquivalence,
          "render",
          `${chart.id} must declare how its vertical slice is compared`
        );
      }
      assert.equal(typeof chart.createProgram, "function", chart.id);
    }
  }
});
