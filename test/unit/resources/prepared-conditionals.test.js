import assert from "node:assert/strict";
import test from "node:test";
import { chart, prepareDataUpdate } from "../../../src/index.js";
import { deserializeProgram, serializeProgram } from "../../../src/persistence.js";
import { getMarkItems } from "../../../src/inspection.js";

const field = name => ({ type: "field", name });
const literal = value => ({ type: "literal", value });
const parameter = { type: "parameter", id: "region" };
const binary = (op, left, right) => ({ type: "binary", op, left, right });
const expression = root => ({ version: 2, registry: "standard@1", root });
const north = binary("eq", parameter, literal("north"));
const response = values => ({ text: JSON.stringify(values), mimeType: "application/json", encoding: "utf-8" });
const rows = [{ id: "a", x: 1, y: 2 }, { id: "b", x: 3, y: 4 }];
const revisedRows = [{ id: "a", x: 2, y: 5 }, { id: "b", x: 4, y: 11 }];
const current = (program, family, id) => program.semanticSpec.datasets.find(item => item.id === program.materializationConfigs.data[family][id].current);
const operations = trace => [trace.op, ...trace.children.flatMap(operations)];

async function sourceProgram() {
  const program = chart().createCanvas({ width: 360, height: 280, margin: 60 })
    .createParameter({ id: "region", value: "north" });
  const prepared = await prepareDataUpdate(program, { kind: "create", id: "raw", keyField: "id",
    source: { kind: "url", format: "json", url: expression({ type: "call", name: "concat", args: [literal("https://example.test/"), parameter, literal(".json")] }) }
  }, { requestToken: "create", load: async () => response(rows) });
  return program.applyDataUpdate({ prepared, requestToken: "create" });
}

async function parameterUpdate(program, values = revisedRows) {
  const loads = [];
  const prepared = await prepareDataUpdate(program, { kind: "parameter", target: "region", value: "south" }, {
    requestToken: "change", load: async ({ url }) => { loads.push(url); return response(values); }
  });
  assert.deepEqual(loads, ["https://example.test/south.json"]);
  return program.applyDataUpdate({ prepared, requestToken: "change" });
}

test("prepared parameter edits replay a raw/filter/computed diamond once and refresh conditional marks", async () => {
  const original = (await sourceProgram())
    .filterData({ id: "selected", source: "raw", where: expression(binary("gte", field("x"), { type: "if", condition: north, then: literal(1), else: literal(3) })) })
    .createComputedData({ id: "scaled", source: "raw", as: "scaledY", expression: expression(binary("multiply", field("y"), { type: "if", condition: north, then: literal(2), else: literal(3) })) })
    .createLookupData({ id: "joined", source: "selected", field: "id", lookup: { data: "scaled", key: "id", fields: ["scaledY"] } })
    .createScatterPlot({ id: "points", data: "joined", x: "x", y: "scaledY" })
    .encodeOpacity({ target: "points", conditions: [{ when: expression(north), value: { value: 1 } }], otherwise: { value: 0 } })
    .createData({ id: "static", values: [{ x: 5, y: 6 }] })
    .createScatterPlot({ id: "unchangedData", data: "static", x: { field: "x", scale: { id: "staticX" } }, y: { field: "y", scale: { id: "y" } }, guides: false })
    .encodeOpacity({ target: "unchangedData", conditions: [{ when: expression(north), value: { value: 0.8 } }], otherwise: { value: 0.2 } });
  const saved = serializeProgram(original), revised = await parameterUpdate(original);
  assert.deepEqual(current(revised, "filter", "selected").values, [revisedRows[1]]);
  assert.deepEqual(current(revised, "lookup", "joined").values, [{ ...revisedRows[1], scaledY: 33 }]);
  assert.deepEqual(getMarkItems(revised, { target: "points" }).map(item => item.geometry[0].properties.opacity), [0]);
  assert.deepEqual(getMarkItems(revised, { target: "unchangedData" }).map(item => item.geometry[0].properties.opacity), [0.2]);
  assert.equal(revised.semanticSpec.layers.find(layer => layer.id === "unchangedData").data, "static");
  const trace = operations(revised.trace.children.at(-1));
  for (const op of ["createData", "materializeFilteredData", "materializeComputedData", "materializeLookupData"]) assert.equal(trace.filter(value => value === op).length, 1, op);
  assert.equal(serializeProgram(original), saved);
  assert.equal(serializeProgram(deserializeProgram(serializeProgram(revised))), serializeProgram(revised));
});

test("prepared raw refresh reevaluates branch fields and preserves exact selection dependencies", async () => {
  const original = (await sourceProgram()).createScatterPlot({ id: "points", data: "raw", x: "x", y: "y" })
    .selectMarks({ id: "chosen", target: "points", field: "id", op: "eq", value: "b" })
    .encodeOpacity({ target: "points", conditions: [{ when: { selection: "chosen" }, value: { field: "y", scale: { domain: [0, 20], range: [0, 1] } } }], otherwise: { value: 0 } });
  const saved = serializeProgram(original), restored = deserializeProgram(saved);
  const prepared = await prepareDataUpdate(restored, { kind: "revise", target: "raw", id: "fresh" }, { requestToken: "refresh", load: async () => response([...revisedRows].reverse()) });
  const revised = restored.applyDataUpdate({ prepared, requestToken: "refresh" });
  assert.deepEqual(getMarkItems(revised, { target: "points" }).map(item => [item.fields.id, item.geometry[0].properties.opacity]), [["b", 0.55], ["a", 0]]);
  assert.equal(serializeProgram(original), saved);
  assert.doesNotThrow(() => deserializeProgram(serializeProgram(revised)));
  assert.throws(() => revised.removeMarkSelection({ selection: "chosen" }), /referenced/);
});

test("prepared invalid inactive branches and empty inferred domains fail without changing old state", async () => {
  const original = (await sourceProgram()).filterData({ id: "selected", source: "raw", where: expression(binary("gte", field("x"), literal(3))) })
    .createScatterPlot({ id: "points", data: "selected", x: "x", y: "y" })
    .encodeOpacity({ target: "points", conditions: [{ when: expression(literal(false)), value: { field: "y" } }], otherwise: { value: 1 } });
  const saved = serializeProgram(original), trace = original.trace;
  await assert.rejects(parameterUpdate(original, [{ id: "a", x: 1, y: 5 }]), /domain/i);
  await assert.rejects(parameterUpdate(original, [{ id: "a", x: 4 }]), /field|schema/i);
  assert.equal(serializeProgram(original), saved);
  assert.equal(original.trace, trace);
});

test("prepared facet and repeat refresh retain current source bindings with conditional exact refs", async () => {
  const unit = (await sourceProgram()).createScatterPlot({ id: "points", data: "raw", x: "x", y: "y" })
    .selectMarks({ id: "chosen", target: "points", field: "id", op: "eq", value: "b" })
    .encodeOpacity({ target: "points", conditions: [
      { when: expression(north), value: { value: 1 } },
      { when: { selection: "chosen" }, value: { value: 0.5 } }
    ], otherwise: { value: 0 } });
  for (const original of [unit.facet({ id: "panels", field: "id" }),
    unit.repeatCharts({ id: "metrics", target: "points", channel: "y", fields: ["x", "y"] })]) {
    const saved = serializeProgram(original);
    const revised = await parameterUpdate(deserializeProgram(saved));
    const parentSource = revised.semanticSpec.resources.find(resource => resource.kind === "data-source");
    assert.equal(parentSource.revision, 1);
    for (const child of Object.values(revised.children)) {
      const source = child.semanticSpec.resources.find(resource => resource.kind === "data-source");
      assert.deepEqual(source.result.data, parentSource.result.data);
      assert.equal(source.revision, 1);
      assert.equal(child.semanticSpec.layers.find(layer => layer.id === "points").conditionals.opacity.parameterInputs[0].revision, 1);
      for (const item of getMarkItems(child, { target: "points" })) assert.equal(item.geometry[0].properties.opacity, item.fields.id === "b" ? 0.5 : 0);
    }
    assert.equal(serializeProgram(original), saved);
    assert.doesNotThrow(() => deserializeProgram(serializeProgram(revised)));
  }
});

test("prepared parameter filter and computed revisions update positional conditions and retained guides", async () => {
  const original = (await sourceProgram())
    .filterData({ id: "selected", source: "raw", where: expression(binary("gte", field("x"), { type: "if", condition: north, then: literal(1), else: literal(3) })) })
    .createComputedData({ id: "scaled", source: "raw", as: "scaledY", expression: expression(binary("multiply", field("y"), { type: "if", condition: north, then: literal(2), else: literal(3) })) })
    .createLookupData({ id: "joined", source: "selected", field: "id", lookup: { data: "scaled", key: "id", fields: ["scaledY"] } })
    .createScatterPlot({ id: "points", data: "joined", x: "x", y: { field: "scaledY", scale: { id: "measure", domain: [0, 40] } }, guides: false })
    .encodeY({ target: "points", conditions: [{ when: expression(north), value: { field: "scaledY", scale: { id: "measure", domain: [0, 40] } } }], otherwise: { field: "x", scale: { id: "measure", domain: [0, 40] } } })
    .createAxes({ x: { title: false }, y: false });
  const saved = serializeProgram(original), revised = await parameterUpdate(deserializeProgram(saved));
  assert.deepEqual(getMarkItems(revised, { target: "points" }).map(item => item.channels.y), [4]);
  assert.equal(revised.graphicSpec.objects.points.items[0].properties.y, 204);
  assert.notDeepEqual(revised.graphicSpec.objects.xAxisLabels, original.graphicSpec.objects.xAxisLabels);
  assert.equal(revised.semanticSpec.layers[0].conditionals.y.parameterInputs[0].revision, 1);
  const trace = operations(revised.trace.children.at(-1));
  for (const op of ["createData", "materializeFilteredData", "materializeComputedData", "materializeLookupData"]) assert.equal(trace.filter(value => value === op).length, 1, op);
  assert.equal(serializeProgram(original), saved);
});

test("prepared facet and repeat retain positional conditional references through source refresh", async () => {
  const binding = { field: "x", scale: { id: "x", domain: [0, 10] } };
  const unit = (await sourceProgram()).createScatterPlot({ id: "points", data: "raw", x: binding, y: "y", guides: false })
    .encodeX({ target: "points", conditions: [{ when: expression(north), value: binding }], otherwise: { datum: 0, scale: { id: "x", domain: [0, 10] } } });
  for (const original of [unit.facet({ id: "panels", field: "id" }), unit.repeatCharts({ id: "metrics", target: "points", channel: "y", fields: ["x", "y"] })]) {
    const saved = serializeProgram(original), revised = await parameterUpdate(deserializeProgram(saved));
    for (const child of Object.values(revised.children)) {
      const layer = child.semanticSpec.layers.find(layer => layer.id === "points");
      assert.equal(layer.conditionals.x.parameterInputs[0].revision, 1);
      assert.deepEqual(getMarkItems(child, { target: "points" }).map(item => item.channels.x), Array(child.graphicSpec.objects.points.items.length).fill(0));
    }
    assert.equal(serializeProgram(original), saved);
  }
});
