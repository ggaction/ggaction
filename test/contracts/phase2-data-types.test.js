import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../../", import.meta.url));

test("declares Full-only completion, imputation, calendar, and duration windows", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-phase2-types-"));
  try {
    const file = path.join(directory, "phase2.mts");
    await writeFile(file, `
import type { ChartProgram } from ${JSON.stringify(path.join(root, "types/program.js"))};
import type { BasicChartProgram } from ${JSON.stringify(path.join(root, "types/basic.js"))};
import type { DatasetImputedTransform } from ${JSON.stringify(path.join(root, "types/program.js"))};
declare const p: ChartProgram;
declare const basic: BasicChartProgram;
p.createCompleteData({ id: "complete", key: "t", values: [1, 2, 3], members: "rows" });
p.createCompleteData({ id: "sequence", key: "t", sequence: { start: 0, end: 2, step: 1 } });
p.createImputedData({ id: "constant", fields: ["x"], method: "constant", value: null });
p.createImputedData({ id: "forward", fields: "x", method: "forward", sortBy: [{ field: "t" }] });
p.createImputedData({ id: "linear", fields: ["x"], method: "linear", sortBy: [{ field: "t", order: "ascending" }] });
p.createTimeUnitData({ id: "week", field: "t", as: "week", unit: "week", timeZone: "Asia/Seoul" });
p.createTimeUnitData({ id: "iso", field: "t", as: "week", unit: "week", weekRule: "iso", weekStartsOn: 1 });
p.createTimeUnitData({ id: "weekday", field: "t", as: "weekday", unit: "weekday" });
p.createWindowData({ id: "duration", temporalUnit: "timestamp", sortBy: [{ field: "t" }], operations: [{
  op: "movingMean", field: "x", as: "mean",
  frame: { duration: { preceding: 7, unit: "day" } }, minPeriods: 2, missing: "skip"
}] });
const storedLinear: DatasetImputedTransform = {
  type: "impute", fields: ["x"], groupBy: [], method: "linear",
  sortBy: [{ field: "t", order: "ascending" }], edges: "keep"
};
void storedLinear;
// @ts-expect-error complete domains are exclusive
p.createCompleteData({ id: "bad", key: "t", values: [1], sequence: { start: 0, end: 1, step: 1 } });
// @ts-expect-error forward requires sorting
p.createImputedData({ id: "bad", fields: ["x"], method: "forward" });
// @ts-expect-error linear is ascending
p.createImputedData({ id: "bad", fields: ["x"], method: "linear", sortBy: [{ field: "t", order: "descending" }] });
// @ts-expect-error stored linear transforms cannot retain a constant value
const badStoredLinear: DatasetImputedTransform = { type: "impute", fields: ["x"], groupBy: [], method: "linear", value: 0, sortBy: [{ field: "t", order: "ascending" }], edges: "keep" };
// @ts-expect-error week options do not apply to weekday
p.createTimeUnitData({ id: "bad", field: "t", as: "d", unit: "weekday", weekRule: "calendar" });
// @ts-expect-error ISO weeks are Monday based
p.createTimeUnitData({ id: "bad", field: "t", as: "d", unit: "week", weekRule: "iso", weekStartsOn: 0 });
// @ts-expect-error row and duration frames are exclusive
p.createWindowData({ id: "bad", sortBy: [{ field: "t" }], operations: [{ op: "movingSum", field: "x", as: "sum", frame: { preceding: 1, duration: { preceding: 1, unit: "day" } } }] });
// @ts-expect-error Full only
basic.createCompleteData({ id: "complete", key: "t", values: [1] });
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
