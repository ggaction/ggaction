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
