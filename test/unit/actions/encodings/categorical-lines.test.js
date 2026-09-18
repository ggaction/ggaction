import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { deriveLineSeries } from "../../../../src/grammar/lineSeries.js";
import { exportAccessibleData } from "../../../../src/accessibility.js";

const rows = [{ k: "C", v: 3, g: "one" }, { k: "A", v: 1, g: "one" },
  { k: "B", v: 2, g: "one" }, { k: "C", v: 4, g: "two" },
  { k: "A", v: 2, g: "two" }, { k: "B", v: 3, g: "two" }];
const domain = ["B", "C", "A"];
function base(values = rows) {
  return chart().createCanvas({ width: 360, height: 240, margin: 30 }).createData({ values });
}
function build(values = rows, scale = {}) {
  return base(values).createLinePlot({ id: "line", x: { field: "k", fieldType: "ordinal",
    scale: { id: "category", domain, ...scale } }, y: { field: "v", scale: { id: "amount", domain: [0, 5] } },
    groupBy: "g", guides: false });
}
function commands(p) { return p.graphicSpec.objects.line.items.map(item => item.properties.commands); }

test("categorical lines follow domain order and align with points on shared scales", () => {
  for (const type of ["point", "band"]) {
    const line = build(rows, { type });
    const p = line.createScatterPlot({ id: "points", x: { field: "k", fieldType: "ordinal", scale: { id: "category" } },
      y: { field: "v", scale: { id: "amount" } }, guides: false });
    const points = p.graphicSpec.objects.points.items.map(item => item.properties);
    const byCategory = new Map(rows.slice(0, 3).map((row, i) => [row.k, points[i]]));
    assert.deepEqual(commands(p)[0].map(c => [c.x, c.y]), domain.map(k => [byCategory.get(k).x, byCategory.get(k).y]));
    assert.deepEqual(commands(p)[0].map(c => c.op), ["M", "L", "L"]);
    assert.ok(commands(p)[0][0].x < commands(p)[0][1].x);
    assert.ok(commands(p)[0][1].x < commands(p)[0][2].x);
    assert.deepEqual(commands(deserializeProgram(serializeProgram(p))), commands(p));
    const resized = p.editCanvas({ width: 460 });
    assert.notDeepEqual(commands(resized), commands(p));
    const reversed = line.editScale({ id: "category", reverse: true });
    assert.ok(commands(reversed)[0][0].x > commands(reversed)[0][2].x);
  }
});

test("categorical raw and aggregate lines are position-order independent", () => {
  for (const aggregate of [undefined, "sum"]) {
    const p = base().createLineMark({ id: "line" });
    const x = { field: "k", fieldType: "nominal", scale: { domain } };
    const y = { field: "v", ...(aggregate === undefined ? {} : { aggregate }) };
    const xy = p.encodeX(x).encodeY(y), yx = p.encodeY(y).encodeX(x);
    assert.deepEqual(yx.graphicSpec, xy.graphicSpec);
    assert.deepEqual(yx.semanticSpec.layers, xy.semanticSpec.layers);
    assert.deepEqual([...yx.semanticSpec.scales].sort((a, b) => a.id.localeCompare(b.id)),
      [...xy.semanticSpec.scales].sort((a, b) => a.id.localeCompare(b.id)));
    assert.equal(commands(xy)[0].length, aggregate === undefined ? 6 : 3);
  }
});

test("retains numeric-looking categories, stable duplicate rows and observed gaps", () => {
  const values = [{ k: "10", v: 3 }, { k: "2", v: 1 }, { k: "10", v: 4 }];
  const p = base(values).createLinePlot({ id: "line", x: { field: "k", fieldType: "nominal",
    scale: { domain: ["2", "missing", "10"] } }, y: "v", guides: false });
  const layer = p.semanticSpec.layers.find(item => item.id === "line");
  const derived = deriveLineSeries(values, layer, { xDomain: ["2", "missing", "10"] });
  assert.deepEqual(derived.series[0].values, [{ x: "2", y: 1 }, { x: "10", y: 3 }, { x: "10", y: 4 }]);
  assert.equal(commands(p)[0].length, 3);
  assert.equal(commands(p)[0][1].x, commands(p)[0][2].x);
  assert.throws(() => base([{ k: "A", v: null }, { k: "B", v: 2 }]).createLinePlot({
    x: { field: "k", fieldType: "nominal" }, y: "v", guides: false }));
});

test("categorical domain edits, facets and accessible vertices preserve order", () => {
  const p = build().createXAxis({ scale: "category", title: false });
  const text = p.graphicSpec.objects.xAxisLabels.items.map(item => item.properties.text);
  assert.deepEqual(text, domain);
  const edited = p.editScale({ id: "category", domain: ["A", "B", "C"] });
  assert.notDeepEqual(commands(edited), commands(p));
  const accessible = exportAccessibleData(p);
  assert.deepEqual(accessible.views[0].rows.map(row => row.values["line:x"]), [...domain, ...domain]);
  const panels = p.facet({ field: "g", columns: 2 });
  assert.equal(Object.keys(panels.children).length, 2);
  for (const child of Object.values(panels.children)) {
    assert.equal(commands(child)[0].length, 3);
    assert.ok(commands(child)[0][0].x < commands(child)[0][2].x);
  }
  const highlighted = p.selectMarks({ id: "series", target: "line", field: "g", op: "eq", value: "one" })
    .highlightMarks({ selection: "series", color: "red" });
  assert.equal(commands(highlighted).length, 2);
});


test("inferred categories follow first appearance independently of group and color order", () => {
  const p = base().createLinePlot({ id: "line", x: { field: "k", fieldType: "nominal" },
    y: { field: "v", aggregate: "sum" }, groupBy: "g",
    color: { field: "g", scale: { domain: ["two", "one"] } }, guides: false });
  assert.deepEqual(p.resolvedScales.x.domain, ["C", "A", "B"]);
  const changed = p.editScale({ id: "x", domain: ["B", "C", "A"] });
  assert.deepEqual(exportAccessibleData(changed).views[0].rows.map(row => row.values["line:x"]), [...domain, ...domain]);
});

test("supports explicit path traversal and categorical linked legend order", () => {
  const p = base(rows.slice(0, 3).map((row, i) => ({ ...row, order: i })))
    .createLinePlot({ id: "line", x: { field: "k", fieldType: "ordinal", scale: { domain } }, y: "v", guides: false })
    .encodePathOrder({ field: "order" });
  assert.deepEqual(exportAccessibleData(p).views[0].rows.map(row => row.values["line:x"]), ["C", "A", "B"]);
  const values = ["A", "B", "C"].flatMap(k => [{ k, v: 1 }, { k, v: 2 }]);
  const linked = base(values).editCanvas({ width: 600, margin: 100 }).createLinePlot({
    x: { field: "k", fieldType: "ordinal", scale: { domain } }, y: "v", color: { field: "k" },
    guides: { axes: false, grid: false, legend: { order: { channel: "x" } } }
  });
  assert.deepEqual(linked.graphicSpec.objects.seriesLegendLabels.items.map(item => item.properties.text), domain);
});
