import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../../", import.meta.url));
test("area endpoint declarations accept mixed bounds and reject ambiguous constant pairs", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-area-types-"));
  try {
    const file = path.join(directory, "area.mts");
    await writeFile(file, `
import type { ChartProgram } from ${JSON.stringify(path.join(root, "types/program.js"))};
import type { BasicChartProgram } from ${JSON.stringify(path.join(root, "types/basic.js"))};
declare const program: ChartProgram;
declare const basic: BasicChartProgram;
program.createAreaPlot({ x: "time", y: "value" }).layoutSeries({ mode: "center" });
program.createAreaPlot({ x: { field: "value", scale: { type: "log" } }, y: "time", valueChannel: "x", baseline: 1 });
program.createAreaPlot({ x: "time", y: { lower: { datum: 0 }, upper: "value" }, missing: "break" });
basic.encodeGroup({ fields: ["series", "region"] }).layoutSeries({ mode: "stack" });
// @ts-expect-error Area belongs to the full entry
basic.createAreaPlot({ x: "time", y: "value" });
// @ts-expect-error Bar does not support center
basic.layoutSeries({ mode: "center" });
// @ts-expect-error layout mode is required
program.layoutSeries({});
// @ts-expect-error no encodeLayout alias
program.encodeLayout({ mode: "stack" });
// @ts-expect-error Area does not support group placement
program.createAreaPlot({ x: "time", y: "value", layout: "group" });
// @ts-expect-error both endpoints cannot be constants
program.createAreaPlot({ x: "time", y: { lower: { datum: 0 }, upper: { datum: 1 } } });
// @ts-expect-error range and baseline cannot both own the endpoints
program.createAreaPlot({ x: "time", y: { lower: "lo", upper: "hi" }, baseline: 0 });
// @ts-expect-error independent position cannot be nominal
program.createAreaPlot({ x: { field: "time", fieldType: "nominal" }, y: "value" });
// @ts-expect-error quantitative independent positions cannot use temporal scales
program.createAreaPlot({ x: { field: "time", fieldType: "quantitative", scale: { type: "time" } }, y: "value" });
// @ts-expect-error temporal units require a temporal field role
program.createAreaPlot({ x: { field: "time", temporalUnit: "seconds" }, y: "value" });
// @ts-expect-error measurement does not aggregate raw rows
program.createAreaPlot({ x: "time", y: { field: "value", aggregate: "sum" } });
program.createAreaMark({ missing: "break" });
program.editAreaMark({ missing: "error" });
program.encodeYRange({ lower: "value", upper: { datum: 0 } });
program.encodeXRange({ lower: { datum: 1 }, upper: "value", scale: { type: "log" } });
program.encodeX2({ datum: 1 });
program.encodeY2({ datum: 0 });
// @ts-expect-error at least one field endpoint
program.encodeYRange({ lower: { datum: 1 }, upper: { datum: 2 } });
// @ts-expect-error constants are quantitative
program.encodeXRange({ lower: { datum: 1 }, upper: "value", fieldType: "temporal" });
// @ts-expect-error datum must be numeric
program.encodeYRange({ lower: "value", upper: { datum: "zero" } });
// @ts-expect-error closed missing vocabulary
program.editAreaMark({ missing: "skip" });
// @ts-expect-error unsupported missing-value field shorthand
program.createAreaMark({ missing: false });
`);
    const result = spawnSync(path.join(root, "node_modules/.bin/tsc"), ["--noEmit", "--strict", "--skipLibCheck",
      "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file], { encoding: "utf8", cwd: root });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
