import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";

const rows = () => [
  { x: 1, y: 2, group: "A", "": { cell: [1, 2] }, " ": "first" },
  { x: 2, y: 3, group: "B", "": { cell: [3] }, " ": "second" }
];
const dataset = (program, id) => program.semanticSpec.datasets.find(item => item.id === id);
const field = (data, name) => data.schema.fields.find(item => item.name === name);
const pointChart = (values, factory = chart) => factory()
  .createCanvas({ width: 320, height: 240, margin: 40 })
  .createData({ id: "source", values })
  .createScatterPlot({ x: "x", y: "y", guides: false });

test("inferred raw keys preserve empty and whitespace names without changing input ownership", () => {
  const input = rows(), program = pointChart(input), stored = dataset(program, "source");
  assert.deepEqual(stored.values, input);
  assert.equal(field(stored, "").storageType, "object");
  assert.equal(field(stored, " ").storageType, "string");
  assert.equal(stored.schema.version, 1);
  assert.equal(field(stored, "").lineage, undefined);
  input[0][""].cell.push(9);
  assert.deepEqual(stored.values[0][""], { cell: [1, 2] });
  assert.equal(Object.isFrozen(input[0]), false);
  assert.equal(Object.isFrozen(stored.values[0][""].cell), true);
});

test("declared empty names retain nullable, optional and empty-data rules", () => {
  const schema = { fields: [{ name: "", storageType: "string", nullable: true, optional: true }] };
  for (const values of [[], [{ "": "cell" }], [{ "": null }, {}]]) {
    const program = chart().createData({ values, schema });
    assert.deepEqual(dataset(program, "data").values, values);
    assert.deepEqual(field(dataset(program, "data"), ""), {
      name: "", storageType: "string", nullable: true, optional: true
    });
  }
  for (const [values, declared, error] of [
    [[{ "": "cell" }], { fields: [] }, /undeclared field/],
    [[{ "": 1 }], schema, /string values/],
    [[{ "": null }], { fields: [{ name: "", storageType: "string" }] }, /cannot be null/],
    [[{}], { fields: [{ name: "", storageType: "string" }] }, /requires field/],
    [[], { fields: [{ name: "", storageType: "string" }, { name: "", storageType: "number" }] }, /unique/]
  ]) assert.throws(() => chart().createData({ values, schema: declared }), error);
});

test("field references, generated fields, lineage inputs and resource IDs remain nonempty", () => {
  const source = chart().createData({ id: "source", values: rows() });
  const before = JSON.stringify(source);
  for (const action of [
    () => source.createPointMark().encodeX({ field: "" }),
    () => source.filterData({ id: "filtered", field: "", oneOf: [1] }),
    () => source.createComputedData({ id: "computed", as: "", expression: { constant: 1 } }),
    () => source.createComputedData({ id: "computed", as: "n", expression: { field: "" } }),
    () => source.createSummaryData({ id: "summary", aggregates: [{ op: "sum", field: "", as: "sum" }] }),
    () => source.createData({ id: "", values: [] }),
    () => source.reviseData({ source: "source", id: "", values: rows() })
  ]) assert.throws(action);
  assert.equal(JSON.stringify(source), before);
});

test("row-preserving transforms retain unnamed cells and never invent empty-field lineage", () => {
  const source = chart().createData({ id: "source", values: rows() });
  const result = source
    .filterData({ id: "filtered", field: "x", range: { min: 1 } })
    .createSortedData({ id: "ordered", sortBy: [{ field: "x", order: "descending" }] })
    .createComputedData({ id: "computed", as: "copy", expression: { field: "y" } })
    .createWindowData({ id: "ranked", operations: [{ op: "rowNumber", as: "rank" }] });
  for (const id of ["filtered", "ordered", "computed", "ranked"]) {
    const data = dataset(result, id);
    assert.equal(data.values.length, 2);
    assert.deepEqual(data.values.map(row => row[""]).sort((a,b) => a.cell[0]-b.cell[0]), rows().map(row => row[""]));
    assert.equal(field(data, "").lineage, undefined);
    assert.equal(field(data, " ").storageType, "string");
  }
});

test("projection transforms preserve their established column policy", () => {
  const source = chart().createData({ id: "source", values: rows() });
  const summary = source.createSummaryData({ id: "summary", aggregates: [{ op: "sum", field: "y", as: "total" }] });
  assert.equal(field(dataset(summary, "summary"), ""), undefined);
  assert.deepEqual(dataset(summary, "summary").values, [{ total: 5 }]);
  const folded = source.createFoldData({ id: "folded", fields: ["x", "y"] });
  assert.equal(dataset(folded, "folded").values.length, 4);
  assert.deepEqual(dataset(folded, "folded").values[0][""], rows()[0][""]);
  assert.equal(field(dataset(folded, "folded"), "").lineage, undefined);
});

test("revision preserves unused unnamed cells and replays dependent charts atomically", () => {
  const source = pointChart(rows()), before = serializeProgram(source), input = rows();
  input[0].y = 7; input[0][""] = "replacement";
  const revised = source.reviseData({ source: "source", id: "revision", values: input });
  assert.deepEqual(dataset(revised, "revision").values, input);
  assert.equal(field(dataset(revised, "revision"), "").storageType, "mixed");
  assert.equal(revised.semanticSpec.layers[0].data, "revision");
  assert.equal(serializeProgram(source), before);
  assert.throws(() => source.reviseData({ source: "source", id: "bad", values: [{ x: 1, "": "keep" }] }), /field "y"/);
  assert.equal(serializeProgram(source), before);
});

test("Full and Basic persistence keep raw keys while unused cells leave SVG unchanged", () => {
  for (const factory of [chart, basicChart]) {
    const program = pointChart(rows(), factory), encoded = serializeProgram(program);
    const restored = deserializeProgram(encoded);
    assert.equal(serializeProgram(restored), encoded);
    assert.deepEqual(dataset(restored, "source").values, rows());
    assert.equal(renderToSVG(restored), renderToSVG(program));
    const plain = pointChart(rows().map(({ x, y, group }) => ({ x, y, group })), factory);
    assert.equal(renderToSVG(plain), renderToSVG(program));
  }
});

test("facet children and persisted composition retain unnamed source cells", () => {
  const source = pointChart(rows()), faceted = source.facet({ field: "group" });
  for (const child of Object.values(faceted.children)) {
    const concrete = child.semanticSpec.datasets.filter(data => data.values?.length);
    assert.ok(concrete.length > 0);
    for (const data of concrete) for (const row of data.values) assert.ok(Object.hasOwn(row, ""));
  }
  const restored = deserializeProgram(serializeProgram(faceted));
  assert.equal(renderToSVG(restored), renderToSVG(faceted));
  assert.deepEqual(dataset(source, "source").values, rows());
});
