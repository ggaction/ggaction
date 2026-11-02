import assert from "node:assert/strict";
import test from "node:test";
import { registerCanvasResourceRevision, prepareCanvasResourceRevision, applyCanvasResourceRevision, prepareCanvasResourceRevisionStages } from "../../../src/materialization/canvasResourceRevision.js";

test("Canvas resource revision dispatch is exact-class, one-time and isolated from caller-owned handler edits", () => {
  class Registered {}
  class Inherited extends Registered {}
  const plan = Object.freeze({ ready: true }), calls = [];
  const handler = { *prepareStages(program, scope) { calls.push(["stages", program, scope]); yield "turn"; return plan; }, prepare(program) { calls.push(["prepare", program]); return plan; }, apply(program, candidate) { calls.push(["apply", program, candidate]); return { ...program, changed: true }; } };
  registerCanvasResourceRevision(Registered, handler);
  handler.prepare = () => { throw new Error("mutated handler"); };
  handler.apply = () => { throw new Error("mutated handler"); };
  handler.prepareStages = () => { throw new Error("mutated stages"); };
  const program = Object.freeze({ constructor: Registered, unchanged: true }), inherited = { constructor: Inherited };
  assert.equal(prepareCanvasResourceRevision(program), plan);
  assert.deepEqual(applyCanvasResourceRevision(program, plan), { constructor: Registered, unchanged: true, changed: true });
  const scope = Object.freeze({ label: "scope" }), stages = prepareCanvasResourceRevisionStages(program, scope);
  assert.deepEqual(stages.next(), { value: "turn", done: false });
  assert.deepEqual(stages.next(), { value: plan, done: true });
  assert.deepEqual(calls, [["prepare", program], ["apply", program, plan], ["stages", program, scope]]);
  assert.equal(prepareCanvasResourceRevision(inherited), undefined);
  assert.deepEqual(prepareCanvasResourceRevisionStages(inherited).next(), { value: undefined, done: true });
  assert.equal(applyCanvasResourceRevision(inherited, undefined), inherited);
  assert.equal(program.changed, undefined);
  assert.throws(() => registerCanvasResourceRevision(Registered, handler), /one exact constructor/);
});

test("Canvas resource registration rejects invalid, extra and accessor-bearing handlers before invoking them", () => {
  const valid = { prepare() {}, apply() {}, *prepareStages() {} };
  assert.throws(() => registerCanvasResourceRevision({}, valid), /constructor/);
  for (const handler of [null, {}, { prepare() {} }, { ...valid, extra: true }, { ...valid, prepareStages: 1 }, { prepare: 1, apply() {} }, { prepare() {}, apply: 1 }]) {
    assert.throws(() => registerCanvasResourceRevision(class {}, handler));
  }
  let reads = 0;
  assert.throws(() => registerCanvasResourceRevision(class {}, { get prepare() { reads++; return () => {}; }, apply() {} }), /accessors/);
  assert.equal(reads, 0);
});
