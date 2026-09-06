import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const root = fileURLToPath(new URL("../../", import.meta.url));

test("declares full-only Polar point and line facades with separate position and glyph roles", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-polar-facade-types-"));
  try {
    const file = path.join(directory, "polar.mts");
    await writeFile(file, `
import type { ChartProgram } from ${JSON.stringify(path.join(root, "types/program.js"))};
import type { BasicChartProgram } from ${JSON.stringify(path.join(root, "types/basic.js"))};
declare const p: ChartProgram;
declare const basic: BasicChartProgram;
p.createPolarScatterPlot({ theta: "angle", radius: "distance" });
p.createPolarScatterPlot({ theta: { field: "date", fieldType: "temporal", temporalUnit: "timestamp" }, radius: { field: "distance", scale: { type: "sqrt" } }, size: "mass", point: { shape: "circle" }, guides: { axes: { radius: { angle: 45 } }, grid: { theta: {} }, legend: { position: "bottom" } } });
p.createPolarLinePlot({ theta: { field: "dimension", fieldType: "ordinal", scale: { type: "point" } }, radius: "value", groupBy: ["series", "region"], color: "series", strokeDash: { field: "region" }, line: { closed: true } });
// @ts-expect-error theta is required
p.createPolarScatterPlot({ radius: "distance" });
// @ts-expect-error radius is required
p.createPolarLinePlot({ theta: "angle" });
// @ts-expect-error radial position is quantitative
p.createPolarScatterPlot({ theta: "angle", radius: { field: "distance", fieldType: "nominal" } });
// @ts-expect-error temporal units belong only to temporal theta
p.createPolarLinePlot({ theta: { field: "angle", temporalUnit: "iso" }, radius: "distance" });
// @ts-expect-error Cartesian guides do not belong to Polar facades
p.createPolarScatterPlot({ theta: "angle", radius: "distance", guides: { axes: { x: {} } } });
// @ts-expect-error aggregate theta is outside the direct point/line facade
p.createPolarLinePlot({ theta: { field: "angle", aggregate: "sum" }, radius: "distance" });
// @ts-expect-error Full only
basic.createPolarScatterPlot({ theta: "angle", radius: "distance" });
// @ts-expect-error Full only
basic.createPolarLinePlot({ theta: "angle", radius: "distance" });
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
