import assert from "node:assert/strict";
import test from "node:test";
import { chart, prepareDataUpdate } from "../../../src/index.js";
import { planDataUpdate } from "../../../src/actions/data/sourcePlan.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";

const expression = { version: 2, registry: "standard@1", root: { type: "field", name: "x" } };
const response = values => ({ text: JSON.stringify(values), mimeType: "application/json", encoding: "utf-8" });

async function sourceProgram(values = []) {
  const program = chart();
  const prepared = await prepareDataUpdate(program, { kind: "create", id: "raw",
    source: { kind: "named", name: "table", format: "json" } },
  { requestToken: "first", resolveNamed: async () => response(values) });
  return program.applyDataUpdate({ prepared, requestToken: "first" });
}

test("prepared source refresh reuses collision-free IDs fixed before the host load", async () => {
  const original = (await sourceProgram([{ x: 1 }]))
    .createComputedData({ id: "computed", source: "raw", as: "y", expression })
    .editComputedData({ target: "computed", as: "z" })
    .createData({ id: "static", values: [{ x: 2 }] })
    .createComputedData({ id: "computedComputedDataRevision2", source: "static", as: "y", expression })
    .editComputedData({ target: "computedComputedDataRevision2", as: "z" });
  const saved = serializeProgram(original), request = { kind: "revise", target: "raw", id: "fresh" };
  const plan = planDataUpdate(original, request);
  assert.deepEqual(plan.revisionPlan.revisions.map(revision => revision.id), ["fresh", "computedComputedDataRevision3"]);
  let loads = 0;
  const prepared = await prepareDataUpdate(original, request, { requestToken: "refresh",
    resolveNamed: async input => {
      assert.deepEqual(input, { name: "table" });
      loads++;
      return response([{ x: 3 }]);
    } });
  const revised = original.applyDataUpdate({ prepared, requestToken: "refresh" });
  const owners = revised.materializationConfigs.data.computed;
  assert.equal(owners.computed.current, "computedComputedDataRevision3");
  assert.equal(owners.computedComputedDataRevision2.current, "computedComputedDataRevision2ComputedDataRevision1");
  assert.deepEqual(revised.semanticSpec.datasets.find(dataset => dataset.id === owners.computed.current).values, [{ x: 3, z: 3 }]);
  assert.equal(loads, 1);
  assert.equal(serializeProgram(original), saved);
  assert.doesNotThrow(() => deserializeProgram(serializeProgram(revised)));
});

test("source refresh planning bounds a deep dependency graph without host recursion", async () => {
  const base = await sourceProgram(), datasets = [...base.semanticSpec.datasets];
  for (let index = 0; index < 6000; index++) datasets.push({
    id: `computed${index}`, source: index === 0 ? "raw" : `computed${index - 1}`, values: [],
    transform: [{ type: "computed", as: "value", expression: {
      version: 2, registry: "standard@1", root: { type: "literal", value: 1 }
    }, parameterInputs: [] }]
  });
  const program = base._clone({ semanticSpec: { ...base.semanticSpec, datasets } });
  const before = JSON.stringify(program.semanticSpec);
  const plan = planDataUpdate(program, { kind: "revise", target: "raw", id: "fresh" });
  assert.equal(plan.revisionPlan.revisions.length, 6001);
  assert.equal(plan.revisionPlan.replacements.size, 6001);
  assert.equal(plan.revisionPlan.revisions[0].id, "fresh");
  for (let index = 1; index < plan.revisionPlan.revisions.length; index++) {
    assert.equal(plan.revisionPlan.revisions[index].source, plan.revisionPlan.revisions[index - 1].id);
  }
  assert.equal(JSON.stringify(program.semanticSpec), before);
});
