import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../../", import.meta.url));

test("declares typed computed expressions and Full-only normalization", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-normalize-types-"));
  try {
    const file = path.join(directory, "normalized.mts");
    await writeFile(file, `
import type { ChartProgram } from ${JSON.stringify(path.join(root, "types/program.js"))};
import type { BasicChartProgram } from ${JSON.stringify(path.join(root, "types/basic.js"))};
declare const p: ChartProgram;
declare const basic: BasicChartProgram;
p.createComputedData({ id: "label", as: "label", expression: {
  op: "if",
  condition: { op: "isNull", operand: { field: "name" } },
  then: { constant: "Unknown" },
  else: { op: "concat", operands: [{ field: "name" }, { constant: "!" }] }
} });
p.createNormalizedData({ id: "share", field: "x", as: "share", method: "share" });
p.createNormalizedData({ id: "z", field: "x", as: "z", method: "zscore", variance: "sample" });
p.createNormalizedData({ id: "index", field: "x", as: "index", method: "index",
  sortBy: [{ field: "time" }] });
p.createNormalizedData({ id: "change", field: "x", as: "change", method: "change",
  baseline: { value: 0 } });
// @ts-expect-error position baseline requires a sort
p.createNormalizedData({ id: "index", field: "x", as: "index", method: "index" });
// @ts-expect-error change has no denominator policy
p.createNormalizedData({ id: "change", field: "x", as: "change", method: "change", baseline: { value: 0 }, zeroDenominator: "zero" });
// @ts-expect-error and requires two operands
p.createComputedData({ id: "bad", as: "bad", expression: {
  op: "and", operands: [{ constant: true }]
} });
// @ts-expect-error Full only
basic.createNormalizedData({ id: "share", field: "x", as: "share", method: "share" });
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
