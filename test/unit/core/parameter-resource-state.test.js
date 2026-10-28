import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../src/index.js";
import { validateStoredResource, validateInputReference, validateResourceGraph,
  planStoredResourceRemoval, collectParameterInputReferences } from "../../../src/materialization/resourceState.js";
import { requireStoredResource } from "../../../src/selectors/resources.js";
import { adoptSelectionResources } from "../../../src/actions/primitives/resourceState.js";
import { getErrorDetails } from "../../../src/core/diagnostics.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";

const resource = (id = "p", value = 1, revision = 0) => ({
  kind: "parameter", id, revision, algorithmVersion: "1", ownership: { mode: "authored" }, inputs: [],
  options: { type: "number", nullable: false }, result: { value }, provenance: { origin: "authored" }
});
const ref = (id = "p", revision = 0) => ({ kind: "parameter", id, revision });
const put = (program, value) => program.editSemantic({ property: `resource[parameter:${value.id}]`, value });
const code = expected => error => getErrorDetails(error)?.code === expected;
const computed = (id, input = ref()) => ({ id, transform: [{ type: "computed", parameterInputs: [input] }] });
const withDatasets = (program, datasets) => program._clone({ semanticSpec: { ...program.semanticSpec, datasets } });

test("parameter resources use exact typed identity and immutable revision snapshots", () => {
  const base = put(chart(), resource());
  const changed = put(base, resource("p", -0, 1));
  assert.equal(base.semanticSpec.resources[0].result.value, 1);
  assert.ok(Object.is(changed.semanticSpec.resources[0].result.value, -0));
  assert.throws(() => put(base, resource()), code("duplicate-id"));
  assert.throws(() => requireStoredResource(changed, ref()), code("stale-result"));
  assert.equal(requireStoredResource(changed, ref("p", 1)), changed.semanticSpec.resources[0]);
  assert.deepEqual(validateInputReference(ref()), ref());
});

test("parameter resource values survive tagged snapshot restoration", () => {
  const base = put(chart(), resource("p", -0));
  const restored = deserializeProgram(serializeProgram(base));
  assert.ok(Object.is(restored.semanticSpec.resources[0].result.value, -0));
  assert.equal(serializeProgram(restored), serializeProgram(base));
});

test("stored parameters reject generated ownership, inputs, duplicate value owners, and non-authored provenance", () => {
  const mutations = [
    value => { value.ownership = { mode: "generated", owner: ref("other") }; },
    value => { value.inputs = [ref("other")]; },
    value => { value.options.value = 2; },
    value => { value.options.type = "date"; },
    value => { value.options.nullable = undefined; },
    value => { value.result.extra = true; },
    value => { delete value.result.value; },
    value => { value.result.value = null; },
    value => { value.provenance = { origin: "observed" }; },
    value => { value.provenance.sourceRows = []; },
    value => { value.revision = Number.MAX_SAFE_INTEGER + 1; },
    value => { value.algorithmVersion = "2"; }
  ];
  for (const mutate of mutations) {
    const candidate = resource(); mutate(candidate);
    assert.throws(() => validateStoredResource(candidate));
  }
  assert.throws(() => validateResourceGraph({ semanticSpec: { resources: [resource(), resource()] } }), code("duplicate-id"));
});

test("stored parameter descriptor safety rejects accessors without execution", () => {
  let reads = 0;
  for (const path of [["kind"], ["ownership", "mode"], ["options", "type"], ["result", "value"], ["provenance", "origin"]]) {
    const candidate = resource(), owner = path.length === 1 ? candidate : candidate[path[0]];
    Object.defineProperty(owner, path.at(-1), { enumerable: true, get() { reads++; return 1; } });
    assert.throws(() => put(chart(), candidate), /own data properties/);
  }
  assert.equal(reads, 0);
});

test("parameter removal restricts every stored computed snapshot and primitive bypass", () => {
  const base = withDatasets(put(chart(), resource()), [computed("inactive"), computed("current")]);
  const before = base.semanticSpec;
  assert.deepEqual(collectParameterInputReferences(base).map(value => value.ownerId), ["inactive", "current"]);
  assert.throws(() => planStoredResourceRemoval(base, resource(), { cascade: true }), code("resource-in-use"));
  assert.throws(() => base.editSemantic({ property: "resource[parameter:p]", remove: true }), code("resource-in-use"));
  assert.equal(base.semanticSpec, before);
  const unreferenced = put(chart(), resource());
  assert.deepEqual(unreferenced.editSemantic({ property: "resource[parameter:p]", remove: true }).semanticSpec.resources, []);
});

test("parameter consumers include retained facet scopes and exclude independent concat children", () => {
  const child = withDatasets(put(chart(), resource()), [computed("computed")]);
  const base = put(chart(), resource());
  const facet = { ...base, compositionSpec: { type: "facet", children: ["left"] }, children: { left: child } };
  const concat = { ...facet, compositionSpec: { type: "concat", children: ["left"] } };
  assert.deepEqual(collectParameterInputReferences(facet).map(value => value.scope), [["left"]]);
  assert.throws(() => planStoredResourceRemoval(facet, resource()), code("resource-in-use"));
  assert.deepEqual(collectParameterInputReferences(concat), []);
  assert.deepEqual(planStoredResourceRemoval(concat, resource()), base.semanticSpec.resources);
});

test("facet resource adoption supplies missing exact parameter dependencies and preserves current values", () => {
  const source = put(chart(), resource());
  const missing = withDatasets(chart(), [computed("computed")]);
  const adopted = adoptSelectionResources(missing, source, undefined);
  assert.deepEqual(adopted.semanticSpec.resources[0], source.semanticSpec.resources[0]);
  assert.deepEqual(missing.semanticSpec.resources, []);
  assert.equal(adoptSelectionResources(adopted, source, undefined), adopted);
  const newer = withDatasets(put(source, resource("p", 2, 1)), [computed("computed", ref("p", 1))]);
  assert.equal(adoptSelectionResources(newer, source, undefined), newer);
  const stale = withDatasets(newer, [computed("computed")]);
  assert.throws(() => adoptSelectionResources(stale, source, undefined), code("stale-result"));
});
