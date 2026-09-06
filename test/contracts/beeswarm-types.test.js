import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../../", import.meta.url));

test("declares Full-only role-safe point packing and Beeswarm contracts", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-beeswarm-types-"));
  try {
    const file = path.join(directory, "beeswarm.mts");
    await writeFile(file, `
import type { ChartProgram, CreateBeeswarmPlotOptions, PackPointsOptions } from ${JSON.stringify(path.join(root, "types/program.js"))};
import type { BasicChartProgram } from ${JSON.stringify(path.join(root, "types/basic.js"))};
declare const p: ChartProgram;
declare const basic: BasicChartProgram;
const packing: PackPointsOptions = { channel: "x", maxOffset: { band: 0.4 }, padding: 2, key: "id", overflow: "overlap" };
p.packPoints(packing).removePointPacking();
const options: CreateBeeswarmPlotOptions = { x: { field: "category", fieldType: "nominal" }, y: "value", packing: { key: "id" } };
p.createBeeswarmPlot(options);
p.createBeeswarmPlot({ x: { field: "date", fieldType: "temporal" }, y: { field: "group", fieldType: "ordinal" }, packing: false });
// @ts-expect-error x and y are required.
p.createBeeswarmPlot({ x: "value" });
// @ts-expect-error two measures are ambiguous.
p.createBeeswarmPlot({ x: { field: "a", fieldType: "quantitative" }, y: { field: "b", fieldType: "quantitative" } });
// @ts-expect-error two categories are ambiguous.
p.createBeeswarmPlot({ x: { field: "a", fieldType: "nominal" }, y: { field: "b", fieldType: "ordinal" } });
// @ts-expect-error packing owns its category channel.
p.createBeeswarmPlot({ x: "value", y: { field: "group", fieldType: "nominal" }, packing: { channel: "y" } });
// @ts-expect-error maxOffset uses exactly one unit.
p.packPoints({ channel: "x", maxOffset: { pixels: 2, band: 0.1 } });
// @ts-expect-error channel is Cartesian.
p.packPoints({ channel: "theta" });
// @ts-expect-error Beeswarm is Full only.
basic.createBeeswarmPlot(options);
// @ts-expect-error packing is Full only.
basic.packPoints(packing);
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
