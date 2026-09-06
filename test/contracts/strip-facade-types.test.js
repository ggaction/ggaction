import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../../", import.meta.url));

test("declares a Full-only role-safe Strip contract", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-strip-facade-types-"));
  try {
    const file = path.join(directory, "strip.mts");
    await writeFile(file, `
import type { ChartProgram, CreateStripPlotOptions } from ${JSON.stringify(path.join(root, "types/program.js"))};
import type { BasicChartProgram } from ${JSON.stringify(path.join(root, "types/basic.js"))};
declare const p: ChartProgram;
declare const basic: BasicChartProgram;
const options: CreateStripPlotOptions = { x: "value", jitter: { maxOffset: { pixels: 8 } } };
p.createStripPlot(options);
p.createStripPlot({ x: { field: "category", fieldType: "nominal" }, y: { field: "value", scale: { type: "sqrt" } }, jitter: { maxOffset: { band: 0.2 }, key: "id" } });
p.createStripPlot({ x: { field: "date", fieldType: "temporal" }, y: { field: "category", fieldType: "ordinal" }, color: "series", point: { radius: 3 } });
p.createStripPlot({ x: "value", coordinate: "detail" });
// @ts-expect-error x is required.
p.createStripPlot({});
// @ts-expect-error a lone categorical x has no measure.
p.createStripPlot({ x: { field: "category", fieldType: "nominal" } });
// @ts-expect-error two measures are ambiguous.
p.createStripPlot({ x: { field: "a", fieldType: "quantitative" }, y: { field: "b", fieldType: "quantitative" } });
// @ts-expect-error two categorical positions are ambiguous.
p.createStripPlot({ x: { field: "a", fieldType: "nominal" }, y: { field: "b", fieldType: "ordinal" } });
// @ts-expect-error a constant slot requires pixel jitter.
p.createStripPlot({ x: "value", jitter: { maxOffset: { band: 0.1 } } });
// @ts-expect-error a categorical slot requires band jitter.
p.createStripPlot({ x: "value", y: { field: "category", fieldType: "nominal" }, jitter: { maxOffset: { pixels: 4 } } });
// @ts-expect-error Strip is Full only.
basic.createStripPlot(options);
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
