import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../../", import.meta.url));

test("source rows preserve structural interfaces and reject non-storable values in both entries", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-source-types-"));
  try {
    const file = path.join(directory, "rows.mts");
    await writeFile(file, `
import type { ChartProgram } from ${JSON.stringify(path.join(root, "types/program.js"))};
import type { BasicChartProgram } from ${JSON.stringify(path.join(root, "types/basic.js"))};
declare const full: ChartProgram;
declare const basic: BasicChartProgram;
interface Row { x: number; nested: { tags: readonly string[] }; missing?: number; }
declare const rows: readonly Row[];
full.reviseData({ source: "data", id: "next", values: rows });
// @ts-expect-error explicit source and fresh identity are required
full.reviseData({ values: rows });
// @ts-expect-error source revision is Full only
basic.reviseData({ source: "data", id: "next", values: rows });
// @ts-expect-error revision has the same stored cell boundary
full.reviseData({ source: "data", id: "next", values: [{ callback: () => 1 }] });
${["full", "basic"].map(name => `
${name}.createData({ values: rows }).createScatterPlot({ x: "x", y: "x" });
${name}.createData({ values: [] });
${name}.createData({ values: [{ x: 1, n: null, b: 12n, s: Symbol(), nested: [{ y: 1 }] }] });
// @ts-expect-error rows must be objects
${name}.createData({ values: [1, 2, 3] });
// @ts-expect-error dates are not plain rows
${name}.createData({ values: [new Date()] });
// @ts-expect-error null is not a row
${name}.createData({ values: [null] });
// @ts-expect-error arrays are cells, not rows
${name}.createData({ values: [[1, 2]] });
// @ts-expect-error sparse rows contain undefined
${name}.createData({ values: [, { x: 1 }] });
// @ts-expect-error function cell cannot be owned
${name}.createData({ values: [{ x: 1, callback: () => 1 }] });
// @ts-expect-error nested function cell cannot be owned
${name}.createData({ values: [{ nested: [{ callback: () => 1 }] }] });
// @ts-expect-error nested Date is not storable
${name}.createData({ values: [{ date: new Date() }] });
`).join("\n")}
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
