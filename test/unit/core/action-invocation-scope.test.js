import test from "node:test";
import assert from "node:assert/strict";
import { ChartProgram } from "../../../src/core/ChartProgram.js";
import { action, actionSource, bindActionInvocationScope, registerActionResultValidator, setActionCompletionHook } from "../../../src/core/action.js";

test("private invocation scopes retain the original wrapper through completion and exit", () => {
  let active, calls = 0, closes = 0;
  const events = [], original = Error("native failed"), cleanup = Error("cleanup failed");
  class Program extends ChartProgram {
    _enterAction(metadata) { events.push("enter"); if (active?.failure === "enter") throw original; return super._enterAction(metadata); }
    _exitAction() { events.push("exit"); if (active?.failure === "exit") throw original; return super._exitAction(); }
  }
  const update = action({ op: "update", description: "Run a native fixture." }, function () {
    assert.equal(actionSource(this), active.receiver); calls += 1; events.push("native");
    if (active.failure === "native") throw original;
    return this._withContext({ updated: true });
  });
  const enter = (receiver, args) => {
    const previous = active; active = { receiver, ...args }; events.push("open");
    return outcome => {
      events.push(outcome === undefined ? "failure-close" : "success-close"); closes += 1;
      const { closeFails } = active;
      active = previous;
      if (closeFails) throw cleanup;
    };
  };
  assert.equal(bindActionInvocationScope(update, enter), update);
  assert.throws(() => bindActionInvocationScope(update, enter), /already bound/);
  assert.throws(() => bindActionInvocationScope(() => {}, enter), /wrapped action/);
  assert.throws(() => bindActionInvocationScope(update, null), /invocation owner/);
  const invalid = bindActionInvocationScope(action({ op: "invalid", description: "Invalid scope." }, function () { return this; }), () => undefined);
  assert.throws(() => invalid.call(new Program()), /synchronous closer/);
  setActionCompletionHook(program => { events.push("theme"); assert.ok(active); if (active.failure === "theme") throw original; return program; });
  registerActionResultValidator(Program, () => { events.push("validator"); assert.ok(active); if (active.failure === "validator") throw original; });
  try {
    const receiver = new Program(), result = update.call(receiver, {});
    assert.equal(result.context.updated, true); assert.equal(receiver.context.updated, undefined);
    assert.equal(calls, 1); assert.equal(closes, 1); assert.equal(active, undefined);
    assert.deepEqual(events, ["open", "enter", "native", "theme", "validator", "exit", "success-close"]);
    for (const failure of ["enter", "native", "theme", "validator", "exit"]) {
      assert.throws(() => update.call(receiver, { failure, closeFails: true }), error => error === original);
      assert.equal(active, undefined);
    }
    assert.throws(() => update.call(receiver, { closeFails: true }), error => error === cleanup);
    assert.equal(active, undefined);
    let nested = false;
    setActionCompletionHook(program => {
      if (!nested) { const previous = active; nested = true; update.call(new Program(), {}); assert.equal(active, previous); }
      return program;
    });
    update.call(receiver, {}); assert.equal(active, undefined);
  } finally { setActionCompletionHook(undefined); }
});

test("private wrapper wiring preserves registration, metadata and target dispatch errors", async () => {
  const { registerActionTargetDispatcher, supportsScopedActionTargets, invokeWrappedActionImplementation, summarizeArgs, closedAction } = await import("../../../src/core/action.js");
  const metadata = { op: "edit", description: "Edit test state." }, implementation = function () { return this; };
  for (const value of [null, [], 1]) assert.throws(() => action(value, implementation), /metadata must be a plain/);
  for (const op of [undefined, "", 1]) assert.throws(() => action({ ...metadata, op }, implementation), /non-empty op/);
  for (const description of [undefined, "", 1]) assert.throws(() => action({ ...metadata, description }, implementation), /non-empty description/);
  assert.throws(() => action(metadata, null), /implementation must be a function/);
  assert.throws(() => setActionCompletionHook(null), /must be a function/);
  assert.throws(() => registerActionResultValidator(ChartProgram, null), /must be a function/);
  assert.throws(() => invokeWrappedActionImplementation(() => {}, new ChartProgram()), /Expected an action/);
  class Parent extends ChartProgram {} class Child extends Parent {} class Empty extends ChartProgram {}
  const edit = action(metadata, implementation);
  let calls = 0;
  registerActionTargetDispatcher(Parent, (program, original, args) => { calls++; assert.equal(original, edit); return invokeWrappedActionImplementation(original, program, args); });
  assert.equal(supportsScopedActionTargets(Child, "edit"), true);
  assert.equal(supportsScopedActionTargets(Empty, "edit"), false);
  assert.equal(supportsScopedActionTargets(Child, "createData"), false);
  for (const target of [{ child: "left" }, ["left"]]) assert.equal(edit.call(new Child(), { target }).trace.children[0].op, "edit");
  assert.equal(calls, 2);
  for (const args of [null, [], 1]) assert.throws(() => edit.call(new Child(), args), /arguments must be a plain/);
  assert.deepEqual(summarizeArgs({ get secret() { throw Error("must not read"); }, callback() {} }), { secretType: "accessor", callbackType: "function" });
  const opaque = Object.create(Object.create(null));
  assert.deepEqual(summarizeArgs({ opaque }), { opaqueType: "object" });
  const accessor = Object.create({ get constructor() { throw Error("must not read"); } });
  assert.deepEqual(summarizeArgs({ accessor }), { accessorType: "object" });
  const nameless = Object.create({ constructor: null });
  assert.deepEqual(summarizeArgs({ nameless }), { namelessType: "object" });
  assert.equal(closedAction(metadata, undefined, implementation).call(new Empty()).trace.children[0].op, "edit");
});
