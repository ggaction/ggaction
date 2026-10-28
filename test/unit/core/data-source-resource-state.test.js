import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../src/index.js";
import { createSourceIdentity, reviseSourceIdentity } from "../../../src/core/itemIdentity.js";
import { getErrorDetails } from "../../../src/core/diagnostics.js";
import { collectResourceReferences } from "../../../src/core/resourceReferences.js";
import { prepareDataSource } from "../../../src/resources/resolveData.js";
import { parameterEnvironment } from "../../../src/grammar/parameter.js";
import { withPreparedDatasetIdentity } from "../../../src/actions/primitives/datasetIdentity.js";
import { withPreparedSourceResources, preparedSourceResources } from "../../../src/actions/primitives/dataSourceContext.js";
import { adoptSelectionResources, detachDataSourceBindings } from "../../../src/actions/primitives/resourceState.js";
import { validateStoredResource, validateResourceGraph, collectParameterInputReferences } from "../../../src/materialization/resourceState.js";
import { createDataSourceReceipt, createDataSourceResource, normalizeDataSourceOptions,
  validateDataSourceReceipt, validateDataSourceState } from "../../../src/materialization/dataSourceState.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { decodeValue, encodeValue } from "../../../src/persistence/codec.js";

const code = expected => error => getErrorDetails(error)?.code === expected;
const sourceURL = { kind: "url", format: "csv", parse: { value: { type: "number" } }, url: {
  version: 2, registry: "standard@1", root: { type: "call", name: "concat", args: [
    { type: "literal", value: "/" }, { type: "parameter", id: "region" }, { type: "literal", value: ".csv" }
  ] }
} };

function addSnapshot(program, prepared, id, sourceId, identity) {
  const receipt = createDataSourceReceipt(prepared, { sourceId });
  const ready = program.editSemantic({ property: `dataset[${id}].sourceReceipt`, value: receipt })
    .editSemantic({ property: `dataset[${id}].schema`, value: prepared.schema });
  const args = { property: `dataset[${id}].values`, value: prepared.values };
  return withPreparedDatasetIdentity(args, identity ?? createSourceIdentity(prepared.values, {}, {
    logicalId: `${id}-logical`, allocationId: `${id}-allocation`
  }), input => ready.editSemantic(input));
}

async function liveURL() {
  const program = chart().createParameter({ id: "region", value: "north" });
  const options = normalizeDataSourceOptions(sourceURL, { baseURL: "https://example.test" });
  const prepared = await prepareDataSource(sourceURL, { baseURL: options.baseURL, requestToken: "first",
    parameterInputs: [{ kind: "parameter", id: "region", revision: 0 }],
    parameters: parameterEnvironment(program.semanticSpec.resources),
    load: async () => ({ text: "value\n1\n2\n", encoding: "utf-8", mimeType: "text/csv" }) });
  let next = addSnapshot(program, prepared, "rows", "rows");
  const resource = createDataSourceResource({ id: "rows", options, prepared, dataset: next.semanticSpec.datasets[0] });
  next = next.editSemantic({ property: "resource[data-source:rows]", value: resource });
  return { program: next, prepared, resource, options };
}

test("source receipts retain UTF-8 contents and typed schemas for offline round trips", async () => {
  const { program, prepared } = await liveURL();
  assert.equal(validateDataSourceState(program), program);
  const restored = deserializeProgram(serializeProgram(program));
  assert.equal(serializeProgram(restored), serializeProgram(program));
  const receipt = restored.semanticSpec.datasets[0].sourceReceipt;
  assert.deepEqual(receipt.original, { kind: "text", text: "value\n1\n2\n" });
  assert.equal(receipt.resolvedURL, "https://example.test/north.csv");
  assert.equal(receipt.provenance.contentHash, prepared.provenance.contentHash);
  assert.deepEqual(validateDataSourceReceipt(receipt), { values: prepared.values, schema: prepared.schema });
  assert.equal(Object.hasOwn(receipt, "parameters"), false);
  assert.equal(Object.hasOwn(receipt, "requestToken"), false);
});

test("row receipts preserve signed zero and distinguish authored rows from bytes", async () => {
  const prepared = await prepareDataSource({ kind: "inline", values: [{ value: -0 }] }, { requestToken: "rows" });
  const program = addSnapshot(chart(), prepared, "rows", "historical-source");
  const restored = deserializeProgram(serializeProgram(program));
  assert.ok(Object.is(restored.semanticSpec.datasets[0].values[0].value, -0));
  assert.ok(Object.is(restored.semanticSpec.datasets[0].sourceReceipt.original.values[0].value, -0));
  assert.equal(restored.semanticSpec.datasets[0].sourceReceipt.provenance.hashKind, "encoded-rows");
  assert.equal(restored.semanticSpec.resources.length, 0);
});

test("named empty data retains declared fields and reusable field keys without a host at restore", async () => {
  const source = { kind: "named", name: "observations", format: "csv",
    parse: { value: { type: "number" } }, schema: { fields: [
      { name: "id", storageType: "string" }, { name: "value", storageType: "number" }
    ] } };
  let calls = 0;
  const prepared = await prepareDataSource(source, { requestToken: "empty", resolveNamed: async () => {
    calls++;
    return { text: "id,value\r\n", encoding: "utf-8", mimeType: "text/csv; charset=utf-8" };
  } });
  const options = normalizeDataSourceOptions(source, { keyField: "id" });
  let program = addSnapshot(chart(), prepared, "empty", "empty", createSourceIdentity([], options, {
    logicalId: "empty-logical", allocationId: "empty-allocation"
  }));
  const resource = createDataSourceResource({ id: "empty", options, prepared, dataset: program.semanticSpec.datasets[0] });
  program = program.editSemantic({ property: "resource[data-source:empty]", value: resource });
  const restored = deserializeProgram(serializeProgram(program));
  assert.equal(calls, 1);
  assert.deepEqual(restored.semanticSpec.datasets[0].values, []);
  assert.equal(restored.semanticSpec.datasets[0].schema.origin, "declared");
  assert.deepEqual(restored.semanticSpec.datasets[0].schema.fields.map(({ name, storageType }) => [name, storageType]),
    [["id", "string"], ["value", "number"]]);
  assert.equal(restored.semanticSpec.datasets[0].sourceReceipt.name, "observations");
  assert.equal(restored.semanticSpec.datasets[0].sourceReceipt.provenance.mimeType, "text/csv");
  assert.equal(validateDataSourceState(restored), restored);
});

test("receipt and source shape validation rejects altered contents and descriptor access without reads", async () => {
  const { program, resource } = await liveURL();
  const original = program.semanticSpec.datasets[0].sourceReceipt;
  const mutations = [
    value => { value.original.text = "value\n8\n"; },
    value => { value.original.extra = true; },
    value => { value.provenance.parserVersion = "csv@2"; },
    value => { value.provenance.contentHash = "0".repeat(64); },
    value => { value.provenance.byteLength++; },
    value => { value.provenance.mimeType = "application/json"; },
    value => { value.provenance.mimeType = 3; },
    value => { delete value.provenance.byteLength; },
    value => { value.name = "ambiguous"; },
    value => { value.resolvedURL = "https://example.test:443/north.csv"; },
    value => { delete value.resolvedURL; value.name = ""; },
    value => { value.original.kind = "bytes"; },
    value => { delete value.parsing.parse.value.nullable; },
    value => { value.parsing.parse.value.nullable = undefined; }
  ];
  for (const mutate of mutations) {
    const receipt = structuredClone(original); mutate(receipt);
    assert.throws(() => validateDataSourceReceipt(receipt, program.semanticSpec.datasets[0]));
  }
  let reads = 0;
  const forged = structuredClone(resource);
  Object.defineProperty(forged.options, "source", { enumerable: true, get() { reads++; return sourceURL; } });
  assert.throws(() => validateStoredResource(forged), /own data properties/);
  assert.equal(reads, 0);
  assert.throws(() => program.editSemantic({ property: "dataset[rows].sourceReceipt", value: original }), /immutable/);
  assert.throws(() => validateDataSourceReceipt(original, { source: "rows" }), /original datasets/);
  assert.throws(() => validateDataSourceReceipt({ ...original, name: undefined }), /undefined/);
  const authored = await prepareDataSource({ kind: "inline", values: [{ value: 1 }] }, { requestToken: "authored" });
  const authoredReceipt = createDataSourceReceipt(authored, { sourceId: "authored" });
  assert.throws(() => validateDataSourceReceipt({ ...authoredReceipt, name: "received" }), /Authored rows/);
  assert.throws(() => validateDataSourceReceipt({ ...authoredReceipt,
    provenance: { ...authoredReceipt.provenance, contentHash: "0".repeat(64) } }), /provenance/);
});

test("live source outputs are exact references while historical receipts remain independent", async () => {
  const { program } = await liveURL();
  assert.deepEqual(collectResourceReferences(program, { kind: "data", id: "rows" })
    .filter(value => value.ownerKind === "resource").map(value => value.path), [["result", "data"]]);
  assert.throws(() => program.editSemantic({ property: "dataset[rows]", remove: true }), code("resource-in-use"));
  assert.throws(() => program.removeParameter({ id: "region" }), code("resource-in-use"));
  const detached = detachDataSourceBindings(program, program.semanticSpec.datasets[0]);
  assert.equal(detached.semanticSpec.datasets[0].sourceReceipt, program.semanticSpec.datasets[0].sourceReceipt);
  assert.equal(detached.semanticSpec.resources.some(value => value.kind === "data-source"), false);
  assert.doesNotThrow(() => serializeProgram(detached.removeParameter({ id: "region" })));
  const removed = program.removeData({ id: "rows" });
  assert.equal(removed.semanticSpec.datasets.length, 0);
  assert.equal(removed.semanticSpec.resources.some(value => value.kind === "data-source"), false);
  assert.ok(removed.trace.children.at(-1).children.some(value => value.op === "editSemantic"));
  assert.equal(program.semanticSpec.datasets.length, 1);
});

test("primitive parameter rebinding cannot make stale source bytes a finalized result", async () => {
  const { program } = await liveURL();
  const parameter = program.semanticSpec.resources.find(value => value.kind === "parameter");
  const changed = program.editSemantic({ property: "resource[parameter:region]", value: {
    ...parameter, revision: 1, result: { value: "south" }
  } });
  assert.doesNotThrow(() => validateResourceGraph(changed));
  assert.throws(() => validateDataSourceState(changed), code("stale-result"));
  assert.throws(() => serializeProgram(changed));
  const source = changed.semanticSpec.resources.find(value => value.kind === "data-source");
  assert.equal(source.revision, 1);
  assert.deepEqual(source.inputs, [{ kind: "parameter", id: "region", revision: 1 }]);
  assert.deepEqual(program.semanticSpec.datasets[0].values, [{ value: 1 }, { value: 2 }]);
});

test("prepared final source envelopes apply exactly once with the parameter primitive", async () => {
  const { program, resource, options } = await liveURL();
  const parameter = program.semanticSpec.resources.find(value => value.kind === "parameter");
  const revised = { ...parameter, revision: 1, result: { value: "south" } };
  const prepared = await prepareDataSource(sourceURL, { baseURL: options.baseURL, requestToken: "second",
    parameterInputs: [{ kind: "parameter", id: "region", revision: 1 }],
    parameters: { region: { type: "string", value: "south" } },
    load: async () => ({ text: "value\n7\n8\n", encoding: "utf-8", mimeType: "text/csv" }) });
  const identity = reviseSourceIdentity(program.semanticSpec.datasets[0], prepared.values, {}, "revision-allocation");
  const staged = addSnapshot(program, prepared, "rowsNext", "rows", identity);
  const nextResource = createDataSourceResource({ id: "rows", revision: 1, options, prepared, dataset: staged.semanticSpec.datasets.at(-1) });
  const args = { property: "resource[parameter:region]", value: revised };
  const replacements = [{ previous: { kind: "data-source", id: "rows", revision: 0 }, resource: nextResource }];
  const changed = withPreparedSourceResources(args, replacements, input => staged.editSemantic(input));
  assert.equal(preparedSourceResources(args), undefined);
  assert.equal(validateDataSourceState(changed), changed);
  assert.equal(changed.semanticSpec.resources.find(value => value.kind === "data-source").revision, 1);
  assert.deepEqual(changed.semanticSpec.datasets.at(-1).values, [{ value: 7 }, { value: 8 }]);
  assert.deepEqual(changed.semanticSpec.datasets[0].values, [{ value: 1 }, { value: 2 }]);
  assert.doesNotThrow(() => deserializeProgram(serializeProgram(changed)));
  assert.throws(() => withPreparedSourceResources(args, replacements, () => { throw new Error("stop"); }), /stop/);
  assert.equal(preparedSourceResources(args), undefined);
  const copied = { ...args };
  assert.throws(() => validateDataSourceState(withPreparedSourceResources(args, replacements, () => staged.editSemantic(copied))), code("stale-result"));
  assert.throws(() => withPreparedSourceResources(args, replacements, input => changed.editSemantic(input)));
  assert.equal(resource.revision, 0);
});

test("private source envelopes reject forged authority and restore nested context on every exit", async () => {
  const { resource } = await liveURL();
  const args = { property: "resource[parameter:region]" };
  const valid = { previous: { kind: "data-source", id: "rows", revision: 0 }, resource: { ...resource, revision: 1 } };
  const invalid = [
    [{ ...valid, extra: true }], [valid, valid],
    [{ ...valid, previous: { kind: "parameter", id: "rows", revision: 0 } }],
    [{ ...valid, previous: { kind: "data-source", id: "other", revision: 0 } }],
    [{ ...valid, resource: { ...resource, revision: 2 } }],
    [{ ...valid, resource: { ...resource, result: { data: { kind: "parameter", id: "region", revision: 0 }, inputHash: resource.result.inputHash } } }]
  ];
  let invoked = 0;
  for (const replacements of invalid) {
    assert.throws(() => withPreparedSourceResources(args, replacements, () => { invoked++; }));
    assert.equal(preparedSourceResources(args), undefined);
  }
  assert.equal(invoked, 0);
  withPreparedSourceResources(args, [valid], () => {
    const outer = preparedSourceResources(args);
    assert.ok(Object.isFrozen(outer[0].resource));
    withPreparedSourceResources(args, [], () => assert.deepEqual(preparedSourceResources(args), []));
    assert.equal(preparedSourceResources(args), outer);
    assert.throws(() => withPreparedSourceResources(args, [], () => { throw new Error("nested"); }), /nested/);
    assert.equal(preparedSourceResources(args), outer);
  });
  assert.equal(preparedSourceResources(args), undefined);
});

test("source receipt restore rejects base URL, output, key-policy and parameter proof mismatches", async () => {
  const { program } = await liveURL();
  const mutations = [
    value => { value.options.baseURL = "https://other.test/"; },
    value => { value.result.inputHash = "0".repeat(64); },
    value => { value.result.data.logicalId = "other"; },
    value => { value.result.data.revision = 1; },
    value => { value.inputs = []; },
    value => { value.options.keyField = "value"; }
  ];
  for (const mutate of mutations) {
    const resources = structuredClone(program.semanticSpec.resources);
    mutate(resources.find(value => value.kind === "data-source"));
    const forged = program._clone({ semanticSpec: { ...program.semanticSpec, resources } });
    assert.throws(() => serializeProgram(forged));
  }
});

test("decoded snapshots reject corrupted source contents, schemas and live envelopes", async () => {
  const { program, prepared, options } = await liveURL();
  const stored = serializeProgram(program);
  const mutations = [
    state => { state.semanticSpec.datasets[0].sourceReceipt.original.text = "value\n9\n"; },
    state => { state.semanticSpec.datasets[0].schema.fields[0].storageType = "string"; },
    state => { state.semanticSpec.datasets[0].sourceReceipt.parsing.parse.value.type = "string"; },
    state => { state.semanticSpec.datasets[0].sourceReceipt.provenance.encoding = "latin1"; },
    state => { state.semanticSpec.datasets[0].sourceReceipt.resolvedURL = "https://example.test/west.csv"; },
    state => { delete state.semanticSpec.datasets[0].sourceReceipt; },
    state => { state.semanticSpec.datasets[0].sourceReceipt.sourceId = "other"; },
    state => { state.semanticSpec.resources.find(value => value.kind === "data-source").result.data.id = "absent"; },
    state => { state.semanticSpec.resources.find(value => value.kind === "data-source").inputs[0].revision = 2; },
    state => {
      const source = state.semanticSpec.resources.find(value => value.kind === "data-source");
      source.inputs = [];
      source.options.source = { kind: "named", name: "other", format: "csv", delimiter: ",", parse: source.options.source.parse };
    },
    state => {
      const source = structuredClone(state.semanticSpec.resources.find(value => value.kind === "data-source"));
      source.id = "duplicate";
      state.semanticSpec.resources.push(source);
    }
  ];
  for (const mutate of mutations) {
    const envelope = JSON.parse(stored), state = decodeValue(envelope.payload);
    mutate(state);
    envelope.payload = encodeValue(state);
    assert.throws(() => deserializeProgram(JSON.stringify(envelope)));
  }
  assert.equal(serializeProgram(program), stored);
  assert.throws(() => createDataSourceResource({ id: "rows", prepared, options,
    dataset: program.semanticSpec.datasets[0], revision: -1 }), /non-negative/);
  assert.throws(() => createDataSourceResource({ id: "rows", prepared, dataset: program.semanticSpec.datasets[0],
    options: { ...options, baseURL: "https://other.test/" } }), /stored intent/);
  assert.throws(() => chart().createData({ id: "raw", values: [{ value: 1 }] })
    .editSemantic({ property: "dataset[derived].sourceReceipt", value: program.semanticSpec.datasets[0].sourceReceipt })
    .editSemantic({ property: "dataset[derived].source", value: "raw" }), /receipt/);
});

test("inline live intent cannot replace historical originals while retaining their proof", async () => {
  for (const source of [{ kind: "inline", values: [{ value: 1 }] },
    { kind: "inline", text: '[{"value":1}]', format: "json" }]) {
    const prepared = await prepareDataSource(source, { requestToken: "inline" });
    let program = addSnapshot(chart(), prepared, "rows", "rows");
    const resource = createDataSourceResource({ id: "rows", prepared,
      options: normalizeDataSourceOptions(source), dataset: program.semanticSpec.datasets[0] });
    program = program.editSemantic({ property: "resource[data-source:rows]", value: resource });
    const nextSource = Object.hasOwn(source, "values") ? { ...source, values: [{ value: 2 }] }
      : { ...source, text: '[{"value":2}]' };
    const forged = program._clone({ semanticSpec: { ...program.semanticSpec, resources: [{
      ...resource, options: normalizeDataSourceOptions(nextSource)
    }] } });
    assert.throws(() => validateDataSourceState(forged), /Inline source original/);
    assert.doesNotThrow(() => serializeProgram(program));
  }
});

test("inactive URL branches remain exact parameter consumers in stored sources", async () => {
  const source = { ...sourceURL, url: { version: 2, registry: "standard@1", root: {
    type: "if", condition: { type: "literal", value: true },
    then: { type: "parameter", id: "active" }, else: { type: "parameter", id: "inactive" }
  } } };
  const base = chart().createParameter({ id: "active", value: "https://example.test/active.csv" })
    .createParameter({ id: "inactive", value: "https://example.test/inactive.csv" });
  const parameterInputs = ["active", "inactive"].map(id => ({ kind: "parameter", id, revision: 0 }));
  const prepared = await prepareDataSource(source, { requestToken: "branches", parameterInputs,
    parameters: parameterEnvironment(base.semanticSpec.resources),
    load: async ({ url }) => {
      assert.equal(url, "https://example.test/active.csv");
      return { text: "value\n1\n", mimeType: "text/csv", encoding: "utf-8" };
    } });
  let program = addSnapshot(base, prepared, "rows", "rows");
  const resource = createDataSourceResource({ id: "rows", prepared,
    options: normalizeDataSourceOptions(source), dataset: program.semanticSpec.datasets[0] });
  program = program.editSemantic({ property: "resource[data-source:rows]", value: resource });
  assert.deepEqual(resource.inputs, parameterInputs);
  assert.doesNotThrow(() => deserializeProgram(serializeProgram(program)));
  assert.throws(() => program.removeParameter({ id: "inactive" }), code("resource-in-use"));
  const inactive = program.semanticSpec.resources.find(value => value.id === "inactive");
  const revised = program.editSemantic({ property: "resource[parameter:inactive]", value: {
    ...inactive, revision: 1, result: { value: "https://example.test/changed.csv" }
  } });
  assert.throws(() => validateDataSourceState(revised), code("stale-result"));
  assert.equal(program.semanticSpec.resources.find(value => value.id === "inactive").revision, 0);
});

test("facet adoption follows explicit references and never revives independent source bindings", async () => {
  const { program } = await liveURL();
  const missing = program._clone({ semanticSpec: { ...program.semanticSpec, resources: [] } });
  assert.equal(adoptSelectionResources(missing, program), missing);
  const selected = program.editSemantic({ property: "resource[persistent-selection:chosen]", value: {
    kind: "persistent-selection", id: "chosen", revision: 0, algorithmVersion: "1", ownership: { mode: "authored" },
    inputs: [{ kind: "data-source", id: "rows", revision: 0 }],
    options: { mode: "predicate", predicate: { field: "value", op: "gt", value: 1 } }, result: {}, provenance: { origin: "authored" }
  } });
  const adopted = adoptSelectionResources(missing, selected, {
    chosen: { resource: { kind: "persistent-selection", id: "chosen", revision: 0 } }
  });
  assert.deepEqual(new Map(adopted.semanticSpec.resources.map(value => [value.kind, value])),
    new Map(selected.semanticSpec.resources.map(value => [value.kind, value])));
  assert.equal(validateDataSourceState(adopted), adopted);
  assert.equal(adoptSelectionResources(program, adopted), program);
  const detached = detachDataSourceBindings(program, program.semanticSpec.datasets[0]);
  const historicalOnly = adoptSelectionResources(missing, detached);
  assert.equal(historicalOnly.semanticSpec.resources.length, 0);
  const facet = { ...chart(), compositionSpec: { type: "facet", children: ["cell"] }, children: { cell: program } };
  assert.deepEqual(collectParameterInputReferences(facet).map(value => [value.ownerKind, value.scope]), [["data-source", ["cell"]]]);
});

test("source key policy uses existing field-key validation", () => {
  const source = { kind: "inline", values: [] };
  assert.throws(() => normalizeDataSourceOptions(source, { keyField: "a", keyFields: ["b"] }));
  assert.throws(() => normalizeDataSourceOptions(source, { keyFields: ["a", "a"] }));
  assert.throws(() => normalizeDataSourceOptions(source, { keys: [] }));
  assert.deepEqual(normalizeDataSourceOptions(source, { keyFields: ["group", "time"] }).keyFields, ["group", "time"]);
});
