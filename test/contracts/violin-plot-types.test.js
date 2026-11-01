import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileTypeScript } from "../support/typescript.js";

const root = fileURLToPath(new URL("../../", import.meta.url));

test("Violin declares explicit density, split, native role revision and Full-only boundaries", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-violin-types-"));
  try {
    const file = path.join(directory, "violin.mts");
    await writeFile(file, `
import type { ChartProgram } from ${JSON.stringify(path.join(root, "types/program.js"))};
import type { BasicChartProgram } from ${JSON.stringify(path.join(root, "types/basic.js"))};
declare const p: ChartProgram;
declare const basic: BasicChartProgram;
p.createViolinPlot({ id: "profiles", x: "group", y: "value" });
p.createViolinPlot({ x: { field: "group", fieldType: "ordinal" }, y: { field: "value", fieldType: "quantitative" }, split: { field: "period", domain: ["early", "late"] }, color: "period", density: { bandwidth: .5, extent: [0, 10], steps: 20, weight: { field: "weight", kind: "frequency" }, width: { band: .8, resolve: "independent" } }, area: { opacity: .8, strokeWidth: 2 }, guides: { legend: { title: "Period" } } });
p.editViolinPlot({ target: "profiles", x: "value", y: "group", split: false, density: { bandwidth: 1, side: "top", weight: false } });
p.editViolinPlot({ target: "profiles", data: "replacement", density: { width: { band: .5, resolve: "shared" } } });
// @ts-expect-error Both positional roles are required when creating a profile.
p.createViolinPlot({ x: "group" });
// @ts-expect-error Split domain has exactly two explicit values.
p.createViolinPlot({ x: "group", y: "value", split: { field: "period", domain: ["one", "two", "three"] } });
// @ts-expect-error Color remains categorical at the profile grain.
p.createViolinPlot({ x: "group", y: "value", color: { field: "value", fieldType: "quantitative" } });
// @ts-expect-error A density side is an explicit supported direction.
p.editViolinPlot({ density: { side: "middle" } });
// @ts-expect-error Profile revision does not author mark appearance.
p.editViolinPlot({ target: "profiles", area: { opacity: .5 } });
// @ts-expect-error Violin is Full-only.
basic.createViolinPlot({ x: "group", y: "value" });
// @ts-expect-error Violin revision is Full-only.
basic.editViolinPlot({ target: "profiles", density: { bandwidth: 1 } });
`);
    const result = compileTypeScript(["--noEmit", "--strict", "--skipLibCheck", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file], { encoding: "utf8", cwd: root });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
