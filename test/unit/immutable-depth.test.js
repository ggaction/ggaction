import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../src/index.js";
import { cloneAndFreeze, isOwned } from "../../src/core/immutable.js";

function nestedRows(depth) {
  const root = { id: 0, value: 1 };
  let node = root;
  for (let id = 1; id < depth; id++) {
    const child = { id, value: 1 };
    node.children = [child];
    node = child;
  }
  return { root, leaf: node };
}

test("deep source rows copy without the engine call-stack limit and preserve caller ownership", () => {
  const { root, leaf } = nestedRows(5000);
  const before = chart();
  const next = before.createData({ id: "nested", values: [root] });
  let input = root, stored = next.semanticSpec.datasets[0].values[0], count = 0;
  while (stored) {
    assert.equal(stored.id, count++);
    assert.notEqual(stored, input);
    assert.equal(isOwned(stored), true);
    assert.equal(Object.isFrozen(input), false);
    if (stored.children) assert.equal(isOwned(stored.children), true);
    input = input.children?.[0]; stored = stored.children?.[0];
  }
  assert.equal(count, 5000);
  leaf.value = 7;
  assert.equal(before.semanticSpec.datasets.length, 0);
  assert.equal(next.semanticSpec.datasets[0].values[0].value, 1);
});

test("deep cycles and functions fail with stable diagnostics rather than overflowing", () => {
  const { root, leaf } = nestedRows(5000);
  leaf.children = [root];
  assert.throws(() => cloneAndFreeze(root), /Cannot store cyclic values/);
  delete leaf.children;
  leaf.invalid = () => {};
  assert.throws(() => cloneAndFreeze(root), error => error instanceof TypeError && /\.invalid in a ChartProgram/.test(error.message));
  assert.equal(Object.isFrozen(root), false);
});

test("iterative copies preserve entry snapshots, sparse-array visits and independent aliases", () => {
  const events = [], source = [];
  Object.defineProperty(source, 0, { configurable: true, get() {
    events.push("array-zero");
    return { get nested() { events.push("nested"); source[1] = 9; return true; } };
  } });
  source[1] = 2; source.length = 4;
  const result = cloneAndFreeze(source);
  assert.deepEqual(events, ["array-zero", "nested"]);
  assert.equal(result[1], 9);
  assert.equal(2 in result, false);
  assert.equal(result.length, 4);
  const shared = { value: 1 }, aliases = cloneAndFreeze({ left: shared, right: shared });
  assert.deepEqual(aliases.left, aliases.right);
  assert.notEqual(aliases.left, aliases.right);
  assert.throws(() => cloneAndFreeze(new Date()), /plain objects and arrays/);
});
