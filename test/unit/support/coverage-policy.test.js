import assert from "node:assert/strict";
import test from "node:test";

import {
  assertCriticalCoverage,
  coverageFloorsForFiles,
  CRITICAL_COVERAGE_FAMILIES,
  CRITICAL_COVERAGE_FLOORS,
  parseCoverageTable
} from "../../../scripts/coverage-policy.js";

const report = `
ℹ file                    | line % | branch % | funcs % | uncovered lines
ℹ src                     |        |          |         |
ℹ  core                   |        |          |         |
ℹ   immutable.js          |  95.00 |    90.00 |  100.00 |
ℹ  renderers              |        |          |         |
ℹ   canvas                |        |          |         |
ℹ    index.js             |  88.00 |    75.00 |  100.00 |
`;

test("parses nested native coverage rows into source-relative paths", () => {
  assert.deepEqual(
    Object.fromEntries(parseCoverageTable(report)),
    {
      "core/immutable.js": { lines: 95, branches: 90, functions: 100 },
      "renderers/canvas/index.js": { lines: 88, branches: 75, functions: 100 }
    }
  );
});

test("parses Node 22 TAP-prefixed native coverage rows", () => {
  assert.deepEqual(
    Object.fromEntries(parseCoverageTable(report.replaceAll("ℹ", "#"))),
    {
      "core/immutable.js": { lines: 95, branches: 90, functions: 100 },
      "renderers/canvas/index.js": { lines: 88, branches: 75, functions: 100 }
    }
  );
});

test("enforces explicit critical-file coverage floors", () => {
  assert.doesNotThrow(() => assertCriticalCoverage(report, {
    "core/immutable.js": { lines: 90, branches: 85, functions: 100 }
  }));
  assert.throws(() => assertCriticalCoverage(report, {
    "core/immutable.js": { lines: 96, branches: 85, functions: 100 },
    "renderers/png.js": { lines: 90, branches: 80, functions: 100 }
  }), /immutable\.js: lines 95%.*renderers\/png\.js: missing/s);
});

test("applies critical family floors to new matching source files", () => {
  const floors = coverageFloorsForFiles([
    "materialization/selection/new-mark.js",
    "unrelated/helper.js"
  ], CRITICAL_COVERAGE_FAMILIES, {});
  assert.deepEqual(floors, {
    "materialization/selection/new-mark.js": {
      lines: 80,
      branches: 65,
      functions: 80
    }
  });
});

test("keeps explicit critical overrides above family defaults", () => {
  assert.equal(
    CRITICAL_COVERAGE_FLOORS["materialization/selection/items/point.js"].lines,
    95
  );
  assert.deepEqual(
    CRITICAL_COVERAGE_FLOORS["renderers/canvas/circle.js"],
    { lines: 75, branches: 60, functions: 80 }
  );
  assert.deepEqual(
    CRITICAL_COVERAGE_FLOORS["grammar/regression/models.js"],
    { lines: 90, branches: 75, functions: 100 }
  );
  assert.deepEqual(
    CRITICAL_COVERAGE_FLOORS["actions/coordinates/parallel.js"],
    { lines: 85, branches: 75, functions: 85 }
  );
  assert.deepEqual(
    CRITICAL_COVERAGE_FLOORS["core/compositionState.js"],
    { lines: 90, branches: 85, functions: 100 }
  );
});

test("rejects missing metrics instead of comparing NaN to a floor", () => {
  assert.throws(() => assertCriticalCoverage("# src | | | |\n#  fake.js | 100 | | |", {
    "fake.js": { lines:100, branches:100, functions:100 }
  }), /Malformed/);
});

test("requires every source file or an explicit subprocess exclusion", async () => {
 const { assertSourceCoverage } = await import("../../../scripts/coverage-policy.js");
 assert.doesNotThrow(() => assertSourceCoverage(report, ["core/immutable.js"], {}));
 assert.throws(() => assertSourceCoverage(report, ["new/unloaded.js"], {}), /missing/);
 assert.throws(() => assertSourceCoverage(report, [], { "removed.js":"A documented but stale exclusion" }), /Invalid/);
 for (const file of ["core/new.js", "renderers/svg/new.js", "selectors/new.js", "mcp/new.js", "inspection/new.js", "scene/new.js", "grammar/patterns.js"]) {
  assert.ok(coverageFloorsForFiles([file], CRITICAL_COVERAGE_FAMILIES, {})[file], file);
 }
});
