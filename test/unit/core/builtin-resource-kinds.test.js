import assert from "node:assert/strict";
import test from "node:test";
import { ChartProgram } from "../../../src/ChartProgram.js";
import { chart as basicChart } from "../../../src/basic.js";
import { chart } from "../../../src/index.js";
import { registerBuiltinResourceKinds, getBuiltinResourceKindHandler } from "../../../src/materialization/resourceKinds.js";
import { validateStoredResource, validateResourceGraph, prepareResourceResult, validatePreparedResource } from "../../../src/materialization/resourceState.js";
import { validateProgramState } from "../../../src/persistence/validation.js";
import { deserializeProgram, serializeProgram } from "../../../src/persistence.js";
import { encodeValue, decodeValue } from "../../../src/persistence/codec.js";

const resource = (id = "model", inputs = []) => ({ kind: "hierarchy", id, revision: 0,
  algorithmVersion: "1", ownership: { mode: "authored" }, inputs,
  options: {}, result: { total: 3 }, provenance: { origin: "authored" } });
const handler = () => ({
  validateStored(value) { assert.deepEqual(value.options, {}); assert.ok(Number.isFinite(value.result.total), "stored total must be finite"); },
  validateBindings(program, value) {
    if (value.inputs.length) assert.equal(value.result.total, program.semanticSpec.resources.find(item => item.id === value.inputs[0].id).result.total, "stored dependency result must match");
  }
});
const put = (program, value) => program.editSemantic({ property: `resource[${value.kind}:${value.id}]`, value });

test("builtin handlers are copied once per exact program constructor", () => {
  class Registered extends ChartProgram {}
  class Derived extends Registered {}
  const original = handler(), supplied = { hierarchy: original };
  registerBuiltinResourceKinds(Registered, supplied);
  const stored = getBuiltinResourceKindHandler(Registered, "hierarchy");
  assert.notEqual(stored, original);
  assert.ok(Object.isFrozen(stored));
  original.validateStored = () => { throw new Error("changed caller handler"); };
  delete supplied.hierarchy;
  assert.doesNotThrow(() => stored.validateStored(resource()));
  assert.equal(getBuiltinResourceKindHandler(Derived, "hierarchy"), undefined);
  assert.equal(getBuiltinResourceKindHandler(Registered, "__proto__"), undefined);
  assert.equal(getBuiltinResourceKindHandler(undefined, "hierarchy"), undefined);
  assert.throws(() => registerBuiltinResourceKinds(Registered, {}), /already registered/);
  assert.throws(() => put(new Derived(), resource()), /not registered/);
});

test("registration rejects malformed records before invoking getters or consuming the constructor", () => {
  let reads = 0;
  for (const invalid of [null, [], { future: handler() }, { parameter: handler() },
    { hierarchy: { validateStored() {} } }, { hierarchy: { ...handler(), extra: true } },
    { hierarchy: { validateStored: false, validateBindings() {} } },
    { get hierarchy() { reads++; return handler(); } },
    { hierarchy: { get validateStored() { reads++; return () => {}; }, validateBindings() {} } }]) {
    class Program extends ChartProgram {}
    assert.throws(() => registerBuiltinResourceKinds(Program, invalid));
    registerBuiltinResourceKinds(Program, {});
  }
  assert.equal(reads, 0);
  assert.throws(() => registerBuiltinResourceKinds({}, {}), /constructor/);
  assert.throws(() => registerBuiltinResourceKinds(() => {}, {}), /constructor/);
});

test("resource graph and primitive writes preserve explicit constructor capability", () => {
  class Program extends ChartProgram {}
  registerBuiltinResourceKinds(Program, { hierarchy: handler() });
  const before = new Program(), after = put(before, resource());
  assert.equal(before.semanticSpec.resources.length, 0);
  assert.equal(after.semanticSpec.resources.length, 1);
  validateResourceGraph(after);
  validateProgramState(after, "payload");
  assert.throws(() => validateStoredResource(resource()), /not registered/);
  assert.throws(() => validateResourceGraph({ ...after }), /not registered/);
  assert.doesNotThrow(() => validateResourceGraph({ ...after }, Program));
  const trace = after.trace, snapshot = JSON.stringify(after.semanticSpec);
  assert.throws(() => put(after, { ...resource("invalid"), result: { total: NaN } }), /finite/);
  assert.equal(after.trace, trace);
  assert.equal(JSON.stringify(after.semanticSpec), snapshot);
  assert.throws(() => put(basicChart(), resource()), /not registered/);
  class Unregistered extends ChartProgram {}
  assert.throws(() => put(new Unregistered(), resource()), /not registered/);
});

test("builtin graph bindings run only after exact references and acyclic dependencies validate", () => {
  class Program extends ChartProgram {}
  let bindings = 0;
  const baseHandler = handler();
  registerBuiltinResourceKinds(Program, { hierarchy: { ...baseHandler,
    validateBindings(program, value) { bindings++; baseHandler.validateBindings(program, value); }
  } });
  const root = put(new Program(), resource());
  const ref = { kind: "hierarchy", id: "model", revision: 0 };
  const child = put(root, resource("child", [ref]));
  assert.ok(bindings > 0);
  const count = bindings;
  assert.throws(() => put(child, resource("stale", [{ ...ref, revision: 1 }])), /stale/);
  assert.equal(bindings, count);
  assert.throws(() => put(child, { ...resource(), revision: 1, inputs: [{ kind: "hierarchy", id: "child", revision: 0 }] }), /Cyclic/);
  assert.equal(bindings, count);
  assert.throws(() => put(child, { ...resource(), revision: 1, result: { total: 4 } }), /dependency result/);
  assert.equal(child.semanticSpec.resources[0].revision, 0);
  assert.equal(child.semanticSpec.resources[1].inputs[0].revision, 0);
});

test("prepared results and stored restoration apply the same builtin shape and binding checks", () => {
  class Program extends ChartProgram {}
  registerBuiltinResourceKinds(Program, { hierarchy: handler() });
  const root = put(new Program(), resource()), ref = { kind: "hierarchy", id: "model", revision: 0 };
  const prepared = prepareResourceResult(root, resource("child", [ref]));
  assert.deepEqual(validatePreparedResource(root, prepared), prepared.resource);
  assert.throws(() => prepareResourceResult(root, { ...resource("bad", [ref]), result: { total: 2 } }), /dependency result/);
  assert.throws(() => validatePreparedResource(root, { ...prepared, resource: { ...prepared.resource, result: { total: 2 } } }), /dependency result/);
  assert.throws(() => validatePreparedResource(basicChart(), prepared), /not registered/);
  const changed = put(root, { ...resource(), revision: 1 });
  assert.throws(() => validatePreparedResource(changed, prepared), /stale/);
  const envelope = JSON.parse(serializeProgram(chart()));
  const state = decodeValue(envelope.payload);
  state.semanticSpec.resources = [resource()];
  envelope.payload = encodeValue(state);
  assert.throws(() => deserializeProgram(JSON.stringify(envelope)));
});

test("common envelope and provenance validation precede builtin handler calls", () => {
  class Program extends ChartProgram {}
  let calls = 0;
  registerBuiltinResourceKinds(Program, { hierarchy: { validateStored() { calls++; }, validateBindings() {} } });
  for (const patch of [{ algorithmVersion: "2" }, { revision: -1 }, { inputs: [{ kind: "unknown", id: "x", revision: 0 }] },
    { provenance: { origin: "unknown" } }, { provenance: { origin: "observed", sourceRows: [{}] } }]) {
    assert.throws(() => validateStoredResource({ ...resource(), ...patch }, Program));
  }
  assert.equal(calls, 0);
  validateStoredResource(resource(), Program);
  assert.equal(calls, 1);
});
