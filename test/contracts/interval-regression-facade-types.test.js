import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../../", import.meta.url));

test("declares full-only Interval and Regression complete facades", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-interval-regression-types-"));
  try {
    const file = path.join(directory, "facades.mts");
    await writeFile(file, `
import type { ChartProgram } from ${JSON.stringify(path.join(root, "types/program.js"))};
import type { BasicChartProgram } from ${JSON.stringify(path.join(root, "types/basic.js"))};
declare const p: ChartProgram;
declare const basic: BasicChartProgram;
p.createIntervalPlot({ x: "category", y: "value" });
p.createErrorBar({ groupBy: false });
p.createIntervalPlot({ x: { field: "category", fieldType: "ordinal" }, y: { field: "value", method: "student-t", level: 0.9 }, groupBy: false, errorBar: { caps: false }, point: { radius: 4 } });
p.createIntervalPlot({ x: { center: "center", lower: "low", upper: "high" }, y: { field: "category", fieldType: "nominal" } });
p.createRegressionPlot({ x: "x", y: "y", groupBy: false });
p.createRegressionPlot({ x: { field: "x", scale: { zero: false } }, y: "y", method: "polynomial", degree: 2, interval: "prediction", band: false });
p.createRegressionPlot({ x: "x", y: "y", method: "loess", span: 0.4, band: false });
// @ts-expect-error interval plot requires both axes
p.createIntervalPlot({ x: "category" });
// @ts-expect-error errorBar style has a closed vocabulary
p.createIntervalPlot({ x: "category", y: "value", errorBar: { fill: "red" } });
// @ts-expect-error LOESS does not support interval bands
p.createRegressionPlot({ x: "x", y: "y", method: "loess", band: {} });
// @ts-expect-error regression positions are quantitative
p.createRegressionPlot({ x: { field: "x", fieldType: "nominal" }, y: "y" });
// @ts-expect-error Full only
basic.createIntervalPlot({ x: "category", y: "value" });
// @ts-expect-error Full only
basic.createRegressionPlot({ x: "x", y: "y" });
`);
    const result = spawnSync(path.join(root, "node_modules/.bin/tsc"), [
      "--noEmit", "--strict", "--skipLibCheck", "--target", "ES2022",
      "--module", "NodeNext", "--moduleResolution", "NodeNext", file
    ], { encoding: "utf8", cwd: root });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
