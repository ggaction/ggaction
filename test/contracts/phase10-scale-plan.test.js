import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { chart } from "../../src/index.js";

const root = fileURLToPath(new URL("../..", import.meta.url));
const read = relative => readFileSync(path.join(root, relative), "utf8");
const index = JSON.parse(read("agent_docs/contract/ACTION_INDEX.json"));
const currentCore = read("agent_docs/contract/current/CORE.md");
const currentEncodings = read("agent_docs/contract/current/ENCODINGS.md");
const plannedScales = read("agent_docs/contract/planned/SCALES.md");
const declarations = read("types/program.d.ts");

const deliveredCapabilities = Object.freeze([
  "scale-type-vocabulary",
  "scale-mapping-policies"
]);

test("closes every accepted Phase 10 capability out of the Planned inventory", () => {
  const remaining = new Set(
    index.plannedCapabilities.map(capability => capability.id)
  );
  for (const id of deliveredCapabilities) assert.equal(remaining.has(id), false);
  assert.match(plannedScales, /No accepted scale capability remains/);
  assert.doesNotMatch(plannedScales, /Status: Planned/);
});

test("keeps time as the only UTC temporal token in the current contract", () => {
  assert.match(currentCore, /`time`[^\n]*UTC temporal token/);
  assert.doesNotMatch(currentCore, /"utc"/);
  assert.doesNotMatch(declarations, /\| "utc"/);
});

test("publishes the complete current scale type vocabulary", () => {
  for (const type of [
    "linear", "log", "pow", "sqrt", "symlog", "time", "band", "point",
    "ordinal", "sequential", "quantize", "quantile", "threshold"
  ]) {
    assert.match(declarations, new RegExp(`\\| "${type}"`));
    const options = type === "threshold"
      ? { id: `current-${type}`, type, domain: [0], range: ["black", "white"] }
      : { id: `current-${type}`, type };
    assert.doesNotThrow(() => chart().createScale(options));
  }
  assert.throws(
    () => chart().createScale({ id: "future", type: "identity" }),
    /Unsupported scale type/
  );
});

test("publishes mapping fallback ownership and compound-grain limits", () => {
  assert.match(currentCore, /`unknown`[\s\S]*row-owned point item/);
  assert.match(currentEncodings, /scale domain에는 추가하지 않는다/);
  assert.match(currentEncodings, /Compound path\/bar\/area\/rule/);
  assert.match(declarations, /unknown\?: unknown/);
});
