import assert from "node:assert/strict";
import test from "node:test";
import {
  action, actionSource, closedAction, invokeWrappedActionImplementation,
  registerActionTargetDispatcher, setActionCompletionHook, withActionArgumentSummary
} from "../../../src/core/action.js";
import { ChartProgram } from "../../../src/core/ChartProgram.js";

test("active action source identifies its original receiver and remains private", () => {
  const base = new ChartProgram();
  let entered;
  const observe = action({ op: "observe", description: "Observe a source identity." }, function () {
    entered = this;
    assert.notEqual(this, base);
    assert.equal(actionSource(this), base);
    assert.throws(() => actionSource(this._clone({})), /active wrapped invocation/);
    return this;
  });
  const result = observe.call(base);
  assert.throws(() => actionSource(entered), /active wrapped invocation/);
  assert.throws(() => actionSource(result), /active wrapped invocation/);
  assert.throws(() => actionSource(base), /active wrapped invocation/);
  assert.deepEqual(base.trace.children, []);
  assert.deepEqual(result.trace.children[0].args, {});
  assert.deepEqual(Object.keys(base), Object.keys(result));
});

test("nested actions keep independent source lifetimes", () => {
  const base = new ChartProgram();
  let parent, child;
  const inner = action({ op: "inner", description: "Observe a nested source." }, function () {
    child = this;
    assert.equal(actionSource(this), parent);
    assert.equal(actionSource(parent), base);
    return this;
  });
  const outer = action({ op: "outer", description: "Observe a parent source." }, function () {
    parent = this;
    const next = inner.call(this);
    assert.throws(() => actionSource(child), /active wrapped invocation/);
    assert.equal(actionSource(parent), base);
    return next;
  });
  const result = outer.call(base);
  assert.throws(() => actionSource(parent), /active wrapped invocation/);
  assert.equal(result.trace.children[0].children[0].op, "inner");
});

test("source evidence is released after implementation, return and exit failures", () => {
  for (const failure of ["throw", "return", "exit"]) {
    class Program extends ChartProgram {
      _exitAction() {
        if (failure === "exit") throw new Error("exit failed");
        return super._exitAction();
      }
    }
    const base = new Program();
    let entered;
    const fail = action({ op: "fail", description: "Exercise cleanup." }, function () {
      entered = this;
      assert.equal(actionSource(this), base);
      if (failure === "throw") throw new Error("implementation failed");
      return failure === "return" ? null : this;
    });
    assert.throws(() => fail.call(base), /failed|must return/);
    assert.throws(() => actionSource(entered), /active wrapped invocation/);
    assert.deepEqual(base.trace.children, []);
  }
});

test("completion hooks retain source proof during the hook and release it on all exits", () => {
  for (const failure of [undefined, "throw", "return"]) {
    const base = new ChartProgram();
    let entered;
    const observe = action({ op: "observe", description: "Observe completion cleanup." }, function () {
      entered = this;
      return this;
    });
    setActionCompletionHook(result => {
      assert.equal(actionSource(entered), base);
      if (failure === "throw") throw new Error("hook failed");
      return failure === "return" ? null : result;
    });
    try {
      if (failure === undefined) observe.call(base);
      else assert.throws(() => observe.call(base), /hook failed|hook must return/);
      assert.throws(() => actionSource(entered), /active wrapped invocation/);
    } finally {
      setActionCompletionHook(undefined);
    }
  }
});

test("direct implementation calls do not fabricate wrapped source proof", () => {
  const observe = action({ op: "observe", description: "Require source evidence." }, function () {
    actionSource(this);
    return this;
  });
  assert.throws(() => invokeWrappedActionImplementation(observe, new ChartProgram()),
    /active wrapped invocation/);
});

test("prepared data action rejects unknown target before scoped dispatch", () => {
  class Program extends ChartProgram {}
  let dispatched = 0;
  registerActionTargetDispatcher(Program, () => { dispatched++; throw new Error("dispatched"); });
  const apply = closedAction({ op: "applyDataUpdate", description: "Validate an exact update boundary." },
    ["prepared", "requestToken"], function () { return this; });
  const base = new Program();
  for (const target of [{ child: "left" }, ["left"]]) {
    assert.throws(() => apply.call(base, { target }), /Unknown/);
  }
  assert.equal(dispatched, 0);
  assert.deepEqual(base.trace.children, []);
});

test("private argument summaries are exact, immutable and scoped across nested writes", () => {
  const base = new ChartProgram(), args = { text: "retained source" };
  const write = action({ op: "write", description: "Write a source." }, function (input) {
    assert.equal(input.text, args.text);
    return this;
  });
  const read = input => write.call(base, input).trace.children[0].args;
  withActionArgumentSummary(args, { textLength: args.text.length }, input => {
    assert.deepEqual(read(input), { textLength: 15 });
    assert.ok(Object.isFrozen(read(input)));
    assert.deepEqual(read({ ...input }), { text: "retained source" });
    withActionArgumentSummary(input, { kind: "nested" }, nested => {
      assert.deepEqual(read(nested), { kind: "nested" });
    });
    assert.deepEqual(read(input), { textLength: 15 });
    assert.throws(() => withActionArgumentSummary(input, { kind: "failed" }, () => {
      throw new Error("write failed");
    }), /write failed/);
    assert.deepEqual(read(input), { textLength: 15 });
  });
  assert.deepEqual(read(args), { text: "retained source" });
  assert.throws(() => withActionArgumentSummary(args, null, read), /plain object/);
  assert.deepEqual(read(args), { text: "retained source" });
  assert.deepEqual(base.trace.children, []);
});
