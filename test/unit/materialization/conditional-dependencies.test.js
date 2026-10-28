import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../src/index.js";
import { getErrorDetails } from "../../../src/diagnostics.js";
import { validateConditionalDependencies, orderConditionalMarkIds } from "../../../src/materialization/conditionalState.js";

// Isolate graph safety from graphics allocation. Each selection has a valid,
// exact resource reference and reads the next mark's concrete opacity.
function chain(length) {
  const source = chart().createData({ id: "rows", values: [{ value: 1 }] });
  const resources = [], selections = {}, layers = [];
  for (let index = 0; index < length; index++) {
    const id = `mark-${index}`, selection = `selection-${index}`;
    const input = { selection, kind: "persistent-selection", id: selection, revision: 0 };
    const last = index === length - 1;
    if (!last) {
      resources.push({ kind: input.kind, id: selection, revision: 0,
        options: { mode: "predicate", predicate: { property: "opacity", op: "eq", value: 1 } } });
      selections[selection] = { target: `mark-${index + 1}`, grain: "item",
        resource: { kind: input.kind, id: selection, revision: 0 } };
    }
    layers.push({ id, data: "rows", mark: { type: "point" }, encoding: {},
      conditionals: { opacity: { conditions: [{ when: last
        ? { version: 2, registry: "standard@1", root: { type: "literal", value: true } }
        : { selection }, value: { value: 0 } }], otherwise: { value: 1 }, parameterInputs: [], selectionInputs: last ? [] : [input] } } });
  }
  return { semanticSpec: { ...source.semanticSpec, layers, resources },
    materializationConfigs: { selections }, markConfigs: {}, trace: source.trace };
}

test("conditional dependency chains are bounded before recursive materialization", () => {
  const valid = chain(64), excessive = chain(65), before = JSON.stringify(excessive);
  assert.doesNotThrow(() => validateConditionalDependencies(valid));
  assert.deepEqual(orderConditionalMarkIds(valid, valid.semanticSpec.layers.map(layer => layer.id)),
    valid.semanticSpec.layers.map(layer => layer.id).reverse());
  assert.throws(() => validateConditionalDependencies(excessive), error => {
    const detail = getErrorDetails(error);
    return detail?.code === "resource-limit" && detail.optionPath === "conditionalDepth";
  });
  assert.equal(JSON.stringify(excessive), before);
});

test("stale conditional selection references fail even when their branch cannot execute", () => {
  const program = chain(2);
  program.semanticSpec.layers[0].conditionals.opacity.conditions.unshift({
    when: { version: 2, registry: "standard@1", root: { type: "literal", value: true } }, value: { value: 1 }
  });
  program.semanticSpec.layers[0].conditionals.opacity.selectionInputs[0].revision = 1;
  assert.throws(() => validateConditionalDependencies(program), /stale/);
});
