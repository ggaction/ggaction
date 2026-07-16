import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { chart } from "../../src/index.js";

const root = fileURLToPath(new URL("../..", import.meta.url));
const read = relative => readFileSync(path.join(root, relative), "utf8");
const index = JSON.parse(read("agent_docs/contract/ACTION_INDEX.json"));
const plannedScales = read("agent_docs/contract/planned/SCALES.md");
const declarations = read("types/program.d.ts");

const phase10Capabilities = Object.freeze([
  "continuous-color-bar-consumer",
  "scale-type-vocabulary",
  "scale-mapping-policies"
]);

test("keeps the three accepted scale capabilities assigned to Phase 10", () => {
  const planned = new Map(
    index.plannedCapabilities.map(capability => [capability.id, capability])
  );
  for (const id of phase10Capabilities) {
    const capability = planned.get(id);
    assert.ok(capability, `Missing planned capability ${id}.`);
    assert.equal(capability.status, "planned");
    assert.equal(capability.readiness, "accepted");
  }
});

test("locks time as the only UTC temporal token in the planned scale contract", () => {
  assert.match(plannedScales, /`time` is the only temporal scale token/);
  assert.match(plannedScales, /ticks and labels in UTC/);
  assert.doesNotMatch(plannedScales, /"utc"/);
});

test("publishes the transformed and discrete position families approved through Gate B", () => {
  assert.match(
    declarations,
    /export type ScaleType =\s+[\s\S]*?"log"[\s\S]*?"pow"[\s\S]*?"sqrt"[\s\S]*?"symlog"[\s\S]*?"time"[\s\S]*?"band"[\s\S]*?"point"[\s\S]*?"ordinal";/
  );
  for (const type of ["log", "pow", "sqrt", "symlog", "band", "point"]) {
    assert.doesNotThrow(
      () => chart().createScale({ id: `current-${type}`, type })
    );
  }
  for (const type of [
    "sequential", "quantize", "quantile", "threshold"
  ]) {
    assert.throws(
      () => chart().createScale({ id: `planned-${type}`, type }),
      /Unsupported scale type/
    );
  }

  const current = chart().createScale({ id: "x" });
  assert.doesNotThrow(
    () => current.editScale({ id: "x", type: "log" })
  );
});
