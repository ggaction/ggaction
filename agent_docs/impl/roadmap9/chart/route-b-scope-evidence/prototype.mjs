import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Review-only overlay. No runtime source or public entry is changed.
const root = resolve(new URL("../../../../../", import.meta.url).pathname);
const artifact = resolve(root, ".artifacts/route-b-scope-prototype");
await mkdir(artifact, { recursive: true });
const directory = await mkdtemp(resolve(artifact, "overlay-"));
const source = await readFile(resolve(root, "src/core/action.js"), "utf8");
const replacement = `const invocationScopes = new WeakMap();
export function bindActionInvocationScope(wrapped, enter) {
  if (!metadataByWrappedAction.has(wrapped) || typeof enter !== "function") throw new TypeError("Expected a wrapped action and invocation owner.");
  if (invocationScopes.has(wrapped)) throw new TypeError("Invocation owner is already bound.");
  invocationScopes.set(wrapped, enter);
  return wrapped;
}
`;
let patched = source.replace("const sourceByEnteredAction = new WeakMap();", "const sourceByEnteredAction = new WeakMap();\n" + replacement);
const start = "      const entered = this._enterAction({";
const end = "        sourceByEnteredAction.delete(entered);\n      }\n    } catch (error) {";
assert.equal(patched.split(start).length, 2);
assert.equal(patched.split(end).length, 2);
patched = patched.replace(start, "      const invoke = () => {\n" + start);
patched = patched.replace(end, `        sourceByEnteredAction.delete(entered);
      }
      };
      const enterScope = invocationScopes.get(wrappedAction);
      if (enterScope === undefined) return invoke();
      const closeScope = enterScope(this, args);
      if (typeof closeScope !== "function") throw new TypeError("Invocation scope must return a synchronous closer.");
      let result, succeeded = false;
      try { result = invoke(); succeeded = true; return result; }
      finally { closeScope(succeeded ? { result } : undefined); }
    } catch (error) {`);
assert.notEqual(patched, source);

const cases = [];
const check = async (name, operation) => { await operation(); cases.push(name); };
try {
  await cp(resolve(root, "src"), resolve(directory, "src"), { recursive: true });
  await writeFile(resolve(directory, "package.json"), '{"type":"module"}\n');
  await writeFile(resolve(directory, "src/core/action.js"), patched);
  const core = await import(pathToFileURL(resolve(directory, "src/core/action.js")));
  const { ChartProgram } = await import(pathToFileURL(resolve(directory, "src/core/ChartProgram.js")));
  const { action, actionSource, bindActionInvocationScope, getWrappedActionMetadata,
    registerActionResultValidator, setActionCompletionHook } = core;
  let current, opened = 0, closed = 0, nativeCalls = 0, completions = 0, validationCalls = 0;
  let events = [], failure;
  const thrown = new Error("original failure");
  class Program extends ChartProgram {
    _enterAction(meta) {
      if (meta.op === "applyOwned") {
        assert.ok(current);
        events.push("enter");
        if (failure === "enter") throw thrown;
      }
      return super._enterAction(meta);
    }
    _exitAction() {
      if (this.actionStack.length === 1 && this.trace.children.at(-1)?.op === "applyOwned") {
        assert.ok(current);
        events.push("exit");
        if (failure === "exit") throw thrown;
      }
      return super._exitAction();
    }
  }
  // This fake registry tests only lifecycle wiring. It is NOT route authority.
  const fixtureHandles = new WeakMap();
  const native = action({ op: "native", description: "Apply an owned fixture plan." }, function (args) {
    nativeCalls += 1;
    assert.ok(current);
    assert.equal(actionSource(this), current.entered);
    assert.equal(args, current.record.nativeArgs);
    events.push("native");
    if (failure === "native") throw thrown;
    current.consumed += 1;
    return this._withContext({ value: args.value });
  });
  Program.prototype.native = native;
  const applyOwned = action({ op: "applyOwned", description: "Apply a fixture handle." }, function (args) {
    assert.equal(actionSource(this), current.record.base);
    assert.equal(args.prepared, current.record.handle);
    current.entered = this;
    return this.native(current.record.nativeArgs);
  });
  Program.prototype.applyOwned = applyOwned;
  const enterOwner = (receiver, args) => {
    const record = fixtureHandles.get(args.prepared);
    if (!record || receiver !== record.base || receiver.constructor !== Program ||
      args.requestToken !== record.token || receiver.native !== native) throw new Error("Stale fixture handle.");
    record.signal?.throwIfAborted();
    const previous = current;
    current = { record, consumed: 0 };
    opened += 1;
    events.push("scope-open");
    return outcome => {
      try {
        if (outcome !== undefined) {
          assert.equal(current.consumed, 1);
          record.signal?.throwIfAborted();
          events.push("scope-success");
        }
      } finally { current = previous; closed += 1; events.push("scope-close"); }
    };
  };
  assert.equal(bindActionInvocationScope(applyOwned, enterOwner), applyOwned);
  setActionCompletionHook(program => {
    completions += 1;
    assert.ok(current);
    events.push("theme");
    if (failure === "theme") throw thrown;
    return program;
  });
  registerActionResultValidator(Program, () => {
    validationCalls += 1;
    assert.ok(current);
    events.push("validator");
    if (failure === "validator") throw thrown;
  });
  const base = new Program();
  function prepare(receiver = base, signal) {
    const handle = Object.freeze({ kind: "fixture" });
    const record = { base: receiver, token: "token", handle, nativeArgs: Object.freeze({ value: 7 }), signal };
    fixtureHandles.set(handle, record);
    return { prepared: handle, requestToken: "token" };
  }
  await check("scope spans enter, original child, theme, validator and exit exactly once", () => {
    events = [];
    const result = base.applyOwned(prepare());
    assert.equal(result.context.value, 7);
    assert.equal(base.context.value, undefined);
    assert.equal(result.actionStack.length, 0);
    assert.equal(current, undefined);
    assert.equal(nativeCalls, 1); assert.equal(completions, 1); assert.equal(validationCalls, 1);
    assert.deepEqual(events, ["scope-open", "enter", "native", "theme", "validator", "exit", "scope-success", "scope-close"]);
    assert.equal(result.trace.children[0].op, "applyOwned");
    assert.deepEqual(result.trace.children[0].children.map(node => node.op), ["native"]);
    assert.equal(getWrappedActionMetadata(applyOwned).op, "applyOwned");
    assert.throws(() => actionSource(result), /active wrapped/);
  });
  for (const phase of ["enter", "native", "theme", "validator", "exit"]) {
    await check(`${phase} failure preserves the original error and closes scope`, () => {
      failure = phase; events = [];
      assert.throws(() => base.applyOwned(prepare()), error => error === thrown);
      assert.equal(current, undefined);
      assert.equal(events.at(-1), "scope-close");
      assert.equal(opened, closed);
      failure = undefined;
    });
  }
  await check("stale, clone, token, constructor and native override reject before opening", () => {
    const args = prepare(), count = opened;
    assert.throws(() => base.applyOwned({ ...args, prepared: { ...args.prepared } }), /Stale/);
    assert.throws(() => base.applyOwned({ ...args, requestToken: "other" }), /Stale/);
    assert.throws(() => new Program().applyOwned(args), /Stale/);
    class Derived extends Program {}
    const derived = new Derived();
    assert.throws(() => derived.applyOwned(prepare(derived)), /Stale/);
    Program.prototype.native = action({ op: "native", description: "Override." }, function () { return this; });
    try { assert.throws(() => base.applyOwned(args), /Stale/); }
    finally { Program.prototype.native = native; }
    assert.equal(opened, count); assert.equal(current, undefined);
  });
  await check("abort before entry leaves no scope", () => {
    const controller = new AbortController(), args = prepare(base, controller.signal), count = opened;
    controller.abort(thrown);
    assert.throws(() => base.applyOwned(args), error => error === thrown);
    assert.equal(opened, count); assert.equal(current, undefined);
  });
  await check("reentrant invocation restores the outer scope", () => {
    const priorHook = program => program;
    setActionCompletionHook(program => {
      const outer = current;
      setActionCompletionHook(priorHook);
      try {
        const second = new Program(); second.applyOwned(prepare(second));
        assert.equal(current, outer);
      } finally { setActionCompletionHook(priorHook); }
      return program;
    });
    base.applyOwned(prepare());
    assert.equal(current, undefined); assert.equal(opened, closed);
  });
  await check("no invocation scope is retained across preparation await", async () => {
    const args = prepare();
    assert.equal(current, undefined);
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(current, undefined);
    base.applyOwned(args);
    assert.equal(current, undefined);
  });
  await check("binding is once only and absent from public options", () => {
    assert.throws(() => bindActionInvocationScope(applyOwned, enterOwner), /already bound/);
    assert.throws(() => bindActionInvocationScope(() => {}, enterOwner), /wrapped action/);
    assert.equal(getWrappedActionMetadata(applyOwned).options, undefined);
  });
  await check("unbound v1 action result, trace, error and lifecycle are unchanged", async () => {
    setActionCompletionHook(undefined);
    const original = await import(pathToFileURL(resolve(root, "src/core/action.js")));
    const { ChartProgram: OriginalProgram } = await import(pathToFileURL(resolve(root, "src/core/ChartProgram.js")));
    original.setActionCompletionHook(undefined);
    const metadata = { op: "unchanged", description: "Unchanged synchronous action." };
    const implementation = function (args) { return this._withContext({ value: args.value }); };
    const baseline = original.action(metadata, implementation).call(new OriginalProgram(), { value: 9 });
    const actual = action(metadata, implementation).call(new ChartProgram(), { value: 9 });
    assert.deepEqual(actual.trace, baseline.trace);
    assert.deepEqual(actual.context, baseline.context);
    assert.deepEqual(actual.actionStack, baseline.actionStack);
    const input = { get value() { throw new Error("getter must not run"); } };
    let before, after;
    try { original.action(metadata, implementation).call(new OriginalProgram(), input); } catch (error) { before = error; }
    try { action(metadata, implementation).call(new ChartProgram(), input); } catch (error) { after = error; }
    assert.equal(after.message, before.message); assert.deepEqual(after.diagnostic, before.diagnostic);
  });
  const result = { productRuntimeChanged: false, publicBImplemented: false, routeAuthorityTested: false,
    node: process.version, sourceActionSha256: createHash("sha256").update(source).digest("hex"),
    overlayActionSha256: createHash("sha256").update(patched).digest("hex"), passed: cases.length, cases };
  await writeFile(resolve(artifact, `node-${process.versions.node.split(".")[0]}.json`), JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify(result, null, 2));
} finally { await rm(directory, { recursive: true, force: true }); }
