import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../../../src/index.js";
import { getMarkItems } from "../../../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { decodeValue, encodeValue } from "../../../../src/persistence/codec.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";

const values = [{ g: "A", x: 1, y: 2 }, { g: "A", x: 1, y: 2 }, { g: "B", x: 3, y: 7 }];
const base = () => chart().createCanvas({ margin: 120 }).createData({ id: "data", values });
const box = () => base().createBoxPlot({ id: "plot", x: { field: "g", fieldType: "nominal" }, y: { field: "y" } });
const redItems = p => getMarkItems(p, { target: "plot" }).filter(item =>
  item.geometry.some(g => g.properties.fill === "red" || g.properties.stroke === "red"));

test("compound row highlights round trip, revise and remove every owned component", () => {
  const original = box();
  const highlighted = original.highlightMarks({ id: "h", target: "plot", select: { rows: { data: "data", indices: [1] } }, color: "red" });
  const stored = serializeProgram(highlighted);
  const restored = deserializeProgram(stored);
  assert.equal(serializeProgram(restored), stored);
  assert.equal(renderToSVG(restored), renderToSVG(highlighted));
  assert.equal(redItems(restored).length, 5);
  assert.ok(redItems(restored).every(item => item.fields.g === "A"));
  const edited = restored.editMarkSelection({ selection: "h", rows: { data: "data", indices: [2] } });
  assert.equal(redItems(edited).length, 5);
  assert.ok(redItems(edited).every(item => item.fields.g === "B"));
  assert.equal(serializeProgram(restored), stored);
  const removed = edited.removeMarkSelection({ selection: "h" });
  assert.equal(removed.materializationConfigs.selections, undefined);
  assert.equal(removed.materializationConfigs.highlights, undefined);
  assert.equal(renderToSVG(removed), renderToSVG(original));
});

test("restoration rejects corrupt composite owners and row references", () => {
  const p = box().highlightMarks({ id: "h", target: "plot", select: { rows: { data: "data", indices: [1] } }, color: "red" });
  const stored = serializeProgram(p);
  for (const mutate of [
    s => { s.materializationConfigs.selections["h-plotMedian"].sourceSelection = "missing"; },
    s => { s.materializationConfigs.selections.h.sourceSelection = "h"; },
    s => { s.semanticSpec.resources[0].options.rowKeys = [99]; },
    s => { s.materializationConfigs.selections.h.projection.data = "missing"; },
    s => { s.materializationConfigs.highlights["h-plotMedian"].groupSelection = "missing"; },
    s => { s.materializationConfigs.highlights["h-plotMedian"].groupSelection = "h-plotWhisker"; }
  ]) {
    const envelope = JSON.parse(stored), state = decodeValue(envelope.payload);
    mutate(state); envelope.payload = encodeValue(state);
    assert.throws(() => deserializeProgram(JSON.stringify(envelope)), /selection|Selection|row|Row|composite|Composite|dataset|Dataset/);
  }
});

test("source row indices survive sorting, filtering, computation, folding and aggregation", () => {
  const cases = [
    [p => p.createSortedData({ id: "derived", sortBy: [{ field: "y", order: "descending" }] }), "y", [[2], [0], [1]]],
    [p => p.filterData({ id: "derived", source: "data", field: "g", oneOf: ["A"] }), "y", [[0], [1]]],
    [p => p.createComputedData({ id: "derived", as: "double", expression: { op: "multiply", left: { field: "y" }, right: { constant: 2 } } }), "double", [[0], [1], [2]]],
    [p => p.createFoldData({ id: "derived", fields: ["x", "y"] }), "value", [[0], [0], [1], [1], [2], [2]]],
    [p => p.createSummaryData({ id: "derived", groupBy: "g", aggregates: [{ field: "y", op: "sum", as: "total" }] }), "total", [[0, 1], [2]]],
    [p => p.createBin2DData({ id: "derived", x: "x", y: "y", bins: { x: 2, y: 2 }, extent: { x: [1, 3], y: [2, 7] }, includeEmpty: false, as: { count: "count" } }), "count", [[0, 1], [2]]]
  ];
  for (const [derive, field, expected] of cases) {
    const p = derive(base()).createScatterPlot({ id: "plot", data: "derived", x: field, y: field, guides: false });
    for (const q of [p, deserializeProgram(serializeProgram(p))]) {
      assert.deepEqual(getMarkItems(q, { target: "plot" }).map(item => item.rows.filter(r => r.data === "data").map(r => r.index)), expected);
      const h = q.highlightMarks({ target: "plot", select: { rows: { data: "data", indices: [1] } }, color: "red", bringToFront: false });
      assert.equal(redItems(h).length, expected.filter(indices => indices.includes(1)).length);
    }
  }
  const separate = base().createData({ id: "unrelated", values }).createScatterPlot({ id: "plot", data: "unrelated", x: "x", y: "y" });
  assert.throws(() => separate.selectMarks({ target: "plot", rows: { data: "data", indices: [1] } }), /lineage/);
});

test("compound inspection and highlight removal preserve endpoint and raincloud ownership", () => {
  const cases = [
    [p => p.createDumbbellPlot({ id: "plot", category: "g", start: "x", end: "y", guides: false }), 3],
    [p => p.createErrorBar({ id: "plot", x: { field: "g", fieldType: "nominal" }, y: { field: "y" } }), 3],
    [p => p.createRaincloudPlot({ id: "plot", category: "g", value: "y", guides: false }), 3]
  ];
  for (const [create, minimumOwners] of cases) {
    const p = create(base());
    const items = getMarkItems(p, { target: "plot" });
    assert.ok(new Set(items.map(i => i.target)).size >= minimumOwners);
    const h = p.highlightMarks({ id: "h", target: "plot", select: { field: "g", op: "eq", value: "A" }, color: "red" });
    assert.ok(new Set(redItems(h).map(i => i.target)).size >= minimumOwners);
    assert.ok(redItems(h).every(item => item.fields.g === "A"));
    const restored = deserializeProgram(serializeProgram(h));
    assert.equal(renderToSVG(restored.removeMarkSelection({ selection: "h" })), renderToSVG(p));
  }
});

test("removing a compound selection rejects live labels on a component selection", () => {
  const p = box().highlightMarks({ id: "h", target: "plot", select: { field: "g", op: "eq", value: "A" } })
    .createMarkLabels({ id: "labels", source: "plotMedian", field: "g", selection: "h-plotMedian" });
  const stored = serializeProgram(p);
  assert.throws(() => p.removeMarkSelection({ selection: "h" }), /attached labels/);
  assert.equal(serializeProgram(p), stored);
});

test("filtered duplicate-row identity persists and releases its provenance cache", () => {
  const p = base().createScatterPlot({ id: "plot", x: "x", y: "y" })
    .filterMarks({ target: "plot", rows: { data: "data", indices: [1] } })
    .createMarkLabels({ id: "labels", source: "plot", field: "g", select: { rows: { data: "data", indices: [1] } } });
  const stored = serializeProgram(p), restored = deserializeProgram(stored);
  assert.deepEqual(getMarkItems(restored, { target: "labels" }), getMarkItems(p, { target: "labels" }));
  assert.deepEqual(restored.materializationConfigs.rowProvenance.plotFilteredData, { indices: [1] });
  assert.deepEqual(getMarkItems(restored, { target: "plot" })[0].rows.map(({ data, index }) => ({ data, index })),
    [{ data: "data", index: 1 }, { data: "plotFilteredData", index: 0 }]);
  for (const indices of [[-1], [3], [1, 1], [], [2]]) {
    const envelope = JSON.parse(stored), state = decodeValue(envelope.payload);
    state.materializationConfigs.rowProvenance.plotFilteredData.indices = indices;
    envelope.payload = encodeValue(state);
    assert.throws(() => deserializeProgram(JSON.stringify(envelope)), /row provenance/);
  }
  const removed = restored.removeMarkLabels({ target: "labels" }).removeMarkFilter({ target: "plot" });
  assert.equal(removed.materializationConfigs.rowProvenance, undefined);
  assert.equal(getMarkItems(removed, { target: "plot" }).length, 3);
  assert.equal(serializeProgram(deserializeProgram(serializeProgram(removed))), serializeProgram(removed));
});

test("row selectors reject malformed input atomically and accept an empty selection", () => {
  const p = base().createScatterPlot({ id: "plot", x: "x", y: "y" });
  const stored = serializeProgram(p);
  for (const select of [
    { rows: null }, { rows: { data: "data", indices: [1.5] } },
    { rows: { data: "data", indices: [-1] } }, { rows: { data: "data", indices: [NaN] } },
    { rows: { data: "data", indices: new Array(1) } },
    { rows: { data: "data", indices: [0], extra: true } },
    { rows: { data: "data", indices: [0] }, field: "g", op: "eq", value: "A" },
    { rows: { data: "data", indices: [0] }, grain: "series" },
    { rows: { data: "missing", indices: [0] } }, { rows: { data: "data", indices: [3] } }
  ]) assert.throws(() => p.highlightMarks({ target: "plot", select }), /row|Row|grain/);
  const empty = p.highlightMarks({ id: "h", target: "plot", select: { rows: { data: "data", indices: [] } }, color: "red", bringToFront: false });
  assert.equal(redItems(empty).length, 0);
  assert.equal(serializeProgram(p), stored);
  const deduplicated = p.selectMarks({ id: "s", target: "plot", rows: { data: "data", indices: [1, 1] } });
  assert.deepEqual(deduplicated.semanticSpec.resources[0].options.rowKeys, [p.semanticSpec.datasets[0].rowKeys[1]]);
});

test("item inspection caches frozen snapshots and resolves scoped targets", () => {
  const p = base().createScatterPlot({ id: "plot", x: "x", y: "y" });
  const first = getMarkItems(p, { target: "plot" });
  assert.equal(getMarkItems(p, { target: "plot" }), first);
  assert.ok(Object.isFrozen(first) && Object.isFrozen(first[0].rows[0]));
  assert.equal(first.length, 3);
  assert.deepEqual(first.map(i => i.rows.map(({ data, index }) => ({ data, index }))), [[{ data: "data", index: 0 }], [{ data: "data", index: 1 }], [{ data: "data", index: 2 }]]);
  for (const item of first) {
    assert.equal(Object.hasOwn(item, "graphicIds"), false);
    const { x, y, radius } = item.geometry[0].properties;
    assert.deepEqual(item.bounds, { left: x - radius, top: y - radius, right: x + radius, bottom: y + radius });
  }
  const highlighted = p.highlightMarks({ target: "plot", select: { rows: { data: "data", indices: [1] } }, color: "red" });
  assert.notEqual(getMarkItems(highlighted, { target: "plot" }), first);
  assert.equal(redItems(highlighted)[0].rows[0].index, 1);
  const combined = hconcat({ programs: [{ id: "left", program: p }, { id: "right", program: highlighted }] });
  assert.equal(getMarkItems(combined, { target: { childPath: ["left"], id: "plot" } }).length, 3);
  assert.throws(() => getMarkItems(combined, { target: { childPath: ["missing"], id: "plot" } }), /Unknown program child/);
  assert.throws(() => getMarkItems(p, { target: "missing" }), /Unknown mark/);
  assert.throws(() => getMarkItems(p, { target: "plot", grain: "stack" }), /grain/);
});

test("interval center selections reevaluate owned error bars from source rows", () => {
  const p = chart().createCanvas({ margin: 120 }).createData({ id: "data", values: [
    { g: "A", y: 1 }, { g: "A", y: 3 }, { g: "B", y: 4 }, { g: "B", y: 8 }
  ] }).createIntervalPlot({ id: "plot", x: "g", y: { field: "y", center: "mean", extent: "stdev" }, guides: false });
  const h = p.highlightMarks({ id: "h", target: "plot", select: { rows: { data: "data", indices: [0] } }, color: "red" });
  assert.equal(redItems(h).length, 4);
  assert.ok(redItems(h).every(item => item.fields.g === "A"));
  const changed = deserializeProgram(serializeProgram(h)).editMarkSelection({ selection: "h", rows: { data: "data", indices: [3] } });
  assert.equal(redItems(changed).length, 4);
  assert.ok(redItems(changed).every(item => item.fields.g === "B"));
  assert.equal(renderToSVG(changed.removeMarkSelection({ selection: "h" })), renderToSVG(p));
});
