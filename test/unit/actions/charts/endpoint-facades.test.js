import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { findDataset } from "../../../../src/selectors/datasets.js";
import { findLayer } from "../../../../src/selectors/layers.js";

const rows = [
  { category: "A", value: 2, before: 3, after: 1 },
  { category: "A", value: 4, before: 5, after: 7 },
  { category: "B", value: -1, before: 2, after: 2 }
];

function base(values = rows) {
  return chart()
    .createCanvas({ width: 480, height: 320, margin: 50 })
    .createData({ id: "source", values });
}

test("keeps dot rows raw unless an explicit categorical summary is requested", () => {
  const raw = base().createDotPlot({ category: "category", value: "value", guides: false });
  assert.equal(raw.graphicSpec.objects.dotPlot.items.length, 3);
  assert.equal(findLayer(raw, "dotPlot").data, "source");

  const summarized = base().createDotPlot({
    id: "mean", category: "category", value: "value", summary: "mean", guides: false
  });
  const dataset = findDataset(summarized, "meanSummaryData");
  assert.equal(summarized.graphicSpec.objects.mean.items.length, 2);
  assert.equal(dataset.source, "source");
  assert.deepEqual(dataset.transform[0].aggregates, [
    { op: "mean", field: "value", as: "__mean_value" }
  ]);
  assert.equal(findLayer(summarized, "mean").encoding.x.field, "__mean_value");
});

test("connects every lollipop point to a finite baseline on the shared scale", () => {
  const program = base().createLollipopPlot({
    id: "pop", category: "category", value: "value", baseline: 1,
    point: { radius: 5, fill: "#e11d48" }, stem: { strokeWidth: 3 }, guides: false
  });
  const point = findLayer(program, "pop");
  const stem = findLayer(program, "popStem");
  assert.equal(stem.data, point.data);
  assert.equal(stem.encoding.x.scale, point.encoding.x.scale);
  assert.equal(stem.encoding.x2.scale, point.encoding.x.scale);
  assert.equal(stem.encoding.x2.datum, 1);
  program.graphicSpec.objects.pop.items.forEach((item, index) => {
    const line = program.graphicSpec.objects.popStem.items[index];
    assert.equal(line.properties.x1, item.properties.x);
    assert.equal(line.properties.y1, item.properties.y);
    assert.equal(line.properties.y2, item.properties.y);
  });
});

test("supports vertical lollipops and signed values without changing endpoint meaning", () => {
  const program = base().createLollipopPlot({
    id: "vertical", category: "category", value: "value",
    orientation: "vertical", baseline: -2, guides: false
  });
  const point = findLayer(program, "vertical");
  const stem = findLayer(program, "verticalStem");
  assert.equal(point.encoding.x.field, "category");
  assert.equal(point.encoding.y.field, "value");
  assert.equal(stem.encoding.y2.datum, -2);
  assert.equal(stem.encoding.y2.scale, point.encoding.y.scale);
});

test("preserves dumbbell start/end roles when values reverse or coincide", () => {
  const program = base().createDumbbellPlot({
    id: "change", category: "category", start: "before", end: "after",
    startPoint: { fill: "#2563eb" }, endPoint: { fill: "#dc2626" }, guides: false
  });
  const start = findLayer(program, "changeStart");
  const end = findLayer(program, "change");
  const connector = findLayer(program, "changeConnector");
  assert.equal(start.encoding.x.field, "before");
  assert.equal(end.encoding.x.field, "after");
  assert.equal(connector.encoding.x.field, "before");
  assert.equal(connector.encoding.x2.field, "after");
  assert.equal(connector.encoding.x.scale, connector.encoding.x2.scale);
  assert.equal(program.graphicSpec.objects.changeStart.items[0].properties.fill, "#2563eb");
  assert.equal(program.graphicSpec.objects.change.items[0].properties.fill, "#dc2626");
  assert.equal(
    program.graphicSpec.objects.changeConnector.items[2].properties.x1,
    program.graphicSpec.objects.changeConnector.items[2].properties.x2
  );
});

test("labels endpoint fields explicitly and owns both dumbbell label children", () => {
  const program = base().createDumbbellPlot({
    id: "labeled", category: "category", start: "before", end: "after",
    labels: { endpoint: "both" }, guides: false
  });
  assert.equal(findLayer(program, "labeledStartLabel").encoding.text.field, "before");
  assert.equal(findLayer(program, "labeledLabel").encoding.text.field, "after");
  const removed = program.removeMark({ target: "labeled" });
  assert.equal(removed.semanticSpec.layers.length, 0);
  assert.equal(findDataset(removed, "source").values.length, 3);
});

test("atomically edits roles, source, orientation, summary, and lollipop baseline", () => {
  const source = base()
    .createData({ id: "replacement", values: [{ category: "C", before: 8, after: 4 }] })
    .createDumbbellPlot({
      id: "change", data: "source", category: "category", start: "before", end: "after",
      summary: "mean", guides: false
    });
  const edited = source.editEndpointPlot({
    target: "change", data: "replacement", start: "after", end: "before",
    orientation: "vertical", summary: false
  });
  assert.equal(findDataset(edited, "changeSummaryData"), undefined);
  assert.equal(findLayer(edited, "changeStart").data, "replacement");
  assert.equal(findLayer(edited, "changeStart").encoding.y.field, "after");
  assert.equal(findLayer(edited, "change").encoding.y.field, "before");
  assert.deepEqual(edited.trace.children.at(-1).children.map(node => node.op), [
    "removeMark", "createDumbbellPlot"
  ]);

  const pop = base().createLollipopPlot({ category: "category", value: "value", guides: false })
    .editEndpointPlot({ baseline: 10 });
  assert.equal(findLayer(pop, "lollipopPlotStem").encoding.x2.datum, 10);
});

test("rejects incomplete rows, conflicting scales, and invalid edits atomically", () => {
  const source = base();
  const before = JSON.stringify(source);
  const invalid = [
    () => source.createDotPlot({ category: "category", value: "missing", guides: false }),
    () => source.createLollipopPlot({ category: "category", value: "value", baseline: Infinity }),
    () => source.createDumbbellPlot({ category: "category", start: "before", end: "before" }),
    () => source.createDumbbellPlot({
      category: "category",
      start: { field: "before", scale: { zero: false } },
      end: { field: "after", scale: { zero: true } }
    })
  ];
  for (const create of invalid) {
    assert.throws(create);
    assert.equal(JSON.stringify(source), before);
  }
  const dot = source.createDotPlot({ category: "category", value: "value", guides: false });
  const snapshot = JSON.stringify(dot);
  assert.throws(() => dot.editEndpointPlot({ start: "before" }), /not available for dot/);
  assert.equal(JSON.stringify(dot), snapshot);
});

test("rematerializes endpoint geometry after canvas and scale edits", () => {
  const program = base().createDumbbellPlot({
    id: "change", category: "category", start: "before", end: "after", guides: false
  });
  const initial = program.graphicSpec.objects.change.items[1].properties.x;
  const resized = program.editCanvas({ width: 900 });
  assert.notEqual(resized.graphicSpec.objects.change.items[1].properties.x, initial);
  const reversed = resized.editScale({ id: "changeValue", reverse: true });
  reversed.graphicSpec.objects.changeConnector.items.forEach((line, index) => {
    assert.equal(line.properties.x1, reversed.graphicSpec.objects.changeStart.items[index].properties.x);
    assert.equal(line.properties.x2, reversed.graphicSpec.objects.change.items[index].properties.x);
  });
});
