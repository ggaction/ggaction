import test from "node:test";
import assert from "node:assert/strict";
import { buildParameterRevisionPlan } from "../../../../src/actions/data/edit.js";
import { getErrorDetails } from "../../../../src/core/diagnostics.js";
import { chart } from "../../../../src/index.js";
import { serializeProgram } from "../../../../src/persistence.js";

const parameter = { type: "parameter", id: "p" };
const expression = root => ({ version: 2, registry: "standard@1", root });
const computed = (id, source, root = parameter, parameterInputs = [{ kind: "parameter", id: "p", revision: 0 }], values = []) => ({
  id, source, values, transform: [{ type: "computed", as: `${id}Value`, expression: expression(root), parameterInputs }]
});
const program = datasets => ({ semanticSpec: { datasets }, materializationConfigs: {}, trace: { children: [] } });

test("parameter revision planning traverses a deep shared-root chain without recursion", () => {
  const datasets = [{ id: "raw", values: [] }];
  for (let index = 0; index < 6000; index += 1) datasets.push(computed(`d${index}`, index === 0 ? "raw" : `d${index - 1}`));
  const input = program(datasets), before = JSON.stringify(input);
  const plan = buildParameterRevisionPlan(input, "p");
  assert.equal(plan.revisions.length, 6000);
  assert.equal(plan.replacements.size, 6000);
  assert.equal(plan.revisions[0].source, "raw");
  assert.ok(plan.revisions.slice(1).every((revision, index) => revision.source === plan.revisions[index].id));
  assert.equal(JSON.stringify(input), before);
});

function conditionalWorkload(enabled) {
  const tree = depth => depth === 0 ? { type: "literal", value: 1 }
    : { type: "binary", op: "add", left: tree(depth - 1), right: tree(depth - 1) };
  let result = chart().createData({ id: "raw", values: Array.from({ length: 5000 }, (_, index) => ({ x: index })) })
    .createParameter({ id: "enabled", value: enabled })
    .createComputedData({ id: "flagged", as: "enabledRow", expression: expression({ type: "parameter", id: "enabled" }) })
    .filterData({ id: "filtered", field: "enabledRow", oneOf: [true] });
  for (const id of ["first", "second"]) result = result.createComputedData({ id, source: "filtered", as: `${id}Value`, expression: expression(tree(9)) });
  return result;
}

test("parameter expansion budgets use newly filtered rows and reject all candidate revisions atomically", () => {
  const input = conditionalWorkload(false), before = serializeProgram(input), trace = input.trace;
  assert.equal(input.semanticSpec.datasets.at(-1).values.length, 0);
  assert.throws(() => input.editParameter({ target: "enabled", value: true }), error => {
    const details = getErrorDetails(error);
    assert.equal(details?.code, "resource-limit");
    assert.equal(details?.limit, 10_000_000);
    assert.ok(details?.actual >= 10_230_000);
    return true;
  });
  assert.equal(serializeProgram(input), before);
  assert.equal(input.trace, trace);
});

test("shrinking a parameter filter is permitted when its new workload fits the budget", () => {
  const input = conditionalWorkload(true), before = serializeProgram(input);
  assert.equal(input.semanticSpec.datasets.at(-1).values.length, 5000);
  const revised = input.editParameter({ target: "enabled", value: false });
  for (const id of ["first", "second"]) {
    const current = revised.materializationConfigs.data.computed[id].current;
    assert.equal(revised.semanticSpec.datasets.find(dataset => dataset.id === current).values.length, 0);
  }
  assert.equal(serializeProgram(input), before);
});

test("parameter plans reject cycles, missing dependencies and ambiguous logical owners atomically", () => {
  const cases = [
    program([computed("first", "second"), computed("second", "first")]),
    program([computed("first", "missing")]),
    { ...program([{ id: "raw", values: [] }, computed("first", "raw")]), materializationConfigs: {
      data: { computed: { one: { current: "first" }, two: { current: "first" } } }
    } }
  ];
  for (const input of cases) {
    const before = JSON.stringify(input);
    assert.throws(() => buildParameterRevisionPlan(input, "p"), /cycle|missing input|ambiguous/);
    assert.equal(JSON.stringify(input), before);
  }
});
