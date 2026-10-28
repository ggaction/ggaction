import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat, prepareDataUpdate } from "../../../src/index.js";
import { getMarkItems } from "../../../src/inspection.js";
import { deserializeProgram, serializeProgram } from "../../../src/persistence.js";

const field = name => ({ type: "field", name });
const literal = value => ({ type: "literal", value });
const parameter = { type: "parameter", id: "region" };
const binary = (op, left, right) => ({ type: "binary", op, left, right });
const expression = root => ({ version: 2, registry: "standard@1", root });
const multiplier = { type: "if", condition: binary("eq", parameter, literal("north")), then: literal(2), else: literal(3) };
const rows = [{ id: "a", x: 1, y: 2, group: "A" }, { id: "b", x: 2, y: 4, group: "B" }];
const revisedRows = [{ id: "a", x: 3, y: 5, group: "A" }, { id: "b", x: 7, y: 11, group: "B" }];
const response = values => ({ text: JSON.stringify(values), mimeType: "application/json", encoding: "utf-8" });
const dataset = (program, id) => program.semanticSpec.datasets.find(item => item.id === id);
const current = (program, family, id) => dataset(program, program.materializationConfigs.data[family][id].current);
const binding = (program, id = "raw") => program.semanticSpec.resources.find(item => item.kind === "data-source" && item.id === id);
const parameterState = program => program.semanticSpec.resources.find(item => item.kind === "parameter" && item.id === "region");
const operations = trace => [trace.op, ...trace.children.flatMap(operations)];
const source = id => ({ kind: "url", format: "json", url: expression({ type: "call", name: "concat", args: [
  literal(`https://example.test/${id}/`), parameter, literal(".json")
] }) });

async function addSource(program, id, values, keyed = true) {
  const prepared = await prepareDataUpdate(program, { kind: "create", id, source: source(id), ...(keyed ? { keyField: "id" } : {}) },
    { requestToken: `create-${id}`, load: async () => response(values) });
  return program.applyDataUpdate({ prepared, requestToken: `create-${id}` });
}

async function points(keyed = true) {
  let program = chart().createCanvas({ width: 360, height: 260, margin: 55 }).createParameter({ id: "region", value: "north" });
  program = await addSource(program, "raw", rows, keyed);
  return program.createComputedData({ id: "scaled", source: "raw", as: "scaledY", expression: expression(binary("multiply", field("y"), multiplier)) })
    .createScatterPlot({ id: "points", data: "scaled", x: "x", y: "scaledY" });
}

async function changeParameter(program, values = revisedRows, token = "south") {
  const prepared = await prepareDataUpdate(program, { kind: "parameter", target: "region", value: "south" },
    { requestToken: token, load: async () => response(values) });
  return program.applyDataUpdate({ prepared, requestToken: token });
}

test("multiple URL roots replay a shared computed and lookup diamond exactly once", async () => {
  let program = chart().createCanvas({ width: 360, height: 260, margin: 55 }).createParameter({ id: "region", value: "north" });
  program = await addSource(program, "left", rows.map(({ id, x }) => ({ id, x })));
  program = await addSource(program, "right", rows.map(({ id, y }) => ({ id, y })));
  program = program.createComputedData({ id: "scaledX", source: "left", as: "scaledX", expression: expression(binary("multiply", field("x"), multiplier)) })
    .createComputedData({ id: "scaledY", source: "right", as: "scaledY", expression: expression(binary("multiply", field("y"), multiplier)) })
    .createLookupData({ id: "joined", source: "scaledX", field: "id", lookup: { data: "scaledY", key: "id", fields: ["scaledY"] } })
    .createSummaryData({ id: "total", source: "joined", aggregates: [{ op: "sum", field: "scaledY", as: "total" }] })
    .createData({ id: "static", values: [{ value: 7 }] })
    .createComputedData({ id: "independent", source: "static", as: "same", expression: expression(field("value")) })
    .createScatterPlot({ id: "points", data: "joined", x: "scaledX", y: "scaledY" });
  const previous = program, saved = serializeProgram(program), independent = dataset(program, "independent"), loaded = [];
  const prepared = await prepareDataUpdate(program, { kind: "parameter", target: "region", value: "south" }, {
    requestToken: "changed", load: async ({ url }) => {
      loaded.push(url);
      return response(url.includes("/left/") ? revisedRows.map(({ id, x }) => ({ id, x })) : revisedRows.map(({ id, y }) => ({ id, y })));
    }
  });
  program = program.applyDataUpdate({ prepared, requestToken: "changed" });
  assert.equal(loaded.length, 2);
  assert.deepEqual(current(program, "lookup", "joined").values.map(row => [row.scaledX, row.scaledY]), [[9, 15], [21, 33]]);
  assert.deepEqual(current(program, "summary", "total").values, [{ total: 48 }]);
  assert.equal(current(program, "computed", "independent"), independent);
  const trace = operations(program.trace.children.at(-1));
  assert.equal(trace.filter(op => op === "materializeComputedData").length, 2);
  assert.equal(trace.filter(op => op === "materializeLookupData").length, 1);
  assert.equal(trace.filter(op => op === "materializeSummaryData").length, 1);
  assert.equal(trace.filter(op => op === "createData").length, 2);
  for (const id of ["left", "right"]) {
    assert.equal(binding(program, id).revision, 1);
    assert.equal(binding(program, id).inputs[0].revision, 1);
  }
  assert.notDeepEqual(program.graphicSpec, previous.graphicSpec);
  assert.equal(serializeProgram(previous), saved);
  assert.doesNotThrow(() => deserializeProgram(serializeProgram(program)));
});

test("manual rows detach one live binding while preserving receipts and computed parameter edits", async () => {
  const original = await points(), saved = serializeProgram(original);
  assert.throws(() => original.reviseData({ source: "raw", id: "bad", values: [{ id: "a", x: 1 }] }));
  assert.equal(serializeProgram(original), saved);
  const manual = original.reviseData({ source: "raw", id: "manual", values: revisedRows });
  assert.equal(binding(manual), undefined);
  assert.equal(dataset(manual, "raw").sourceReceipt.original.text, JSON.stringify(rows));
  assert.equal(dataset(manual, "manual").sourceReceipt, undefined);
  const edited = manual.editParameter({ target: "region", value: "south" });
  assert.deepEqual(current(edited, "computed", "scaled").values.map(row => row.scaledY), [15, 33]);
  let calls = 0;
  await assert.rejects(prepareDataUpdate(edited, { kind: "revise", target: "raw", id: "again" }, {
    requestToken: "missing", load: async () => { calls++; return response(rows); }
  }), /does not exist/);
  assert.equal(calls, 0);
  assert.doesNotThrow(() => deserializeProgram(serializeProgram(edited)));
});

test("prepared refresh preserves generated row selection identity through explicit row mapping", async () => {
  const original = (await points(false)).highlightMarks({ id: "chosen", target: "points",
    select: { rows: { data: "raw", indices: [1] } }, color: "red" });
  const saved = serializeProgram(original), values = [revisedRows[1], revisedRows[0]];
  const prepared = await prepareDataUpdate(original, { kind: "revise", target: "raw", id: "fresh", rowMap: [1, 0] }, {
    requestToken: "refresh", load: async () => response(values)
  });
  const revised = original.applyDataUpdate({ prepared, requestToken: "refresh" });
  const highlighted = getMarkItems(revised, { target: "points" }).filter(item => item.geometry.some(geometry => geometry.properties.fill === "red"));
  assert.equal(highlighted.length, 1);
  assert.equal(highlighted[0].fields.id, "b");
  assert.equal(highlighted[0].fields.scaledY, 22);
  assert.equal(dataset(revised, "fresh").rowKeys[0], dataset(original, "raw").rowKeys[1]);
  const removed = await prepareDataUpdate(original, { kind: "revise", target: "raw", id: "fresh", rowMap: [0, null] }, {
    requestToken: "lost", load: async () => response(values)
  });
  const withoutSelected = original.applyDataUpdate({ prepared: removed, requestToken: "lost" });
  assert.equal(getMarkItems(withoutSelected, { target: "points" }).filter(item => item.geometry.some(geometry => geometry.properties.fill === "red")).length, 0);
  assert.deepEqual(withoutSelected.semanticSpec.resources.find(resource => resource.kind === "persistent-selection").options.rowKeys,
    original.semanticSpec.resources.find(resource => resource.kind === "persistent-selection").options.rowKeys);
  assert.equal(dataset(withoutSelected, "fresh").rowKeys.includes(dataset(original, "raw").rowKeys[1]), false);
  assert.equal(serializeProgram(original), saved);
  assert.doesNotThrow(() => deserializeProgram(serializeProgram(revised)));
});

test("field-keyed refresh preserves selection on reorder, deletion and key reappearance", async () => {
  const original = (await points()).highlightMarks({ id: "chosen", target: "points",
    select: { rows: { data: "raw", indices: [1] } }, color: "red" });
  const revised = await changeParameter(original, [revisedRows[1], revisedRows[0]]);
  const highlighted = getMarkItems(revised, { target: "points" }).filter(item => item.geometry.some(geometry => geometry.properties.fill === "red"));
  assert.equal(highlighted.length, 1);
  assert.equal(highlighted[0].fields.id, "b");
  assert.equal(highlighted[0].fields.scaledY, 33);
  const saved = serializeProgram(original);
  const prepared = await prepareDataUpdate(original, { kind: "parameter", target: "region", value: "south" }, {
    requestToken: "lost", load: async () => response([revisedRows[0]])
  });
  const removed = original.applyDataUpdate({ prepared, requestToken: "lost" });
  assert.equal(getMarkItems(removed, { target: "points" }).filter(item => item.geometry.some(geometry => geometry.properties.fill === "red")).length, 0);
  const returning = await prepareDataUpdate(removed, { kind: "revise", target: "raw", id: "returned" }, {
    requestToken: "return", load: async () => response(revisedRows)
  });
  const returned = removed.applyDataUpdate({ prepared: returning, requestToken: "return" });
  const restored = deserializeProgram(serializeProgram(returned));
  const selected = getMarkItems(restored, { target: "points" }).filter(item => item.geometry.some(geometry => geometry.properties.fill === "red"));
  assert.equal(selected.length, 1);
  assert.equal(selected[0].fields.id, "b");
  assert.equal(selected[0].fields.scaledY, 33);
  assert.equal(serializeProgram(original), saved);
});

test("facet parameter refresh adopts full raw source bindings into regenerated children", async () => {
  const original = (await points()).facet({ id: "panels", field: "group" }), saved = serializeProgram(original);
  const revised = await changeParameter(deserializeProgram(saved));
  assert.deepEqual(Object.values(revised.children).map(child => getMarkItems(child, { target: "points" })[0].fields.scaledY), [15, 33]);
  assert.equal(parameterState(revised).revision, 1);
  for (const child of Object.values(revised.children)) {
    assert.equal(parameterState(child).revision, 1);
    const source = binding(child);
    assert.equal(source.revision, 1);
    assert.deepEqual(source.result.data, binding(revised).result.data);
    assert.deepEqual(dataset(child, source.result.data.id).values, revisedRows);
  }
  assert.equal(serializeProgram(original), saved);
  assert.doesNotThrow(() => deserializeProgram(serializeProgram(revised)));
});

test("repeat refresh preserves selected computed fields through parameter and source revisions", async () => {
  const original = (await points()).repeatCharts({ id: "metrics", target: "points", channel: "y", fields: ["y", "scaledY"] });
  const saved = serializeProgram(original);
  const revised = await changeParameter(original);
  assert.deepEqual(revised.compositionSpec.facet.repeat.fields, ["y", "scaledY"]);
  assert.deepEqual(Object.values(revised.children).map(child => child.resolvedScales.y.domain), [[5, 11], [15, 33]]);
  const restored = deserializeProgram(serializeProgram(revised));
  const prepared = await prepareDataUpdate(restored, { kind: "revise", target: "raw", id: "fresh" }, {
    requestToken: "refresh", load: async () => response(revisedRows.map((row, index) => ({ ...row, y: index === 0 ? 11 : 13 })))
  });
  const refreshed = restored.applyDataUpdate({ prepared, requestToken: "refresh" });
  assert.deepEqual(Object.values(refreshed.children).map(child => child.resolvedScales.y.domain), [[11, 13], [33, 39]]);
  for (const child of Object.values(refreshed.children)) assert.equal(binding(child).result.data.id, "fresh");
  assert.equal(serializeProgram(original), saved);
  assert.doesNotThrow(() => deserializeProgram(serializeProgram(refreshed)));
});

test("concat requires the exact child receiver and preserves same-named sibling sources", async () => {
  const left = await points(), right = await points();
  const original = hconcat({ programs: [{ id: "left", program: left }, { id: "right", program: right }] });
  let calls = 0;
  await assert.rejects(prepareDataUpdate(original, { kind: "parameter", target: "region", value: "south" }, {
    requestToken: "parent", load: async () => { calls++; return response(revisedRows); }
  }), /child scope/);
  assert.equal(calls, 0);
  const prepared = await prepareDataUpdate(left, { kind: "parameter", target: "region", value: "south" }, {
    requestToken: "left", load: async () => response(revisedRows)
  });
  assert.throws(() => original.applyDataUpdate({ prepared, requestToken: "left" }), /stale/);
  assert.throws(() => right.applyDataUpdate({ prepared, requestToken: "left" }), /stale/);
  const revisedLeft = left.applyDataUpdate({ prepared, requestToken: "left" });
  const revised = original.replaceCompositionChild({ target: "left", program: revisedLeft });
  assert.equal(revised.children.right, right);
  assert.equal(parameterState(revised.children.left).result.value, "south");
  assert.equal(parameterState(revised.children.right).result.value, "north");
  assert.equal(binding(revised.children.right).revision, 0);
  assert.notDeepEqual(revised.graphicSpec, original.graphicSpec);
  assert.doesNotThrow(() => deserializeProgram(serializeProgram(revised)));
});
