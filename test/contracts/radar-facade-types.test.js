import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../../", import.meta.url));

test("declares full-only long and explicit-wide Radar contracts", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-radar-facade-types-"));
  try {
    const file = path.join(directory, "radar.mts");
    await writeFile(file, `
import type { ChartProgram } from ${JSON.stringify(path.join(root, "types/program.js"))};
import type { BasicChartProgram } from ${JSON.stringify(path.join(root, "types/basic.js"))};
declare const p: ChartProgram;
declare const basic: BasicChartProgram;
p.createRadarPlot({ category: "dimension", value: "score" });
p.createRadarPlot({ category: { field: "dimension", fieldType: "ordinal", scale: { type: "point" } }, value: { field: "score", scale: { type: "sqrt" } }, groupBy: ["series", "region"], order: ["speed", "quality", "cost"], color: "series", strokeDash: { field: "region" }, line: { closed: true } });
p.createRadarPlot({ wide: { fields: ["speed", "quality", "cost"] }, groupBy: "product" });
p.createRadarPlot({ wide: { fields: ["speed", "quality", "cost"], as: { key: "metric", value: "score" } }, order: ["quality", "cost", "speed"] });
// @ts-expect-error long form requires value
p.createRadarPlot({ category: "dimension" });
// @ts-expect-error long and wide forms are exclusive
p.createRadarPlot({ category: "dimension", value: "score", wide: { fields: ["a", "b", "c"] } });
// @ts-expect-error Radar requires at least three wide fields
p.createRadarPlot({ wide: { fields: ["speed", "quality"] } });
// @ts-expect-error Radar order requires at least three categories
p.createRadarPlot({ category: "dimension", value: "score", order: ["speed", "quality"] });
// @ts-expect-error Radar category is categorical
p.createRadarPlot({ category: { field: "dimension", fieldType: "quantitative" }, value: "score" });
// @ts-expect-error Radar values are quantitative
p.createRadarPlot({ category: "dimension", value: { field: "score", fieldType: "nominal" } });
// @ts-expect-error Radar paths cannot be opened
p.createRadarPlot({ category: "dimension", value: "score", line: { closed: false } });
// @ts-expect-error Full only
basic.createRadarPlot({ category: "dimension", value: "score" });
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
