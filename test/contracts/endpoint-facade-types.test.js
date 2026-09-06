import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../../", import.meta.url));

test("declares Full-only endpoint chart facades and their atomic role editor", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-endpoint-types-"));
  try {
    const file = path.join(directory, "facades.mts");
    await writeFile(file, `
import type { ChartProgram } from ${JSON.stringify(path.join(root, "types/program.js"))};
import type { BasicChartProgram } from ${JSON.stringify(path.join(root, "types/basic.js"))};
declare const p: ChartProgram;
declare const basic: BasicChartProgram;
p.createDotPlot({ category: "category", value: "value" });
p.createDotPlot({ category: { field: "category", fieldType: "ordinal", scale: { reverse: true } }, value: { field: "value", scale: { zero: false } }, summary: "median", labels: {} });
p.createLollipopPlot({ category: "category", value: "value", baseline: -2, stem: { strokeDash: [2, 2] } });
p.createDumbbellPlot({ category: "category", start: "before", end: "after", labels: { endpoint: "both" } });
p.editEndpointPlot({ target: "change", data: "next", start: "after", end: "before", orientation: "vertical", summary: false });
// @ts-expect-error value is required
p.createDotPlot({ category: "category" });
// @ts-expect-error category positions are categorical
p.createDotPlot({ category: { field: "category", fieldType: "quantitative" }, value: "value" });
// @ts-expect-error endpoint measures are quantitative
p.createDumbbellPlot({ category: "category", start: { field: "before", fieldType: "nominal" }, end: "after" });
// @ts-expect-error stem has a closed style vocabulary
p.createLollipopPlot({ category: "category", value: "value", stem: { fill: "red" } });
// @ts-expect-error Full only
basic.createDotPlot({ category: "category", value: "value" });
// @ts-expect-error Full only
basic.editEndpointPlot({ value: "other" });
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
