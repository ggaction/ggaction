import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../../", import.meta.url));

test("declares Full-only ECDF data, chart, and atomic statistical editor", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-ecdf-types-"));
  try {
    const file = path.join(directory, "ecdf.mts");
    await writeFile(file, `
import type { ChartProgram, DatasetTransform } from ${JSON.stringify(path.join(root, "types/program.js"))};
import type { BasicChartProgram } from ${JSON.stringify(path.join(root, "types/basic.js"))};
declare const p: ChartProgram;
declare const basic: BasicChartProgram;
p.createECDFData({ id: "distribution", field: "value" });
p.createECDFData({ id: "weighted", source: "data", field: "value", groupBy: ["group"], weight: "weight", missing: "error", as: { value: "x", cumulative: "n", probability: "p" } });
p.createECDFPlot({ field: "value" });
p.createECDFPlot({ id: "dist", data: "data", field: "value", groupBy: ["group"], color: { field: "group", fieldType: "nominal" }, line: { strokeWidth: 3 }, labels: {} });
p.editECDFPlot({ target: "dist", data: "filtered", groupBy: false, weight: false, color: false });
const transform: DatasetTransform = { type: "ecdf", field: "value", groupBy: [], missing: "drop", as: { value: "x", cumulative: "n", probability: "p" } };
void transform;
// @ts-expect-error field is required
p.createECDFPlot({});
// @ts-expect-error missing is closed
p.createECDFData({ id: "bad", field: "value", missing: "keep" });
// @ts-expect-error line curve is owned by ECDF topology
p.createECDFPlot({ field: "value", line: { curve: "linear" } });
// @ts-expect-error chart color must be categorical
p.createECDFPlot({ field: "value", color: { field: "group", fieldType: "quantitative" } });
// @ts-expect-error Full only
basic.createECDFData({ id: "distribution", field: "value" });
// @ts-expect-error Full only
basic.createECDFPlot({ field: "value" });
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
