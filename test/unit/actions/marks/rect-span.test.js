import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { resolveMarkSelection } from "../../../../src/materialization/selection/state.js";
import { resolveMarkItems } from "../../../../src/materialization/selection/policies/index.js";

function base(values = [{ label: "Range", v: 3 }, { label: "Range", v: 7 }], style = { fill: "#93c5fd", opacity: 0.5, stroke: false }) {
  return chart().createCanvas({ width: 480, height: 320, margin: 40 }).createData({ values })
    .createRectMark({ data: "data", ...style });
}
function span(axis = "x", values) {
  return base(values)[axis === "x" ? "encodeX" : "encodeY"]({ datum: 2, scale: { domain: [0, 10] } })
    [axis === "x" ? "encodeX2" : "encodeY2"]({ datum: 6 });
}
function geometry(p) { return p.graphicSpec.objects.rect.items.map(item => {
  const { x, y, width, height } = item.properties; return { x, y, width, height };
}); }

test("constant Rect intervals produce one full-plot band for either axis regardless of row count", () => {
  for (const values of [[], [{ v: 1 }], [{ v: 1 }, { v: 2 }]]) {
    assert.deepEqual(geometry(span("x", values)), [{ x: 120, y: 40, width: 160, height: 240 }]);
    assert.deepEqual(geometry(span("y", values)), [{ x: 40, y: 136, width: 400, height: 96 }]);
  }
  const categorical = base().encodeX({ datum: "A" }).encodeY({ datum: "row" });
  assert.deepEqual(geometry(categorical), [{ x: 40, y: 40, width: 400, height: 240 }]);
  assert.equal(resolveMarkItems(categorical, "rect")[0].channels.x, "A");
  assert.throws(() => base().encodeX({ datum: {}, fieldType: "nominal" }), /nominal value/);
  const incompleteSource = base().encodeX({ field: "v" }).encodeY({ field: "v" })
    .createTextMark({ text: "pending" });
  assert.equal(incompleteSource.semanticSpec.layers.at(-1).source, "rect");
  assert.equal(incompleteSource.graphicSpec.objects.text.items.length, 0);
  const completed = incompleteSource.encodeX2({ target: "rect", datum: 6 }).encodeY2({ target: "rect", datum: 8 });
  assert.equal(completed.graphicSpec.objects.text.items.length, 2);
  const pending = base().encodeX({ datum: 2 });
  assert.deepEqual(geometry(pending), []);
  assert.deepEqual(geometry(span().encodeY({ datum: 1 })), []);
  const full = span().encodeY({ datum: 1, scale: { domain: [0, 10] } }).encodeY2({ datum: 8 });
  assert.deepEqual(geometry(full), [{ x: 120, y: 88, width: 160, height: 168 }]);
  assert.deepEqual(geometry(span().encodeX2({ datum: 2 })), []);
});

test("mixed field and constant Rect positions broadcast only across complete rows and replace stale branches", () => {
  const p = base([{ low: 1, color: "A" }, { low: null, color: "B" }, { low: 3, color: "C" }])
    .encodeX({ field: "low", scale: { domain: [0, 10] } }).encodeX2({ datum: 6 });
  assert.equal(geometry(p).length, 2);
  assert.deepEqual(resolveMarkItems(p, "rect").map(item => item.channels.x2), [6, 6]);
  const constant = p.encodeX({ datum: 2 });
  assert.equal(geometry(constant).length, 1);
  assert.equal(constant.semanticSpec.layers[0].encoding.x.field, undefined);
  const back = constant.encodeX({ field: "low" });
  assert.deepEqual(geometry(back), geometry(p));
  assert.equal(back.semanticSpec.layers[0].encoding.x.datum, undefined);
  const colored = base([{ color: "A" }, { color: "B" }, { color: "C" }], {})
    .encodeX({ datum: 2 }).encodeX2({ datum: 6 }).encodeColor({ field: "color", fieldType: "nominal" });
  assert.equal(geometry(colored).length, 3);
  const missing = chart().createCanvas().createData({ values: [{ v: 0 }, { v: 10 }] })
    .createPointMark().encodeX({ field: "v" }).encodeY({ field: "v" })
    .createData({ id: "missing", values: [{ low: null }] }).createRectMark({ data: "missing" })
    .encodeX({ field: "low" }).encodeX2({ datum: 100 });
  assert.deepEqual(geometry(missing), []);
  assert.ok(missing.resolvedScales.x.domain.every(value => value < 100));
});

test("Rect spans follow plot bounds, reversed custom ranges, logarithmic and temporal coordinates", () => {
  const p = span().editCanvas({ width: 600, height: 400, margin: { top: 30, right: 50, bottom: 70, left: 60 } });
  assert.deepEqual(geometry(p), [{ x: 158, y: 30, width: 196, height: 300 }]);
  const reversed = p.editScale({ id: "x", range: [500, 0] });
  assert.deepEqual(geometry(reversed), [{ x: 200, y: 30, width: 200, height: 300 }]);
  const log = base().encodeX({ datum: 10, scale: { type: "log", domain: [1, 1000] } }).encodeX2({ datum: 100 });
  const g = geometry(log)[0];
  assert.ok(Math.abs(g.x - (40 + 400 / 3)) < 1e-9);
  assert.ok(Math.abs(g.width - 400 / 3) < 1e-9);
  const time = base().encodeX({ datum: "2020-01-02", fieldType: "temporal",
    scale: { domain: [Date.UTC(2020, 0, 1), Date.UTC(2020, 0, 5)] } }).encodeX2({ datum: "2020-01-04" });
  assert.deepEqual(geometry(time), [{ x: 140, y: 40, width: 200, height: 240 }]);
  assert.equal(resolveMarkItems(time, "rect")[0].channels.x2, Date.UTC(2020, 0, 4));
});

test("constant Rect final items share membership and anchor semantics with text, selection and highlight", () => {
  const p = span();
  const items = resolveMarkItems(p, "rect");
  assert.equal(items.length, 1);
  assert.equal(items[0].members.length, 2);
  assert.equal(items[0].fields.label, "Range");
  assert.equal(items[0].fields.v, undefined);
  const labeled = p.createMarkLabels({ field: "label" });
  const label = labeled.graphicSpec.objects["rect-labels"].items[0].properties;
  assert.deepEqual([label.x, label.y, label.text], [200, 160, "Range"]);
  const resized = labeled.editCanvas({ height: 400 });
  assert.equal(resized.graphicSpec.objects["rect-labels"].items[0].properties.y, 200);
  const highlighted = p.highlightMarks({ target: "rect", select: { channel: "x2", op: "eq", value: 6 }, fill: "red" });
  assert.equal(highlighted.graphicSpec.objects.rect.items[0].properties.fill, "red");
  assert.equal(highlighted.editCanvas({ width: 600 }).graphicSpec.objects.rect.items[0].properties.fill, "red");
  assert.equal(p.graphicSpec.objects.rect.items[0].properties.fill, "#93c5fd");
  const kept = p.filterMarks({ target: "rect", channel: "x2", op: "eq", value: 6 });
  assert.equal(geometry(kept).length, 1);
  assert.throws(() => p.filterMarks({ target: "rect", channel: "x2", op: "gt", value: 6 }), /at least one matching/);
});

test("Rect datum validation and incompatible endpoints fail immutably", () => {
  const p = span();
  const saved = JSON.stringify(p);
  for (const options of [{ datum: NaN }, { datum: Infinity }, { datum: 1, field: "v" }, {},
    { datum: 2, aggregate: "sum" }, { datum: "bad", fieldType: "temporal" }, { datum: {}, fieldType: "nominal" }]) {
    assert.throws(() => p.encodeX(options), undefined, JSON.stringify(options));
    assert.equal(JSON.stringify(p), saved);
  }
  assert.throws(() => p.encodeX2({ datum: "A", fieldType: "nominal" }), /quantitative or temporal/);
  assert.throws(() => p.encodeX2({ datum: 4, fieldType: "temporal" }), /must match/);
  assert.throws(() => p.encodeX2({ datum: 4, scale: { id: "other" } }), /share one scale/);
  assert.throws(() => p.encodeX2({ field: "v", datum: 4 }), /exactly one/);
  assert.throws(() => base().encodeX2({ datum: 4 }), /existing x encoding/);
});

test("Rect temporal fields and datums expose normalized channels while retaining raw membership", () => {
  for (const temporalUnit of [undefined, "year"]) {
    const start = temporalUnit === "year" ? 2020 : "2020-01-01";
    const end = temporalUnit === "year" ? 2022 : "2020-01-03";
    const expectedEnd = temporalUnit === "year" ? Date.UTC(2022, 0, 1) : Date.UTC(2020, 0, 3);
    const time = { fieldType: "temporal", ...(temporalUnit === undefined ? {} : { temporalUnit }) };
    const p = chart().createCanvas().createData({ values: [{ start, end, low: 0, high: 1 }] })
      .createRectMark({ data: "data" }).encodeX({ field: "start", ...time }).encodeY({ field: "low" })
      .encodeX2({ field: "end", ...time }).encodeY2({ field: "high" })
      .encodeColor({ field: "end", ...time });
    const item = resolveMarkItems(p, "rect")[0];
    assert.equal(item.fields.start, start);
    assert.equal(item.channels.x, Date.UTC(2020, 0, 1));
    assert.equal(item.channels.x2, expectedEnd);
    assert.equal(item.channels.color, expectedEnd);
    const select = { channel: "x", op: "gte", value: Date.UTC(2020, 0, 1) };
    assert.equal(resolveMarkSelection(p, "rect", select).keys.length, 1);
    assert.equal(p.highlightMarks({ select, fill: "red" }).graphicSpec.objects.rect.items[0].properties.fill, "red");
    assert.equal(p.filterMarks(select).graphicSpec.objects.rect.items.length, 1);
    const revised = p.editScale({ id: "x", reverse: true }).editCanvas({ width: 700 });
    assert.equal(resolveMarkSelection(revised, "rect", select).keys.length, 1);
    const constant = chart().createCanvas().createData({ values: [] }).createRectMark()
      .encodeX({ datum: start, ...time }).encodeX2({ datum: end, ...time });
    assert.equal(resolveMarkItems(constant, "rect")[0].channels.x, item.channels.x);
    assert.equal(resolveMarkItems(constant, "rect")[0].channels.x2, item.channels.x2);
  }
});
