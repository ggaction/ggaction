import assert from "node:assert/strict";
import test from "node:test";

import { action, summarizeArgs } from "../../src/core/action.js";
import { ChartProgram } from "../../src/core/ChartProgram.js";

class TestProgram extends ChartProgram {}

TestProgram.prototype.setValue = action(
  {
    op: "setValue",
    description: "Set a test context value."
  },
  function ({ value } = {}) {
    return this._clone({
      context: {
        ...this.context,
        value
      }
    });
  }
);

TestProgram.prototype.setNestedValue = action(
  {
    op: "setNestedValue",
    description: "Set a value through a nested action."
  },
  function ({ value } = {}) {
    return this.setValue({ value });
  }
);

test("records a top-level action without mutating the earlier program", () => {
  const original = new TestProgram();
  const result = original.setValue({ value: 3 });

  assert.deepEqual(original.context, {});
  assert.deepEqual(original.trace.children, []);
  assert.deepEqual(original.actionStack, []);
  assert.deepEqual(result.context, { value: 3 });
  assert.deepEqual(result.actionStack, []);
  assert.equal(result.trace.children.length, 1);
  assert.deepEqual(result.trace.children[0], {
    id: "a1",
    op: "setValue",
    description: "Set a test context value.",
    args: { value: 3 },
    children: []
  });
});

test("records wrapped calls as nested action children", () => {
  const result = new TestProgram().setNestedValue({ value: 7 });
  const parent = result.trace.children[0];
  const child = parent.children[0];

  assert.equal(parent.id, "a1");
  assert.equal(parent.op, "setNestedValue");
  assert.equal(child.id, "a2");
  assert.equal(child.op, "setValue");
  assert.deepEqual(child.args, { value: 7 });
  assert.deepEqual(result.actionStack, []);
});

test("assigns deterministic IDs across sequential actions", () => {
  const result = new TestProgram()
    .setValue({ value: 1 })
    .setValue({ value: 2 });

  assert.deepEqual(
    result.trace.children.map(node => node.id),
    ["a1", "a2"]
  );
});

test("summarizes large action values without retaining the array", () => {
  const values = [{ x: 1 }, { x: 2 }];
  const summary = summarizeArgs({
    property: "dataset[cars].values",
    value: values
  });

  assert.deepEqual(summary, {
    property: "dataset[cars].values",
    valueCount: 2
  });
  assert.equal(Object.isFrozen(summary), true);

  values.push({ x: 3 });
  assert.equal(summary.valueCount, 2);
});

test("requires action implementations to return a ChartProgram", () => {
  const invalidAction = action(
    {
      op: "invalidAction",
      description: "Return an invalid action result."
    },
    function () {
      return null;
    }
  );

  assert.throws(
    () => invalidAction.call(new TestProgram(), {}),
    /must return a ChartProgram/
  );
});
