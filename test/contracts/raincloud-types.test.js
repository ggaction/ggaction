import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../../", import.meta.url));

test("declares Full-only role-safe Raincloud create and edit contracts", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-raincloud-types-"));
  try {
    const file = path.join(directory, "raincloud.mts");
    await writeFile(file, `
import type { ChartProgram, CreateRaincloudPlotOptions, EditRaincloudPlotOptions } from ${JSON.stringify(path.join(root, "types/program.js"))};
import type { BasicChartProgram } from ${JSON.stringify(path.join(root, "types/basic.js"))};
declare const p: ChartProgram;
declare const basic: BasicChartProgram;
const options: CreateRaincloudPlotOptions = {
  category: { field: "group", fieldType: "nominal" }, value: "value",
  density: { bandwidth: 0.4, width: { band: 0.7 }, area: { opacity: 0.6 } },
  summary: { type: "interval", center: "median", extent: "iqr" },
  points: { type: "beeswarm", packing: { key: "id", overflow: "overlap" } },
  color: "group"
};
p.createRaincloudPlot(options);
const edit: EditRaincloudPlotOptions = { target: "rain", orientation: "horizontal", side: "after", summary: false, color: false };
p.editRaincloudPlot(edit);
p.createViolinPlot({ x: "group", y: "value", density: { side: "left" } });
// @ts-expect-error category is required.
p.createRaincloudPlot({ value: "value" });
// @ts-expect-error strip points cannot use packing.
p.createRaincloudPlot({ category: "group", value: "value", points: { type: "strip", packing: {} } });
// @ts-expect-error Beeswarm points cannot use jitter.
p.createRaincloudPlot({ category: "group", value: "value", points: { type: "beeswarm", jitter: false } });
// @ts-expect-error unknown side.
p.editRaincloudPlot({ side: "left" });
// @ts-expect-error Raincloud is Full only.
basic.createRaincloudPlot(options);
// @ts-expect-error Raincloud editing is Full only.
basic.editRaincloudPlot(edit);
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
