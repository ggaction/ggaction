import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const root = fileURLToPath(new URL("../../", import.meta.url));

test("declares quantitative midpoint while excluding temporal, position and discrete roles", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-midpoint-types-"));
  try {
    const file = path.join(directory, "radius.mts");
    await writeFile(file, `
import type { ChartProgram } from ${JSON.stringify(path.join(root, "types/program.js"))};
import type { BasicChartProgram } from ${JSON.stringify(path.join(root, "types/basic.js"))};
declare const p: ChartProgram;
declare const basic: BasicChartProgram;
p.createScale({ id: "colors", type: "sequential", midpoint: 0 });
p.editScale({ midpoint: "auto" });
p.encodeColor({ field: "v", fieldType: "quantitative", scale: { midpoint: 0 } });
p.createScatterPlot({ x: "x", y: "y", color: { field: "v", fieldType: "quantitative", scale: { midpoint: 0 } } });
p.createBarPlot({ x: "category", y: "value", color: { field: "value", fieldType: "quantitative", scale: { midpoint: 0 } } });
basic.encodeColor({ field: "v", fieldType: "quantitative", scale: { midpoint: 0 } });
// @ts-expect-error midpoint must be numeric or auto
p.editScale({ midpoint: "zero" });
// @ts-expect-error quantitative position has no midpoint
p.encodeX({ field: "v", scale: { midpoint: 0 } });
// @ts-expect-error temporal color cannot carry a numeric midpoint
p.encodeColor({ field: "date", fieldType: "temporal", scale: { midpoint: 0 } });
// @ts-expect-error categorical color cannot carry a midpoint
p.encodeColor({ field: "category", scale: { midpoint: 0 } });
// @ts-expect-error discretized color cannot carry a midpoint
p.encodeColor({ field: "v", fieldType: "quantitative", scale: { type: "quantize", midpoint: 0 } });
`);
    const result = spawnSync(path.join(root, "node_modules/.bin/tsc"), ["--noEmit", "--strict", "--skipLibCheck",
      "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file], { encoding: "utf8", cwd: root });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
