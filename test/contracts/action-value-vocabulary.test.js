import { readFileSync } from "node:fs";
import { chart } from "../../src/index.js";
import assert from "node:assert/strict";
import test from "node:test";
import {
  ACTION_INDEX,
  contractCorpus,
  markdownAnchors,
  readContractTarget
} from "../support/action-contracts.js";

const index = ACTION_INDEX;
const currentCorpus = contractCorpus("current");

function assertContractTarget(contract) {
  const { source } = readContractTarget(contract);
  assert.equal(
    markdownAnchors(source).includes(contract.anchor.toLowerCase()),
    true,
    `${contract.file}#${contract.anchor}`
  );
}

test("keeps accepted planned capabilities linked and non-public", () => {
  const ids = index.plannedCapabilities.map(capability => capability.id);
  assert.equal(new Set(ids).size, ids.length);

  for (const capability of index.plannedCapabilities) {
    assert.equal(
      index.contractSchema.plannedKinds.includes(capability.kind),
      true,
      capability.name
    );
    assert.equal(
      index.contractSchema.plannedStatuses.includes(capability.status),
      true,
      capability.name
    );
    assert.equal(
      index.contractSchema.plannedReadiness.includes(capability.readiness),
      true,
      capability.name
    );
    assertContractTarget(capability.contract);
  }

 });

test("current action statuses agree with the runtime surface", () => {
  const program = chart();
  for (const action of index.actions) {
    assert.equal(action.status, "implemented", action.name);
    assert.equal(typeof program[action.name], "function", action.name);
    assertContractTarget(action.contract);
    assert.ok(action.contract.file.startsWith("agent_docs/contract/current/"), action.name);
  }
  for (const action of index.plannedActions) {
    assert.equal(program[action.name], undefined, action.name);
    assertContractTarget(action.contract);
  }
});

function literalUnion(source, name) {
  const definition = source.match(new RegExp(`\\btype ${name} =([\\s\\S]*?);`))?.[1];
  assert.ok(definition, `Missing literal vocabulary ${name}`);
  return [...new Set([...definition.matchAll(/"([^"\n]+)"/g)].map(match => match[1]))].sort();
}

test("normative current value vocabularies match shipped declarations", () => {
  const types = readFileSync(new URL("../../types/program.d.ts", import.meta.url), "utf8");
  for (const name of ["PointShape", "ScaleType", "CurveInterpolation", "PaletteName"]) {
    assert.deepEqual(literalUnion(currentCorpus, name), literalUnion(types, name), name);
  }
  // Runtime acceptance and rejection belongs to the focused scale, shape, dash,
  // palette, density, selection, and regression suites, not historical prose.
});
