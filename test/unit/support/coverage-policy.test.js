import assert from "node:assert/strict";
import test from "node:test";

import {
  assertCriticalCoverage,
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
