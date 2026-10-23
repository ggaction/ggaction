import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const chartRoot = fileURLToPath(new URL("../charts/", import.meta.url));

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? [target, ...walk(target)] : [target];
  });
}

test("keeps chart variants under one capability-oriented variants tree", () => {
  for (const chart of readdirSync(chartRoot, { withFileTypes: true })) {
    if (!chart.isDirectory()) continue;
    const directory = path.join(chartRoot, chart.name);
    const nested = walk(directory).filter(target =>
      path.dirname(target) !== directory
    );
    for (const target of nested) {
      const [owner] = path.relative(directory, target).split(path.sep);
      assert.equal(owner, "variants", path.relative(chartRoot, target));
    }
  }
});

test("uses capability names instead of completed gate or phase names", () => {
  for (const target of walk(chartRoot)) {
    assert.doesNotMatch(
      path.basename(target),
      /(?:^|[-_.])(gate|phase)[-_]?\w*/i,
      path.relative(chartRoot, target)
    );
  }
});

test("baseline evidence declares shared production dependencies without claiming independent geometry", async () => {
  const { baselineEvidence } = await import("../../scripts/baseline-evidence.js");
  const { readFileSync, existsSync } = await import("node:fs");
  const records = baselineEvidence();
  assert.deepEqual(JSON.parse(readFileSync(new URL("../charts/baseline-evidence.json", import.meta.url), "utf8")), records);
  for (const record of records) {
    assert.ok(record.proof.includes("equivalence"));
    assert.ok(record.independentGeometry.includes("not inferred"));
    for (const file of [...record.sharedProductionImports, ...record.independentOracleImports]) {
      assert.ok(existsSync(new URL(`../../${file}`, import.meta.url)), file);
    }
  }
  const selection = records.find(record => record.file === "test/charts/mark-selection-points/primitive.program.js");
  assert.ok(selection.sharedProductionImports.includes("src/grammar/pointShapes.js"));
  const composition = records.find(record => record.file === "test/charts/program-composition/variants/layouts/primitive.program.js");
  assert.ok(composition.sharedProductionImports.includes("src/layout/composition.js"));
});
