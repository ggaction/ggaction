import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));

test("continuous color and stroke declarations retain closed palette descriptors", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-continuous-palette-types-"));
  try {
    const file = path.join(directory, "consumer.mts");
    await writeFile(file, `
import type { ChartProgram, ContinuousColorScaleOptions } from ${JSON.stringify(path.join(root, "types/index.js"))};
import type { BasicChartProgram } from ${JSON.stringify(path.join(root, "types/basic.js"))};
declare const p: ChartProgram;
declare const basic: BasicChartProgram;
const palette = { name: "turbo", count: 64, extent: [0.1, 0.9] } as const;
const top = { type: "sequential", domain: [1, 100], palette } as const;
const nested = { type: "sequential", domain: [1, 100], range: { palette } } as const;
const scale: ContinuousColorScaleOptions = nested;
const sampled: ContinuousColorScaleOptions = { palette: { name: "turbo", count: 64 } };
p.encodeStroke({ field: "v", fieldType: "quantitative", scale: { palette: { name: "turbo", count: 64 } } });
for (const scale of [top, nested]) {
  p.encodeColor({ field: "v", fieldType: "quantitative", scale });
  basic.encodeColor({ field: "v", fieldType: "quantitative", scale });
  p.encodeColor({ field: "date", fieldType: "temporal", scale });
  p.encodeStroke({ field: "v", fieldType: "quantitative", scale });
  p.encodeStroke({ field: "date", fieldType: "temporal", scale });
  p.encodeChannels({ target: "points", channels: {
    color: { field: "v", fieldType: "quantitative", scale },
    stroke: { field: "v", fieldType: "quantitative", scale }
  } });
  p.createScatterPlot({ x: "x", y: "y", color: { field: "v", fieldType: "quantitative", scale } });
  basic.createScatterPlot({ x: "x", y: "y", color: { field: "v", fieldType: "quantitative", scale } });
  p.createScatterPlot({ x: "x", y: "y", stroke: { field: "v", fieldType: "quantitative", scale } });
  basic.createScatterPlot({ x: "x", y: "y", stroke: { field: "v", fieldType: "quantitative", scale } });
  p.createBarPlot({ x: "x", y: { field: "y", aggregate: "sum" }, color: { field: "v", fieldType: "quantitative", aggregate: "mean", scale } });
  basic.createBarPlot({ x: "x", y: { field: "y", aggregate: "sum" }, color: { field: "v", fieldType: "quantitative", aggregate: "mean", scale } });
  p.createHeatmap({ x: "x", y: "y", color: { field: "v", fieldType: "quantitative", scale } });
  basic.createHeatmap({ x: "x", y: "y", color: { field: "v", fieldType: "quantitative", scale } });
}
for (const type of ["log", "sqrt", "symlog"] as const) {
  p.encodeStroke({ field: "v", fieldType: "quantitative", scale: { type, palette } });
  p.encodeColor({ field: "v", fieldType: "quantitative", scale: { type, range: { palette } } });
}
p.encodeColor({ field: "v", fieldType: "quantitative", scale: { type: "pow", exponent: 2, range: { palette } } });
p.encodeStroke({ field: "v", fieldType: "quantitative", scale: { type: "pow", exponent: 2, palette } });
// @ts-expect-error names remain a closed vocabulary
const badName: ContinuousColorScaleOptions = { palette: { name: "made-up", count: 64 } };
// @ts-expect-error count is numeric
const badCount: ContinuousColorScaleOptions = { palette: { name: "turbo", count: "64" } };
// @ts-expect-error descriptor has no arbitrary keys
const badKey: ContinuousColorScaleOptions = { palette: { name: "turbo", counts: 64 } };
// @ts-expect-error extent is a pair
const badExtent: ContinuousColorScaleOptions = { palette: { name: "turbo", extent: [0, 0.5, 1] } };
// @ts-expect-error nested descriptors retain numeric count
const badNestedCount: ContinuousColorScaleOptions = { range: { palette: { name: "turbo", count: "64" } } };
// @ts-expect-error the range wrapper contains only palette
const badWrapper: ContinuousColorScaleOptions = { range: { palette: "turbo", count: 64 } };
// @ts-expect-error explicit color arrays still require at least two stops
const shortRange: ContinuousColorScaleOptions = { range: ["red"] };
// @ts-expect-error Basic does not gain the Full-only stroke action
basic.encodeStroke({ field: "v", fieldType: "quantitative", scale: nested });
`);
    const result = spawnSync(process.execPath, [path.join(root, "node_modules/typescript/bin/tsc"),
      "--noEmit", "--strict", "--skipLibCheck", "--target", "ES2022",
      "--module", "NodeNext", "--moduleResolution", "NodeNext", file
    ], { encoding: "utf8", cwd: root });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
