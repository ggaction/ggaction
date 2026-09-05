import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const root = fileURLToPath(new URL("../../", import.meta.url));

test("declares categorical theta and legend ordering with exclusive policies", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-order-types-"));
  try {
    const file = path.join(directory, "ordering.mts");
    await writeFile(file, `
import type { ChartProgram } from ${JSON.stringify(path.join(root, "types/program.js"))};
import type { BasicChartProgram } from ${JSON.stringify(path.join(root, "types/basic.js"))};
declare const p: ChartProgram;
declare const basic: BasicChartProgram;
p.orderCategories({ channel: "theta", values: ["C", "A"] });
p.orderCategories({ channel: "theta", by: { field: "value", aggregate: "sum" }, direction: "descending" });
p.removeCategoryOrder({ channel: "theta" });
p.createLegend({ order: { channel: "theta" } });
p.editLegend({ order: { values: [false, 0, "A"] } });
p.editLegend({ order: "scale" });
basic.createLegend({ order: { channel: "x" } });
p.createScatterPlot({ x: "x", y: "y", guides: { legend: { order: { channel: "x" } } } });
p.createBarPlot({ x: "x", y: "y", guides: { legend: { order: { channel: "y" } } } });
p.createLinePlot({ x: "x", y: "y", guides: { legend: { order: { values: ["A"] } } } });
p.createPiePlot({ category: "group", guides: { legend: { order: { channel: "theta" } } } });
p.createDensityPlot({ field: "x", guides: { legend: { order: "scale" } } });
// @ts-expect-error Cartesian facades cannot link theta
p.createScatterPlot({ x: "x", y: "y", guides: { legend: { order: { channel: "theta" } } } });
// @ts-expect-error Cartesian facades cannot link theta
p.createBarPlot({ x: "x", y: "y", guides: { legend: { order: { channel: "theta" } } } });
// @ts-expect-error declared Line positions are quantitative or temporal
p.createLinePlot({ x: "x", y: "y", guides: { legend: { order: { channel: "x" } } } });
// @ts-expect-error Parallel has dimension axes, not categorical x/y/theta
p.createParallelCoordinates({ dimensions: ["x", "y"], guides: { legend: { order: { channel: "y" } } } });
// @ts-expect-error Pie does not have Cartesian positions
p.createPiePlot({ category: "group", guides: { legend: { order: { channel: "x" } } } });
// @ts-expect-error Density positions are quantitative or temporal
p.createDensityPlot({ field: "x", guides: { legend: { order: { channel: "theta" } } } });
// @ts-expect-error radius is quantitative position
p.orderCategories({ channel: "radius", values: [1] });
// @ts-expect-error direction belongs only to computed order
p.orderCategories({ channel: "theta", values: ["A"], direction: "ascending" });
// @ts-expect-error only categorical position channels can link
p.editLegend({ order: { channel: "color" } });
// @ts-expect-error exclusive explicit or linked order
p.createLegend({ order: { channel: "theta", values: ["A"] } });
// @ts-expect-error category values are nominal scalars
p.editLegend({ order: { values: [null] } });
// @ts-expect-error reset uses scale
p.editLegend({ order: "auto" });
`);
    const result = spawnSync(path.join(root, "node_modules/.bin/tsc"), ["--noEmit", "--strict", "--skipLibCheck",
      "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file], { encoding: "utf8", cwd: root });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
