import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { assertAtomicFailures } from "../../../support/program-state.js";

const parts = ["line", "ticks", "labels", "title"];
const rows = [
  { a: 0, b: 10, c: 100, d: 1000, grade: "low", "field.with spaces": 0 },
  { a: 10, b: 20, c: 200, d: 2000, grade: "high", "field.with spaces": 10 }
];
function base(dimensions = ["a", "b", "c"], guides = { legend: false }) {
  return chart().createCanvas({ width: 600, height: 400, margin: 70 })
    .createData({ values: rows }).createParallelCoordinates({ id: "lines", dimensions, guides });
}
function config(p, field) {
  return p.guideConfigs.axis?.parallel?.axes?.dimensions.find(value => value.field === field);
}
function objects(p) {
  return Object.fromEntries(Object.entries(p.graphicSpec.objects).filter(([id]) => id.startsWith("parallelAxis")));
}

test("edits field-owned recipes and semantic title through Canvas, scale, and dimension reordering", () => {
  const p = base();
  const snapshot = JSON.stringify(p);
  const args = { field: "b", line: { color: "#7c3aed", lineWidth: 3 },
    ticksAndLabels: { values: [10, 15, 20], ticks: { length: 10 }, labels: { format: { decimals: 1 }, fontWeight: 600 } },
    title: { text: "Selected B", offset: 24, fontWeight: 700 } };
  const q = p.editParallelAxis(args);
  assert.deepEqual(q.semanticSpec.guides.axis.parallel.titles, [{ field: "b", text: "Selected B" }]);
  assert.equal(config(q, "b").title.text, undefined);
  assert.equal(q.graphicSpec.objects.parallelAxisLines.items[1].properties.stroke, "#7c3aed");
  assert.deepEqual(q.graphicSpec.objects.parallelAxisLabels.items.filter(item => item.properties.x === 291)
    .map(item => item.properties.text), ["10.0", "15.0", "20.0"]);
  const replay = q.editCanvas({ width: 700 }).editScale({ id: "lines-parallel-1", domain: [0, 40] });
  assert.deepEqual(replay.graphicSpec.objects.parallelAxisLabels.items.filter(item => item.properties.x === 341)
    .map(item => item.properties.y), [265, 232.5, 200]);
  const reordered = q.encodeParallelCoordinates({ target: "lines", dimensions: ["b", "c", "a"] });
  assert.equal(reordered.graphicSpec.objects.parallelAxisTitles.items[0].properties.text, "Selected B");
  assert.equal(reordered.graphicSpec.objects.parallelAxisLines.items[0].properties.strokeWidth, 3);
  assert.deepEqual(config(reordered, "b"), config(q, "b"));
  assert.equal(JSON.stringify(p), snapshot);
  assert.deepEqual(args.ticksAndLabels.values, [10, 15, 20]);
});

test("removes and restores every component with field-selected creation", () => {
  const p = base();
  for (const part of parts) {
    const q = p.editParallelAxis({ field: "b", [part]: false });
    assert.equal(config(q, "b")[part], undefined);
    const create = { field: "b", line: false, ticks: false, labels: false, title: false };
    const restored = q.createParallelAxis({ ...create, [part]: {} });
    assert.deepEqual(objects(restored), objects(p));
    assertAtomicFailures(q, [
      { operation: () => q.editParallelAxis({ field: "b", [part]: false }) },
      { operation: () => q.editParallelAxis({ field: "b", [part]: { color: "red" } }) }
    ]);
  }
});

test("keeps removed dimensions hidden and adds default axes only for an aggregate-created owner", () => {
  const p = base().removeParallelAxis({ field: "b" });
  assert.equal(p.graphicSpec.objects.parallelAxisLines.items.length, 2);
  const q = p.encodeParallelCoordinates({ target: "lines", dimensions: ["d", "b", "a", "c"] });
  assert.equal(q.graphicSpec.objects.parallelAxisLines.items.length, 3);
  assert.equal(config(q, "b").line, undefined);
  assert.ok(config(q, "d").line);
  const restored = q.createParallelAxis({ field: "b" });
  assert.equal(restored.graphicSpec.objects.parallelAxisLines.items.length, 4);
  const selected = base().removeParallelAxes().createParallelAxis({ field: "b" });
  const added = selected.encodeParallelCoordinates({ target: "lines", dimensions: ["d", "b", "a"] });
  assert.equal(added.graphicSpec.objects.parallelAxisLines.items.length, 1);
  assert.equal(config(added, "d").line, undefined);
  const removedField = selected.encodeParallelCoordinates({ target: "lines", dimensions: ["a", "c"] });
  assert.equal(removedField.semanticSpec.guides.axis?.parallel, undefined);
  assert.equal(removedField.guideConfigs.axis?.parallel, undefined);
});

test("creates a title-only axis, clears its semantic override, and removes the final owner", () => {
  const p = base(["a", "b"], false).createParallelAxis({
    field: "a", line: false, ticksAndLabels: false, title: { text: "Only A" }
  });
  assert.equal(p.graphicSpec.objects.parallelAxisLines, undefined);
  assert.equal(p.graphicSpec.objects.parallelAxisTitles.items.length, 1);
  const q = p.editParallelAxis({ field: "a", title: false });
  assert.equal(q.semanticSpec.guides.axis?.parallel, undefined);
  assert.equal(q.guideConfigs.axis?.parallel, undefined);
  assert.deepEqual(q.semanticSpec.layers, p.semanticSpec.layers);
  assert.deepEqual(q.resolvedScales, p.resolvedScales);
  assert.deepEqual(objects(q), {});
  assert.equal(q.createParallelAxes().graphicSpec.objects.parallelAxisTitles.items.length, 2);
});

test("supports exact ordinal values and quantitative formatting with meaningful errors", () => {
  const p = base(["a", { field: "grade", fieldType: "ordinal" }]);
  const q = p.editParallelAxis({ field: "grade", ticksAndLabels: { values: ["high"] } })
    .editParallelAxis({ field: "a", ticksAndLabels: { values: [0, 5, 10], labels: { format: ".1f" } } });
  assert.deepEqual(q.graphicSpec.objects.parallelAxisLabels.items.map(item => item.properties.text), ["0.0", "5.0", "10.0", "high"]);
  assertAtomicFailures(p, [
    { operation: () => p.editParallelAxis({ field: "grade", ticksAndLabels: { count: 3 } }) },
    { operation: () => p.editParallelAxis({ field: "grade", labels: { format: ".1f" } }) },
    { operation: () => p.editParallelAxis({ field: "grade", ticks: { values: ["unknown"] } }) },
    { operation: () => p.editParallelAxis({ field: "a", labels: { values: [20] } }) },
    { operation: () => p.editParallelAxis({ field: "a", ticks: { values: [5, 5] } }) }
  ]);
});

test("validates selectors, whole proposals, missing components, and Basic boundaries atomically", () => {
  const p = base();
  for (const args of [{}, { field: "missing" }, { field: "a", target: "missing", line: {} },
    { field: "a", line: { lineWidth: -1 } }, { field: "a", labels: { fontSize: 0 } },
    { field: "a", ticksAndLabels: false, ticks: {} }, { field: "a", ticksAndLabels: { ticks: false } },
    { field: "a", ticks: { count: 10001 } }, { field: "a", ticks: { count: 2, values: [0, 10] } },
    { field: "a", title: { text: "" } }, { field: "a", line: false, title: { fontSize: -1 } }]) {
    assertAtomicFailures(p, [{ operation: () => p.editParallelAxis(args), inputs: [args] }]);
  }
  assertAtomicFailures(p, [
    { operation: () => p.createParallelAxes() }, { operation: () => p.createParallelAxis({ field: "a" }) },
    { operation: () => p.removeParallelAxes({ coordinate: "missing" }) },
    { operation: () => p.removeParallelAxis({ field: "missing" }) }
  ]);
  const empty = base(["a", "b"], false);
  assertAtomicFailures(empty, [
    { operation: () => empty.createParallelAxis({ field: "a", line: false, ticksAndLabels: false, title: false }) },
    { operation: () => empty.editParallelAxis({ field: "a", line: {} }) },
    { operation: () => empty.removeParallelAxes() }
  ]);
  for (const operation of ["createParallelAxes", "createParallelAxis", "editParallelAxis", "removeParallelAxis", "removeParallelAxes"]) {
    assert.equal(basicChart()[operation], undefined);
  }
});

test("uses the stored owner with multiple layers and treats field names as data names", () => {
  const p = base(["a", "field.with spaces"]);
  const other = p.createParallelCoordinates({ id: "other", dimensions: ["a", "b"], guides: false });
  const q = other.editParallelAxis({ field: "field.with spaces", title: { text: "Readable" } });
  assert.equal(q.semanticSpec.guides.axis.parallel.target, "lines");
  assertAtomicFailures(other, [{ operation: () => other.editParallelAxis({ target: "other", field: "a", line: {} }) }]);
  const absent = other.removeParallelAxes();
  assertAtomicFailures(absent, [{ operation: () => absent.createParallelAxes(), error: /target/ }]);
  assert.equal(absent.createParallelAxes({ target: "other" }).semanticSpec.guides.axis.parallel.target, "other");
});


test("refreshes a reencoded owner once after scales and preserves unusual field names", () => {
  const p = base();
  const q = p.encodeParallelCoordinates({ target: "lines", dimensions: ["c", "a", "b"] });
  const ops = [];
  const visit = node => { ops.push(node.op); for (const child of node.children ?? []) visit(child); };
  visit(q.trace.children.at(-1));
  assert.equal(ops.filter(op => op === "rematerializeParallelAxes").length, 1);
  assert.ok(ops.indexOf("rematerializeScale") < ops.indexOf("rematerializeLineMark"));
  assert.ok(ops.indexOf("rematerializeLineMark") < ops.indexOf("rematerializeParallelAxes"));
  const special = chart().createCanvas({ width: 600, height: 400, margin: 70 })
    .createData({ values: [{ ["__proto__"]: 0, a: 1 }, { ["__proto__"]: 10, a: 2 }] })
    .createParallelCoordinates({ dimensions: ["__proto__", "a"], guides: false })
    .createParallelAxis({ field: "__proto__", title: { text: "Literal field" } });
  assert.deepEqual(special.semanticSpec.guides.axis.parallel.titles, [{ field: "__proto__", text: "Literal field" }]);
  assert.equal(special.graphicSpec.objects.parallelAxisLines.items.length, 1);
});


test("validates title override schema and prunes removed field overrides", () => {
  const p = base().editParallelAxis({ field: "b", title: { text: "B title" } });
  for (const value of [[], {}, [{ field: "a", text: "" }], [{ field: "", text: "A" }],
    [{ field: "a", text: "A", extra: 1 }], [{ field: "a", text: "A" }, { field: "a", text: "Other" }]]) {
    assertAtomicFailures(p, [{ operation: () => p.editSemantic({ property: "guide.axis.parallel.titles", value }) }]);
  }
  const q = p.encodeParallelCoordinates({ dimensions: ["a", "c"] });
  assert.equal(q.semanticSpec.guides.axis.parallel.titles, undefined);
  assert.deepEqual(q.graphicSpec.objects.parallelAxisTitles.items.map(item => item.properties.text), ["a", "c"]);
});

test("restores grouped ticks and labels and validates item bounds before producing graphics", () => {
  const empty = base(["a", "b"], false);
  const q = empty.createParallelAxis({ field: "a", line: false, title: false,
    ticksAndLabels: { values: [0, 10], ticks: { length: 12 }, labels: { format: ".1f" } } });
  assert.equal(q.graphicSpec.objects.parallelAxisTicks.items.length, 2);
  assert.deepEqual(q.graphicSpec.objects.parallelAxisLabels.items.map(item => item.properties.text), ["0.0", "10.0"]);
  const hidden = q.editParallelAxis({ field: "a", ticksAndLabels: { values: [] } });
  assert.equal(hidden.graphicSpec.objects.parallelAxisLabels.items.length, 0);
  assert.ok(config(hidden, "a").labels);
  const counted = q.editParallelAxis({ field: "a", ticksAndLabels: { count: 3 } });
  assert.equal(config(counted, "a").ticks.values, undefined);
  assert.equal(counted.editParallelAxis({ field: "a", ticksAndLabels: false }).guideConfigs.axis?.parallel, undefined);
  const full = base(["a", "b"]);
  const values = Array.from({ length: 6000 }, (_, i) => i / 600);
  const large = full.editParallelAxis({ field: "a", ticks: { values } });
  assertAtomicFailures(large, [{ operation: () => large.editParallelAxis({ field: "b", ticks: { values: values.map(v => v + 10) } }) }]);
  assertAtomicFailures(empty, [
    { operation: () => empty.createParallelAxis({ field: "a", line: false, ticks: false, labels: false, title: false }) },
    { operation: () => empty.createParallelAxis({ field: "a", ticksAndLabels: {}, ticks: {} }) },
    { operation: () => empty.createParallelAxes({ coordinate: "other" }) },
    { operation: () => empty.createParallelAxis({ field: "a", target: null }) },
    { operation: () => empty.createParallelAxis({ field: "a", ticks: { values: "bad" } }) },
    { operation: () => empty.createParallelAxis({ field: "a", ticks: { count: 0 } }) }
  ]);
});
