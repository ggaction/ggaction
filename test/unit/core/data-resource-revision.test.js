import assert from "node:assert/strict";
import test from "node:test";
import { registerDataResourceRevision, reviseDataResources, hasDataResourceRevision } from "../../../src/actions/data/resourceRevision.js";

test("data resource revision authority is exact-class, copied and registered once", () => {
  class Registered {} class Other {} class Child extends Registered {}
  const calls = [], handler = { kinds: ["hierarchy"], revise(program, replacements) { calls.push([program, replacements]); return { changed: true }; } };
  registerDataResourceRevision(Registered, handler);
  handler.kinds.push("image"); handler.revise = () => { throw new Error("Changed caller handler"); };
  const program = new Registered(), replacements = new Map([["old", "next"]]);
  assert.deepEqual(reviseDataResources(program, replacements), { changed: true });
  assert.deepEqual(calls, [[program, replacements]]);
  assert.equal(hasDataResourceRevision(program, "hierarchy"), true);
  assert.equal(hasDataResourceRevision(program, "image"), false);
  for (const unregistered of [new Other(), new Child()]) {
    assert.equal(reviseDataResources(unregistered, replacements), unregistered);
    assert.equal(hasDataResourceRevision(unregistered, "hierarchy"), false);
  }
  assert.throws(() => registerDataResourceRevision(Registered, handler), /already registered/);
});

test("malformed data resource revision handlers fail before getter execution or registration", () => {
  let calls = 0;
  const getter = { get kinds() { calls++; return ["hierarchy"]; }, revise() {} };
  for (const handler of [getter, { kinds: [], revise() {} }, { kinds: ["unknown"], revise() {} },
    { kinds: ["hierarchy", "hierarchy"], revise() {} }, { kinds: ["hierarchy"], revise: true },
    { kinds: ["hierarchy"], revise() {}, extra: true }]) {
    class Program {}
    assert.throws(() => registerDataResourceRevision(Program, handler));
    assert.equal(reviseDataResources(new Program(), new Map()).constructor, Program);
  }
  assert.throws(() => registerDataResourceRevision({}, { kinds: ["hierarchy"], revise() {} }), /constructor/);
  assert.equal(calls, 0);
});
