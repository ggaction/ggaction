import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { getMarkItems } from "../../../../src/inspection.js";
import { createTransitionScene } from "../../../../src/scene.js";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "../../../../src/persistence.js";
import { assertAtomicFailures } from "../../../support/program-state.js";

const data = (program, id) => program.semanticSpec.datasets.find(dataset => dataset.id === id);
const scatter = options => chart().createCanvas().createData({ id: "rows", ...options })
  .createScatterPlot({ id: "points", x: "x", y: "y" });
const keys = program => new Map(getMarkItems(program, { target: "points" }).map(item => [item.fields.id, item.key]));
const selected = program => getMarkItems(program, { target: "points" }).filter(item => item.properties.fill === "red").map(item => item.fields.id);

test("keyed revision preserves item, graphic and scene identity through reorder and value edits", () => {
  const before = scatter({ keyField: "id", values: [{ id: "a", x: 1, y: 2 }, { id: "b", x: 2, y: 4 }] });
  const saved = serializeProgram(before);
  const after = before.reviseData({ source: "rows", id: "next", values: [{ id: "b", x: 3, y: 6 }, { id: "a", x: 1, y: 2 }] });
  assert.deepEqual(keys(after), keys(before));
  assert.deepEqual(after.graphicSpec.objects.points.items.map(item => item.id), before.graphicSpec.objects.points.items.map(item => item.id).reverse());
  for (const format of ["svg", "canvas"]) {
    const scene = createTransitionScene(after, { format });
    const transferred = createTransitionScene(deserializeGraphic(serializeGraphic(after)), { format });
    assert.deepEqual(transferred, scene);
    assert.equal(scene.version, format === "svg" ? 1 : 2);
  }
  assert.equal(serializeProgram(before), saved);
  assert.equal(data(after, "next").revision, 1);
  assert.equal(data(after, "next").logicalId, data(before, "rows").logicalId);
});

test("generated rowMap preserves only explicit correspondence and isolates new rows on forks", () => {
  const before = scatter({ values: [{ id: "a", x: 1, y: 2 }, { id: "b", x: 2, y: 4 }] });
  const values = [{ id: "b", x: 2, y: 5 }, { id: "c", x: 3, y: 7 }];
  const revise = () => before.reviseData({ source: "rows", id: "next", values, rowMap: [1, null] });
  const a = revise(), b = revise();
  assert.equal(keys(a).get("b"), keys(before).get("b"));
  assert.equal(keys(a).get("b"), keys(b).get("b"));
  assert.notEqual(keys(a).get("c"), keys(b).get("c"));
  const replaced = before.reviseData({ source: "rows", id: "other", values: data(before, "rows").values });
  assert.ok([...keys(replaced).values()].every(key => ![...keys(before).values()].includes(key)));
  assert.notEqual(data(chart().createData({ id: "rows", values: [] }), "rows").logicalId, data(chart().createData({ id: "rows", values: [] }), "rows").logicalId);
});

test("stored key selection survives reorder, deletion, restoration and keyed reappearance", () => {
  const before = scatter({ keyField: "id", values: [{ id: "a", x: 1, y: 2 }, { id: "b", x: 2, y: 4 }] })
    .highlightMarks({ id: "picked", target: "points", select: { rows: { data: "rows", indices: [1] } }, fill: "red" });
  const resource = before.semanticSpec.resources[0];
  assert.equal(resource.kind, "persistent-selection");
  assert.deepEqual(resource.options.rowKeys, [data(before, "rows").rowKeys[1]]);
  assert.equal(before.materializationConfigs.selections.picked.selector, undefined);
  const deleted = before.reviseData({ source: "rows", id: "deleted", values: [{ id: "a", x: 1, y: 2 }] });
  assert.deepEqual(selected(deleted), []);
  const restored = deserializeProgram(serializeProgram(deleted)).reviseData({ source: "deleted", id: "returned", values: [{ id: "b", x: 9, y: 10 }, { id: "a", x: 1, y: 2 }] });
  assert.deepEqual(selected(restored), ["b"]);
  assert.equal(restored.semanticSpec.resources[0].options.rowKeys[0], resource.options.rowKeys[0]);
  assert.deepEqual(selected(before), ["b"]);
});

test("predicate resources reevaluate values and highlights preserve identity when glyphs change", () => {
  const before = scatter({ keyField: "id", values: [{ id: "a", x: 1, y: 2 }, { id: "b", x: 2, y: 4 }] });
  const marked = before.highlightMarks({ id: "picked", target: "points", select: { field: "y", op: "gt", value: 3 }, shape: "square", fill: "red" });
  assert.deepEqual(marked.graphicSpec.objects.points.items.map(item => item.id), before.graphicSpec.objects.points.items.map(item => item.id));
  const after = marked.reviseData({ source: "rows", id: "next", values: [{ id: "a", x: 1, y: 8 }, { id: "b", x: 2, y: 1 }] });
  assert.deepEqual(selected(after), ["a"]);
  assert.equal(after.semanticSpec.resources[0].options.mode, "predicate");
});

test("source modes validate atomically and Basic shares the create contract", () => {
  const before = chart().createData({ id: "rows", values: [{ id: "a", x: 1 }], keyFields: ["id", "x"] });
  assertAtomicFailures(before, [
    { operation: () => before.reviseData({ source: "rows", id: "next", values: [{ id: "a" }] }), error: /key|field/i },
    { operation: () => before.reviseData({ source: "rows", id: "next", values: [{ id: "a", x: 1 }], rowMap: [0] }), error: /rowMap|key/i },
    { operation: () => before.createData({ id: "bad", values: [{ id: 1 }, { id: 1 }], keyField: "id" }), error: /duplicate/i },
    { operation: () => before.createData({ id: "bad", values: [{}], keys: [null] }), error: /key/i }
  ]);
  const date = new Date(0), keyed = basicChart().createData({ values: [{ x: 1 }, { x: 2 }], keys: [date, ""] });
  date.setTime(123);
  assert.match(keyed.semanticSpec.datasets[0].rowKeys[0], /date/);
  assert.equal(typeof keyed.reviseData, "undefined");
  const separate = chart().createData({ id: "rows", values: [{ x: 1 }], keys: [[1, "a"]] });
  assert.throws(() => separate.reviseData({ source: "rows", id: "next", values: [{ x: 2 }] }), /keys/i);
});

test("path series identity survives member changes while topology follows ordered row keys", () => {
  for (const kind of ["line", "area"]) {
    let before = chart().createCanvas().createData({ id: "rows", keyField: "id", values:
      [{ id: "a", group: "one", x: 1, y: 2 }, { id: "b", group: "one", x: 2, y: 4 }] });
    before = (kind === "line" ? before.createLineMark({ id: "path" }) : before.createAreaMark({ id: "path" }))
      .encodeX({ field: "x" }).encodeY({ field: "y" }).encodeGroup({ field: "group" });
    if (kind === "area") before = before.encodeY2({ datum: 0 });
    const original = before.graphicSpec.objects.path.items[0];
    const revised = before.reviseData({ source: "rows", id: "next", values:
      [{ id: "a", group: "one", x: 3, y: 8 }, { id: "b", group: "one", x: 2, y: 4 }] });
    const reordered = revised.graphicSpec.objects.path.items[0];
    assert.equal(reordered.identity.key, original.identity.key);
    assert.equal(reordered.id, original.id);
    assert.notEqual(reordered.identity.topology, original.identity.topology);
    const edited = before.reviseData({ source: "rows", id: "next", values:
      [{ id: "a", group: "one", x: 1, y: 8 }, { id: "b", group: "one", x: 2, y: 4 }] });
    assert.equal(edited.graphicSpec.objects.path.items[0].identity.topology, original.identity.topology);
  }
});


test("removing one named selection retains other authored resources", () => {
  const original = scatter({ values: [{ x: 1, y: 2 }, { x: 2, y: 4 }] })
    .selectMarks({ id: "first", target: "points", field: "x", op: "eq", value: 1 })
    .selectMarks({ id: "second", target: "points", field: "x", op: "eq", value: 2 });
  const removed = original.removeMarkSelection({ selection: "first" });
  assert.deepEqual(removed.semanticSpec.resources.map(resource => resource.id), ["second"]);
  assert.ok(removed.materializationConfigs.selections.second);
  assert.equal(original.semanticSpec.resources.length, 2);
  assert.equal(serializeProgram(deserializeProgram(serializeProgram(removed))), serializeProgram(removed));
});
