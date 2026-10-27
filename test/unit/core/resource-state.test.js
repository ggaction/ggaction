import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../src/index.js";
import { prepareResourceResult, validatePreparedResource, planStoredResourceRemoval, validateResourceGraph } from "../../../src/materialization/resourceState.js";
import { getErrorDetails } from "../../../src/core/diagnostics.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";

const resource = (id, inputs = [], ownership = { mode: "authored" }) => ({
  kind: "persistent-selection", id, revision: 0, algorithmVersion: "1", ownership, inputs,
  options: { mode: "predicate", predicate: { field: "v", op: "gt", value: 1 } }, result: {}, provenance: { origin: "authored" }
});
const ref = id => ({ kind: "persistent-selection", id, revision: 0 });
const put = (program, value) => program.editSemantic({ property: `resource[persistent-selection:${value.id}]`, value });
const code = expected => error => getErrorDetails(error)?.code === expected;

test("typed resource revisions rebind dependent DAGs and reject duplicate, missing, and cyclic writes", () => {
  const base = put(chart(), resource("root"));
  const child = put(base, resource("child", [ref("root")], { mode: "generated", owner: ref("root") }));
  const changed = put(child, { ...resource("root"), revision: 1 });
  assert.equal(changed.semanticSpec.resources[1].revision, 1);
  assert.equal(changed.semanticSpec.resources[1].inputs[0].revision, 1);
  assert.equal(child.semanticSpec.resources[1].inputs[0].revision, 0);
  assert.throws(() => put(base, resource("root")), code("duplicate-id"));
  assert.throws(() => put(base, { ...resource("absent"), revision: 1 }), code("missing-resource"));
  assert.throws(() => put(child, { ...resource("root", [ref("child")]), revision: 1 }), code("cyclic-dependency"));
  assert.equal(serializeProgram(deserializeProgram(serializeProgram(changed))), serializeProgram(changed));
});

test("prepared results pin exact input revisions and content before commit", () => {
  const base = put(chart(), resource("root"));
  const prepared = prepareResourceResult(base, resource("child", [ref("root")]));
  assert.deepEqual(validatePreparedResource(base, prepared), prepared.resource);
  const changed = put(base, { ...resource("root"), revision: 1 });
  assert.throws(() => validatePreparedResource(changed, prepared), code("stale-result"));
  assert.throws(() => validatePreparedResource(base, { ...prepared, resource: resource("child") }), code("stale-result"));
  assert.throws(() => validatePreparedResource(base, { ...prepared, inputHash: "wrong" }), code("stale-result"));
});

test("removal restricts dependencies and cascades only explicitly owned generated resources", () => {
  const root = resource("root"), base = put(chart(), root);
  const generated = put(base, resource("child", [ref("root")], { mode: "generated", owner: ref("root") }));
  assert.throws(() => planStoredResourceRemoval(generated, root), code("resource-in-use"));
  assert.deepEqual(planStoredResourceRemoval(generated, root, { cascade: true }).map(value => value.id), ["root", "child"]);
  const shared = put(generated, resource("shared", [ref("child")]));
  assert.throws(() => planStoredResourceRemoval(shared, root, { cascade: true }), code("resource-in-use"));
  assert.throws(() => validateResourceGraph({ semanticSpec: { resources: [root, root] } }), code("duplicate-id"));
  assert.throws(() => put(base, { ...resource("bad"), kind: "graph" }), /identity|kind/i);
});

test("row provenance is validated and prevents removal of its source dataset", () => {
  const source = chart().createData({ id: "rows", values: [{ v: 2 }] });
  const dataset = source.semanticSpec.datasets[0];
  const observed = { ...resource("observed"), provenance: { origin: "observed", sourceRows: [
    { data: dataset.id, logicalDataId: dataset.logicalId, revision: dataset.revision, rowKey: dataset.rowKeys[0], role: "observed" }
  ] } };
  const stored = put(source, observed);
  assert.throws(() => stored.removeData({ id: "rows" }), code("resource-in-use"));
  assert.throws(() => put(source, { ...observed, provenance: { ...observed.provenance, sourceRows: [{ ...observed.provenance.sourceRows[0], rowKey: "absent" }] } }), code("stale-result"));
  assert.throws(() => put(source, { ...observed, provenance: { origin: "observed", sourceRows: [{}] } }), code("ambiguous-identity"));
  assert.equal(serializeProgram(deserializeProgram(serializeProgram(stored))), serializeProgram(stored));
});

test("closed resource contracts reject malformed versions, references, options and provenance atomically", () => {
  const base = put(chart(), resource("root")), saved = serializeProgram(base);
  const mutations = [
    value => { value.extra = true; },
    value => { value.algorithmVersion = "2"; },
    value => { value.revision = -1; },
    value => { value.ownership = { mode: "shared" }; },
    value => { value.ownership = { mode: "generated", owner: { ...ref("root"), revision: 9 } }; },
    value => { value.inputs = {}; },
    value => { value.inputs = [ref("root"), ref("root")]; },
    value => { value.inputs = [{ ...ref("root"), extra: 1 }]; },
    value => { value.inputs = [{ ...ref("root"), kind: "future-kind" }]; },
    value => { value.inputs = [{ kind: "data", id: "rows", logicalId: "", revision: 0 }]; },
    value => { value.inputs = [ref("missing")]; },
    value => { value.result = { value: 1 }; },
    value => { value.options = { mode: "unknown" }; },
    value => { value.options.predicate.grain = "item"; },
    value => { value.options = { mode: "row-keys", logicalDataId: "logical", rowKeys: ["a", "a"] }; },
    value => { value.provenance.origin = "unknown"; },
    value => { value.provenance.sourceRows = {}; }
  ];
  for (const mutate of mutations) {
    const value = resource("invalid"); mutate(value);
    assert.throws(() => put(base, value));
    assert.equal(serializeProgram(base), saved);
  }
  assert.throws(() => base.editSemantic({ property: "resource[persistent-selection:missing]", remove: true }), code("missing-resource"));
});

test("prepared input fingerprints reject a different fork with the same dataset revision number", () => {
  const original = chart().createData({ id: "rows", values: [{ v: 1 }] });
  const first = original.reviseData({ source: "rows", id: "next", values: [{ v: 2 }], rowMap: [0] });
  const second = original.reviseData({ source: "rows", id: "next", values: [{ v: 3 }], rowMap: [0] });
  const dataset = first.semanticSpec.datasets.find(value => value.id === "next");
  const input = { kind: "data", id: "next", logicalId: dataset.logicalId, revision: dataset.revision };
  const prepared = prepareResourceResult(first, resource("selected", [input]));
  assert.throws(() => validatePreparedResource(second, prepared), code("stale-result"));
  assert.equal(first.semanticSpec.datasets.at(-1).values[0].v, 2);
});
