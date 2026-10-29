import assert from "node:assert/strict";
import test from "node:test";
import { registerCanvasResourceRevision, prepareCanvasResourceRevision, applyCanvasResourceRevision } from "../../../src/actions/canvas/resourceRevision.js";

test("Canvas resource revision dispatch is exact-class, one-time and isolated from caller-owned handler edits", () => {
  class Registered {}
  class Inherited extends Registered {}
  const plan = Object.freeze({ ready: true }), calls = [];
  const handler = { prepare(program) { calls.push(["prepare", program]); return plan; }, apply(program, candidate) { calls.push(["apply", program, candidate]); return { ...program, changed: true }; } };
  registerCanvasResourceRevision(Registered, handler);
  handler.prepare = () => { throw new Error("mutated handler"); };
  handler.apply = () => { throw new Error("mutated handler"); };
  const program = Object.freeze({ constructor: Registered, unchanged: true }), inherited = { constructor: Inherited };
  assert.equal(prepareCanvasResourceRevision(program), plan);
  assert.deepEqual(applyCanvasResourceRevision(program, plan), { constructor: Registered, unchanged: true, changed: true });
  assert.deepEqual(calls, [["prepare", program], ["apply", program, plan]]);
  assert.equal(prepareCanvasResourceRevision(inherited), undefined);
  assert.equal(applyCanvasResourceRevision(inherited, undefined), inherited);
  assert.equal(program.changed, undefined);
  assert.throws(() => registerCanvasResourceRevision(Registered, handler), /one exact constructor/);
});

test("Canvas resource registration rejects invalid, extra and accessor-bearing handlers before invoking them", () => {
  const valid = { prepare() {}, apply() {} };
  assert.throws(() => registerCanvasResourceRevision({}, valid), /constructor/);
  for (const handler of [null, {}, { prepare() {} }, { ...valid, extra: true }, { prepare: 1, apply() {} }, { prepare() {}, apply: 1 }]) {
    assert.throws(() => registerCanvasResourceRevision(class {}, handler));
  }
  let reads = 0;
  assert.throws(() => registerCanvasResourceRevision(class {}, { get prepare() { reads++; return () => {}; }, apply() {} }), /accessors/);
  assert.equal(reads, 0);
});
