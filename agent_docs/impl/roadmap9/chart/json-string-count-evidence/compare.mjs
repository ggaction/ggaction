import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { validateInferenceBytes } from "../../../../../src/grammar/graph/inferenceBudget.js";
import { getErrorDetails } from "../../../../../src/core/diagnostics.js";

const baseline = "36de5a4f9bd4990804ef94671a06c7041c5f7456";
const source = execFileSync("git", ["show", baseline + ":src/grammar/graph/inferenceBudget.js"], { encoding: "utf8" });
const core = new URL("../../../../../src/core/", import.meta.url).href;
const old = await import("data:text/javascript;base64," + Buffer.from(source.replaceAll("../../core/", core)).toString("base64"));
const policy = { policy: "bounded-inference@1", maxWork: 100_000_000, maxBytes: 128 * 1024 * 1024 };
const errorRecord = run => {
  try { return { value: run() }; }
  catch (error) { return { name: error.name, message: error.message, details: getErrorDetails(error) }; }
};
const shared = { text: "é한🙂\ud800", number: -0 }, sparse = [];
sparse[2] = undefined;
const cycle = {}; cycle.self = cycle;
const hidden = Object.defineProperty({}, "x", { value: 1 });
const named = []; named.extra = 1;
let reads = 0;
const accessor = Object.defineProperty({}, "x", { enumerable: true, get() { reads++; throw Error("read"); } });
const values = [null, undefined, true, false, -0, 0, NaN, Infinity, -Infinity, 1e100, 17n,
  "", "\u0000\b\t\n\f\r\"\\", "\ud800", "\udfff", "\ud800\udc00", "é한🙂",
  [], {}, sparse, shared, { shared, other: shared }, { 2: "\ud800", 1: -0, z: undefined, a: 1n },
  Object.assign(Object.create(null), { ["\ud800"]: "\udfff" }), cycle, hidden, named, accessor, new Date(0), Symbol("x"), () => 1];
let comparisons = 0;
for (const value of values) for (const maxBytes of [1, 2, 3, 4, 7, 8, 10, 12, 13, 17, 31, 63, 127, policy.maxBytes]) {
  const execution = { ...policy, maxBytes };
  for (const label of [undefined, "caller bytes"]) {
    assert.deepEqual(errorRecord(() => validateInferenceBytes(value, execution, label)),
      errorRecord(() => old.validateInferenceBytes(value, execution, label)));
    comparisons++;
  }
}
assert.equal(reads, 0);
const result = { node: process.version, baseline, baselineSourceSHA256: createHash("sha256").update(source).digest("hex"),
  comparisons, getterCalls: reads, result: "exact values and error class/message/details" };
await writeFile(".artifacts/json-string-count/differential.json", JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result));
