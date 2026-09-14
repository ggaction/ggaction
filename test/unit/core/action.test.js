import assert from "node:assert/strict";
import test from "node:test";

import { action, summarizeArgs, appendActionNodeAtPath, createActionNode } from "../../../src/core/action.js";
import { ChartProgram } from "../../../src/core/ChartProgram.js";

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

test("summarizes non-plain action references without retaining them", () => {
  class ChildProgramReference {}
  const program = new ChildProgramReference();
  const summary = summarizeArgs({ target: "detail", program });

  assert.deepEqual(summary, {
    target: "detail",
    programType: "ChildProgramReference"
  });
  assert.equal(Object.isFrozen(summary), true);
  assert.equal(Object.values(summary).includes(program), false);
});

test("rejects circular objects in action summaries", () => {
  const circular = {};
  circular.self = circular;

  assert.throws(
    () => summarizeArgs({ value: circular }),
    /must not contain circular references/
  );
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

test("guards unit and composition action capabilities before tracing", () => {
  const child = new TestProgram();
  const composition = new TestProgram({
    children: { left: child, right: child },
    compositionSpec: {
      id: "pair",
      direction: "horizontal",
      children: ["left", "right"],
      gap: 16,
      align: "center",
      padding: { top: 0, right: 0, bottom: 0, left: 0 }
    }
  });
  const compositionOnly = action(
    {
      op: "compositionOnly",
      description: "Exercise a composition-only action.",
      scope: "composition"
    },
    function () {
      return this;
    }
  );

  assert.throws(() => composition.setValue({ value: 1 }), /not available on a composition/);
  assert.equal(composition.trace.children.length, 0);
  assert.throws(
    () => compositionOnly.call(new TestProgram()),
    /requires a composition ChartProgram/
  );
  assert.equal(compositionOnly.call(composition).trace.children[0].op, "compositionOnly");
  assert.throws(
    () => action({ op: "bad", description: "Bad scope.", scope: "unknown" }, () => child),
    /Unknown action scope/
  );
});


test("persistent traces retain Array semantics, older branches, and snapshot identity", () => {
  let program = new TestProgram();
  const first = program.setNestedValue({ value: 1 });
  program = first;
  for (let index = 0; index < 2000; index += 1) {
    program = program.setNestedValue({ value: index });
  }
  const children = program.trace.children;
  assert.equal(children.length, 2001);
  assert.equal(Array.isArray(children), true);
  assert.equal(Object.isFrozen(children), true);
  assert.equal(program.trace.children, children);
  assert.equal(first.trace.children.length, 1);
  assert.equal(children[0], first.trace.children[0]);
  assert.deepEqual(JSON.parse(JSON.stringify(program.trace)).children.at(-1), children.at(-1));
  const leaf = createActionNode({ id: "extra", op: "extra", description: "Extra.", args: {} });
  const revised = appendActionNodeAtPath(program.trace, [0, 0], leaf);
  assert.deepEqual(revised.path, [0, 0, 0]);
  assert.equal(revised.root.children[0].children[0].children[0], leaf);
  assert.equal(revised.root.children[1], children[1]);
  assert.equal(children[0].children[0].children.length, 0);
  assert.throws(() => appendActionNodeAtPath(program.trace, [-1], leaf), /Unknown parent/);
  assert.throws(() => appendActionNodeAtPath(program.trace, null, leaf), /must be an array/);
});
