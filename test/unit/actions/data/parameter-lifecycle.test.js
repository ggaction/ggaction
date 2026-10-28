import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chart, hconcat } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { getMarkItems } from "../../../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { encodeValue, decodeValue } from "../../../../src/persistence/codec.js";

const field = name => ({ type: "field", name });
const parameter = id => ({ type: "parameter", id });
const literal = value => ({ type: "literal", value });
const binary = (op, left, right) => ({ type: "binary", op, left, right });
const expression = root => ({ version: 2, registry: "standard@1", root });
const get = (program, id) => program.semanticSpec.datasets.find(dataset => dataset.id === id);
const current = (program, family, id) => get(program, program.materializationConfigs.data[family][id].current);
const parameterState = (program, id = "factor") => program.semanticSpec.resources.find(resource => resource.kind === "parameter" && resource.id === id);
const rows = [{ id: "a", x: 1, y: 2, group: "A" }, { id: "b", x: 2, y: 4, group: "B" }];
function base(factory = chart) {
  return factory().createCanvas({ width: 360, height: 260, margin: 60 })
    .createData({ id: "raw", values: rows }).createParameter({ id: "factor", value: 2 });
}
function computed(factory = chart) {
  return base(factory).createComputedData({ id: "scaled", as: "scaledY",
    expression: expression(binary("multiply", field("y"), parameter("factor"))) });
}
function scatter() {
  return computed().createScatterPlot({ id: "points", data: "scaled", x: "x", y: "scaledY" });
}
function traceOperations(trace) {
  return [trace.op, ...(trace.children ?? []).flatMap(traceOperations)];
}

test("parameter edits revise data, schema provenance, guides, graphics, and stable row selections", () => {
  const original = scatter().highlightMarks({ id: "chosen", target: "points",
    select: { rows: { data: "raw", indices: [1] } }, color: "red" });
  const saved = serializeProgram(original);
  const revised = deserializeProgram(saved).editParameter({ target: "factor", value: 3 });
  const dataset = current(revised, "computed", "scaled");
  assert.deepEqual(dataset.values.map(row => row.scaledY), [6, 12]);
  assert.equal(parameterState(revised).revision, 1);
  assert.deepEqual(dataset.transform[0].parameterInputs, [{ kind: "parameter", id: "factor", revision: 1 }]);
  assert.deepEqual(dataset.rowKeys, get(original, "scaled").rowKeys);
  assert.equal(revised.semanticSpec.layers[0].data, dataset.id);
  assert.notDeepEqual(revised.resolvedScales.y.domain, original.resolvedScales.y.domain);
  assert.notDeepEqual(revised.graphicSpec, original.graphicSpec);
  const red = getMarkItems(revised, { target: "points" }).filter(item => item.geometry.some(geometry => geometry.properties.fill === "red"));
  assert.equal(red.length, 1);
  assert.equal(red[0].fields.id, "b");
  assert.equal(red[0].fields.scaledY, 12);
  assert.equal(serializeProgram(original), saved);
  assert.equal(serializeProgram(deserializeProgram(serializeProgram(revised))), serializeProgram(revised));
});

test("parameter revisions traverse both roots of a lookup diamond exactly once", () => {
  const original = computed()
    .createComputedData({ id: "offset", source: "raw", as: "offsetX", expression: expression(binary("add", field("x"), parameter("factor"))) })
    .createLookupData({ id: "joined", source: "offset", field: "id", lookup: { data: "scaled", key: "id", fields: ["scaledY"] } })
    .createSummaryData({ id: "total", aggregates: [{ op: "sum", field: "scaledY", as: "total" }] })
    .createComputedData({ id: "independent", source: "raw", as: "same", expression: expression(field("x")) });
  const independent = get(original, "independent");
  const revised = original.editParameter({ target: "factor", value: 3 });
  assert.deepEqual(current(revised, "lookup", "joined").values.map(row => [row.offsetX, row.scaledY]), [[4, 6], [5, 12]]);
  assert.deepEqual(current(revised, "summary", "total").values, [{ total: 18 }]);
  assert.equal(current(revised, "computed", "independent"), independent);
  const operations = traceOperations(revised.trace.children.at(-1));
  assert.equal(operations.filter(op => op === "materializeLookupData").length, 1);
  assert.equal(operations.filter(op => op === "materializeComputedData").length, 2);
  assert.equal(operations.filter(op => op === "materializeSummaryData").length, 1);
});

test("parameter no-op edits retain resource and dataset identity but append an authoring trace", () => {
  const original = computed();
  const same = original.editParameter({ target: "factor", value: 2 });
  assert.equal(parameterState(same), parameterState(original));
  assert.equal(current(same, "computed", "scaled"), get(original, "scaled"));
  assert.equal(same.trace.children.at(-1).op, "editParameter");
  assert.deepEqual(same.trace.children.at(-1).children, []);
  const negative = chart().createParameter({ id: "p", value: -0 });
  assert.equal(parameterState(negative.editParameter({ target: "p", value: 0 }), "p").revision, 1);
});

test("parameters in inactive branches still receive a new exact revision without changing output", () => {
  const original = base().createComputedData({ id: "fixed", as: "v", expression: expression({ type: "if", condition: literal(true), then: literal(7), else: parameter("factor") }) });
  const revised = original.editParameter({ target: "factor", value: 9 });
  const dataset = current(revised, "computed", "fixed");
  assert.deepEqual(dataset.values.map(row => row.v), [7, 7]);
  assert.notEqual(dataset.id, "fixed");
  assert.equal(dataset.transform[0].parameterInputs[0].revision, 1);
});

test("editing one of several parameters updates only its own exact input and can be repeated", () => {
  const original = base().createParameter({ id: "offset", value: 10 })
    .createComputedData({ id: "combined", as: "v", expression: expression(binary("add",
      binary("multiply", field("y"), parameter("factor")), parameter("offset"))) });
  const once = original.editParameter({ target: "factor", value: 3 });
  assert.deepEqual(current(once, "computed", "combined").transform[0].parameterInputs, [
    { kind: "parameter", id: "factor", revision: 1 }, { kind: "parameter", id: "offset", revision: 0 }
  ]);
  const twice = once.editParameter({ target: "offset", value: 20 });
  assert.deepEqual(current(twice, "computed", "combined").values.map(row => row.v), [26, 32]);
  assert.deepEqual(current(twice, "computed", "combined").transform[0].parameterInputs, [
    { kind: "parameter", id: "factor", revision: 1 }, { kind: "parameter", id: "offset", revision: 1 }
  ]);
  assert.equal(parameterState(twice), parameterState(once));
  assert.doesNotThrow(() => deserializeProgram(serializeProgram(twice)));
});

test("primitive parameter edits retain stale computed bindings until an explicit domain rematerialization", () => {
  const original = computed(), resource = parameterState(original);
  const changed = original.editSemantic({ property: "resource[parameter:factor]", value: {
    ...resource, revision: 1, result: { value: 3 }
  } });
  assert.equal(get(changed, "scaled"), get(original, "scaled"));
  assert.equal(get(changed, "scaled").transform[0].parameterInputs[0].revision, 0);
  assert.throws(() => serializeProgram(changed), /stale/);
});

test("parameter deletion is restricted until its computed dependency is removed", () => {
  const original = computed();
  assert.throws(() => original.removeParameter({ id: "factor" }), /referenced/);
  assert.throws(() => original.editSemantic({ property: "resource[parameter:factor]", remove: true }), /referenced/);
  const detached = original.editComputedData({ target: "scaled", expression: expression(literal(5)) });
  const removed = detached.removeParameter({ id: "factor" });
  assert.equal(parameterState(removed), undefined);
  assert.equal(parameterState(removed.createParameter({ id: "factor", value: "new" })).revision, 0);
});

test("rejected parameter edits preserve every source state and trace", () => {
  const original = scatter(), saved = serializeProgram(original);
  for (const options of [{ target: "factor", value: "wrong" }, { target: "factor", value: null }, { target: "factor", value: undefined },
    { target: "factor", value: Infinity }, { target: "missing", value: 3 }, { target: "factor", value: 3, dependents: "reject" }]) {
    assert.throws(() => original.editParameter(options));
    assert.equal(serializeProgram(original), saved);
  }
});

test("a failure during dependent evaluation rejects the parameter candidate and all calculated revisions", () => {
  const original = chart().createData({ id: "raw", values: rows })
    .createParameter({ id: "condition", value: true, nullable: true })
    .createComputedData({ id: "conditional", as: "choice", expression: expression({
      type: "if", condition: parameter("condition"), then: field("x"), else: field("y")
    }) });
  const saved = serializeProgram(original), trace = original.trace;
  assert.throws(() => original.editParameter({ target: "condition", value: null }), /boolean/);
  assert.equal(serializeProgram(original), saved);
  assert.equal(original.trace, trace);
});

test("safe-integer revision overflow is rejected while a same-value edit remains a no-op", () => {
  const original = chart().createParameter({ id: "p", value: 1 });
  const resource = { ...parameterState(original, "p"), revision: Number.MAX_SAFE_INTEGER };
  const restored = deserializeProgram(serializeProgram(original._clone({
    semanticSpec: { ...original.semanticSpec, resources: [resource] }
  })));
  const saved = serializeProgram(restored);
  assert.throws(() => restored.editParameter({ target: "p", value: 2 }), /safe integer/);
  assert.equal(parameterState(restored.editParameter({ target: "p", value: 1 }), "p").revision, Number.MAX_SAFE_INTEGER);
  assert.equal(serializeProgram(restored), saved);
});

test("concat parameter edits require explicit child scope and preserve same-named sibling state", () => {
  const left = scatter(), right = scatter();
  const original = hconcat({ programs: [{ id: "left", program: left }, { id: "right", program: right }] });
  assert.throws(() => original.editParameter({ target: "factor", value: 3 }), /scope/);
  const revised = original.editParameter({ target: { childPath: ["left"], id: "factor" }, value: 3 });
  assert.deepEqual(current(revised.children.left, "computed", "scaled").values.map(row => row.scaledY), [6, 12]);
  assert.equal(revised.children.right, right);
  assert.equal(parameterState(right).result.value, 2);
  assert.notDeepEqual(revised.graphicSpec, original.graphicSpec);
  assert.doesNotThrow(() => deserializeProgram(serializeProgram(revised)));
});

test("facet parameter edits regenerate every partition, shared domain, and restored child snapshot", () => {
  const original = scatter().facet({ id: "panels", field: "group" });
  const revised = deserializeProgram(serializeProgram(original)).editParameter({ target: "factor", value: 3 });
  assert.equal(parameterState(revised).result.value, 3);
  assert.deepEqual(Object.values(revised.children).map(child => getMarkItems(child, { target: "points" })[0].fields.scaledY), [6, 12]);
  for (const child of Object.values(revised.children)) {
    assert.equal(parameterState(child).revision, 1);
    assert.deepEqual(child.resolvedScales.y.domain, revised.children[revised.compositionSpec.children[0]].resolvedScales.y.domain);
  }
  assert.equal(parameterState(original).result.value, 2);
  assert.doesNotThrow(() => deserializeProgram(serializeProgram(revised)));
});

test("repeat parameter edits preserve field choices and refresh retained computed snapshots", () => {
  const original = computed().createScatterPlot({ id: "points", data: "raw", x: "x", y: "y" })
    .repeatCharts({ id: "metrics", target: "points", channel: "y", fields: ["x", "y"] });
  const revised = original.editParameter({ target: "factor", value: 3 });
  assert.deepEqual(revised.compositionSpec.facet.repeat.fields, ["x", "y"]);
  assert.deepEqual(Object.values(revised.children).map(child => child.resolvedScales.y.domain), [[1, 2], [2, 4]]);
  for (const child of Object.values(revised.children)) {
    assert.equal(parameterState(child).revision, 1);
    assert.deepEqual(current(child, "computed", "scaled").values.map(row => row.scaledY), [6, 12]);
  }
  assert.doesNotThrow(() => deserializeProgram(serializeProgram(revised)));
});

test("repeat charts rematerialize parameter-derived columns after parameter and source revisions", () => {
  const original = scatter().repeatCharts({ id: "metrics", target: "points", channel: "y", fields: ["y", "scaledY"] });
  const revised = original.editParameter({ target: "factor", value: 3 });
  assert.deepEqual(revised.compositionSpec.facet.repeat.fields, ["y", "scaledY"]);
  assert.deepEqual(Object.values(revised.children).map(child => child.resolvedScales.y.domain), [[2, 4], [6, 12]]);
  const updated = deserializeProgram(serializeProgram(revised)).reviseData({ source: "raw", id: "rawV2",
    values: rows.map((row, index) => ({ ...row, y: index === 0 ? 5 : 7 })), rowMap: [0, 1] });
  assert.deepEqual(Object.values(updated.children).map(child => child.resolvedScales.y.domain), [[5, 7], [15, 21]]);
  assert.doesNotThrow(() => deserializeProgram(serializeProgram(updated)));
});

test("Basic creates typed parameters and computed data that restore into editable Full programs", () => {
  const basic = computed(basicChart);
  assert.equal(typeof basic.editParameter, "undefined");
  assert.equal(typeof basic.removeParameter, "undefined");
  const restored = deserializeProgram(serializeProgram(basic));
  assert.deepEqual(current(restored.editParameter({ target: "factor", value: 3 }), "computed", "scaled").values.map(row => row.scaledY), [6, 12]);
});

test("editable restoration rejects stale, missing, duplicated, and forged parameter bindings", () => {
  const saved = serializeProgram(computed());
  for (const mutate of [
    state => { state.semanticSpec.resources[0].revision = 1; },
    state => { state.semanticSpec.resources = []; },
    state => { state.semanticSpec.datasets[1].transform[0].parameterInputs.push({ kind: "parameter", id: "factor", revision: 0 }); },
    state => { state.semanticSpec.datasets[1].transform[0].parameterInputs[0].id = "unknown"; },
    state => { state.semanticSpec.datasets[1].transform[0].parameterInputs = []; },
    state => { state.materializationConfigs.calculations.datasets.scaled.parameterInputs[0].revision = 9; }
  ]) {
    const envelope = JSON.parse(saved), state = decodeValue(envelope.payload);
    mutate(state); envelope.payload = encodeValue(state);
    assert.throws(() => deserializeProgram(JSON.stringify(envelope)));
  }
});

test("a fresh process restores, edits parameters, revises source data, and serializes usable state", () => {
  const persistenceURL = new URL("../../../../src/persistence.js", import.meta.url).href;
  const script = `
    import { deserializeProgram, serializeProgram } from ${JSON.stringify(persistenceURL)};
    import { readFileSync } from "node:fs";
    const restored = deserializeProgram(readFileSync(0, "utf8"));
    const changed = restored.editParameter({ target: "factor", value: 3 });
    const revised = changed.reviseData({ source: "raw", id: "rawV2",
      values: [{id:"a",x:1,y:5,group:"A"},{id:"b",x:2,y:7,group:"B"}], rowMap: [0, 1] });
    process.stdout.write(serializeProgram(revised));
  `;
  const output = execFileSync(process.execPath, ["--input-type=module", "-e", script], {
    input: serializeProgram(scatter()), encoding: "utf8", timeout: 30_000
  });
  const result = deserializeProgram(output);
  assert.deepEqual(current(result, "computed", "scaled").values.map(row => row.scaledY), [15, 21]);
  assert.equal(parameterState(result).revision, 1);
  assert.equal(serializeProgram(result), output);
});
