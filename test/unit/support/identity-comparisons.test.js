import test from "node:test";
import assert from "node:assert/strict";
import { assertEquivalentMeaning } from "../../support/identity-equivalence.js";

test("independent allocation comparisons retain dates, key declarations and concrete geometry", () => {
  const dataset = (logicalId, date) => ({ id: "rows", logicalId, revision: 0,
    values: [{ date }], keySpec: { mode: "field", field: "date" } });
  const first = dataset("one", new Date("2026-01-01"));
  assertEquivalentMeaning(first, dataset("two", new Date("2026-01-01")));
  assert.throws(() => assertEquivalentMeaning(first, dataset("two", new Date("2026-02-01"))), assert.AssertionError);
  assert.throws(() => assertEquivalentMeaning(first, { ...first, keySpec: { mode: "field", field: "other" } }), assert.AssertionError);
  assert.throws(() => assertEquivalentMeaning({ id: "mark", properties: { x: 1 } },
    { id: "mark", properties: { x: 2 } }), assert.AssertionError);
});

test("independent allocation comparisons ignore namespaces while retaining values and item order", () => {
  const program = namespace => ({
    semanticSpec: { datasets: [{
      id: "rows", logicalId: namespace, revision: 0, allocationId: namespace,
      rowKeys: [namespace], nextGeneratedKey: 1, keySpec: { mode: "generated" },
      values: [{ value: 2 }]
    }] },
    graphicSpec: { objects: { points: { items: [1, 2].map(x => ({
      id: `points:${namespace.repeat(64)}`, identity: { rowKey: namespace },
      properties: { x }
    })) } } }
  });
  const first = program("a"), second = program("b");
  assertEquivalentMeaning(first, second);
  second.semanticSpec.datasets[0].values[0].value = 3;
  assert.throws(() => assertEquivalentMeaning(first, second), assert.AssertionError);
  const reordered = program("c");
  reordered.graphicSpec.objects.points.items.reverse();
  assert.throws(() => assertEquivalentMeaning(first, reordered), assert.AssertionError);
});

test("allocation comparisons normalize only data references proven by matching datasets", () => {
  const semantic = logicalId => ({
    datasets: [{ id: "rows", logicalId, revision: 1, values: [{ value: 2 }] }],
    resources: [{ kind: "data-source", id: "source", revision: 0,
      result: { data: { kind: "data", id: "rows", logicalId, revision: 1 } } }]
  });
  const first = semantic("first");
  assertEquivalentMeaning(first, semantic("second"));
  for (const patch of [{ logicalId: "orphan" }, { id: "other" }, { revision: 2 },
    { kind: "parameter" }, { extra: true }]) {
    const changed = semantic("second");
    Object.assign(changed.resources[0].result.data, patch);
    assert.throws(() => assertEquivalentMeaning(first, changed), assert.AssertionError);
  }
  const reference = first.resources[0].result.data;
  assert.throws(() => assertEquivalentMeaning(reference, { ...reference, logicalId: "second" }),
    assert.AssertionError, "standalone references have no dataset proof");
  const changedReceipt = semantic("second");
  changedReceipt.resources[0].revision = 1;
  assert.throws(() => assertEquivalentMeaning(first, changedReceipt), assert.AssertionError);
});
