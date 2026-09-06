import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../../", import.meta.url));

test("declares a Full-only orientation-safe Rug contract", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-rug-facade-types-"));
  try {
    const file = path.join(directory, "rug.mts");
    await writeFile(file, `
import type { ChartProgram, CreateRugPlotOptions } from ${JSON.stringify(path.join(root, "types/program.js"))};
import type { BasicChartProgram } from ${JSON.stringify(path.join(root, "types/basic.js"))};
declare const p: ChartProgram;
declare const basic: BasicChartProgram;
const options: CreateRugPlotOptions = { x: "value", edge: "bottom" };
p.createRugPlot(options);
p.createRugPlot({ x: { field: "date", fieldType: "temporal", temporalUnit: "timestamp" }, edge: "top", tick: { length: 8 }, guides: false });
p.createRugPlot({ y: { field: "value", scale: { type: "sqrt" } }, edge: "right" });
// @ts-expect-error x measure cannot use a horizontal edge.
p.createRugPlot({ x: "value", edge: "left" });
// @ts-expect-error y measure cannot use a vertical edge.
p.createRugPlot({ y: "value", edge: "top" });
// @ts-expect-error Rug accepts exactly one measure.
p.createRugPlot({ x: "value", y: "value", edge: "bottom" });
// @ts-expect-error categorical measure is unsupported.
p.createRugPlot({ x: { field: "category", fieldType: "nominal" }, edge: "bottom" });
// @ts-expect-error Rug is Full only.
basic.createRugPlot(options);
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
