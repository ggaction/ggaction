import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";

const rows = [{ x: 1, y: 1, other: 100 }, { x: 2, y: 3, other: 1000 }];
function points(values = rows) {
  return chart().createCanvas({ width: 480, height: 320, margin: 40 }).createData({ values })
    .createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" });
}
const positions = (p, id) => p.graphicSpec.objects[id].items.map(item => [item.properties.x, item.properties.y]);

test("source-owned text never extends its source domain after field reassignment", () => {
  for (const channel of ["x", "y"]) {
    const action = channel === "x" ? "encodeX" : "encodeY";
    const b = points();
    const labelled = b.createTextMark({ source: "point", text: "label" });
    const a = b[action]({ target: "point", field: "other" });
    const p = labelled[action]({ target: "point", field: "other" });
    assert.deepEqual(p.resolvedScales[channel].domain, [100, 1000]);
    assert.deepEqual(p.graphicSpec.objects.point, a.graphicSpec.objects.point);
    assert.deepEqual(positions(p, "text"), positions(p, "point"));
    assert.deepEqual(p.editCanvas({ width: 640, height: 420 }).resolvedScales[channel].domain, [100, 1000]);
    assert.deepEqual(labelled.resolvedScales[channel].domain, channel === "x" ? [1, 2] : [1, 3]);
  }
});

test("source scale rebinding moves guides and labels without retaining false dependencies", () => {
  const b = points().editCanvas({ margin: 60 }).createAxes().createGrid().createTextMark({ source: "point", text: "label", dy: -8 });
  const p = b.encodeY({ target: "point", field: "other", scale: { id: "new-y" } });
  assert.equal(p.semanticSpec.guides.axis.y.scale, "new-y");
  assert.equal(p.semanticSpec.guides.grid.horizontal.scale, "new-y");
  assert.deepEqual(p.resolvedScales["new-y"].domain, [100, 1000]);
  for (const q of [p, p.editCanvas({ width: 600, margin: 70 }), p.editScale({ id: "new-y", reverse: true })]) {
    assert.deepEqual(positions(q, "text"), positions(q, "point").map(([x, y]) => [x, y - 8]));
  }
  const editedOrphan = p.editScale({ id: "y", domain: [0, 100000] }).editCanvas({ width: 500 });
  assert.deepEqual(editedOrphan.resolvedScales["new-y"].domain, [100, 1000]);
  const removed = p.removeMark({ target: "point" }).editCanvas({ width: 500 });
  assert.equal(removed.graphicSpec.objects.text, undefined);
  assert.equal(removed.semanticSpec.guides.axis?.y, undefined);
});

test("categorical and temporal source replacements discard inherited label domain values", () => {
  for (const [fieldType, before, after, expected] of [
    ["nominal", ["A", "B"], ["C", "D"], ["C", "D"]],
    ["temporal", ["2020-01-01", "2021-01-01"], ["2024-01-01", "2025-01-01"], [Date.UTC(2024, 0, 1), Date.UTC(2025, 0, 1)]]
  ]) {
    const b = chart().createCanvas().createData({ values: before.map((value, i) => ({ x: value, next: after[i], y: i })) })
      .createPointMark().encodeX({ field: "x", fieldType }).encodeY({ field: "y" });
    const p = b.createMarkLabels({ value: "label" }).encodeX({ target: "point", field: "next", fieldType });
    assert.deepEqual(p.resolvedScales.x.domain, expected);
    assert.deepEqual(positions(p, "point-labels"), positions(p, "point"));
    assert.deepEqual(p.editCanvas({ width: 640 }).resolvedScales.x.domain, expected);
  }
});

test("independent text still contributes values and blocks rebinding a genuinely shared guide", () => {
  const b = points().editCanvas({ margin: 60 }).createAxes().createTextMark({ data: "data", text: "independent" })
    .encodeX({ field: "x" }).encodeY({ field: "other" });
  assert.deepEqual(b.resolvedScales.y.domain, [1, 1000]);
  assert.throws(() => b.encodeY({ target: "point", field: "other", scale: { id: "new-y" } }), /other consumers/);
  const p = b.removeMark({ target: "text" });
  assert.deepEqual(p.resolvedScales.y.domain, [1, 3]);
});

test("new axes and grids infer the current source scales instead of inherited text aliases", () => {
  const p = points().editCanvas({ margin: 60 }).createTextMark({ source: "point", text: "label" })
    .encodeY({ target: "point", field: "other", scale: { id: "new-y" } });
  const guided = p.createAxes().createGrid();
  assert.equal(guided.semanticSpec.guides.axis.y.scale, "new-y");
  assert.equal(guided.semanticSpec.guides.grid.horizontal.scale, "new-y");
  assert.throws(() => p.createYAxisLine({ scale: "y" }), /requires scale/);
  assert.throws(() => p.createYAxis({ scale: "y", coordinate: "main" }), /no y encoding/);
  assert.throws(() => p.createHorizontalGrid({ scale: "y" }), /no matching/);
  const rule = chart().createCanvas({ margin: 60 }).createData({ values: rows }).createRuleMark()
    .encodeY({ field: "y", fieldType: "quantitative" }).createTextMark({ source: "rule", text: "label" })
    .encodeY({ target: "rule", field: "other", fieldType: "quantitative" }).createYAxis();
  assert.equal(rule.graphicSpec.objects.yAxisTitle.properties.text, "other");
});

test("layered marks and references infer independent sources after editing attached text", () => {
  const p = points().createTextMark({ source: "point", text: "label" })
    .encodeY({ target: "point", field: "other", scale: { id: "new-y" } })
    .encodeText({ target: "text", value: "Updated label" });
  assert.equal(p.context.currentMark, "text");
  const rule = p.createRuleMark();
  assert.equal(rule.semanticSpec.layers.at(-1).encoding.y.scale, "new-y");
  assert.equal(rule.semanticSpec.layers.at(-1).encoding.y.field, "other");
  const reference = p.createReferenceLine({ y: 500 });
  assert.equal(reference.semanticSpec.layers.at(-1).encoding.y.scale, "new-y");
  assert.throws(() => p.createReferenceLine({ source: "text", y: 500 }), /Unknown/);
  assert.throws(() => p.createReferenceBand({ source: "text", y: [200, 500] }), /Unknown/);
});

test("source-owned position edits reject atomically while offsets and source edits remain supported", () => {
  const p = points().createTextMark({ source: "point", text: "label" });
  const before = JSON.stringify([p.semanticSpec, p.graphicSpec, p.trace]);
  for (const method of ["encodeX", "encodeY"]) for (const binding of [{ field: "other" }, { datum: 5 }]) {
    assert.throws(() => p[method]({ target: "text", ...binding }), /source-owned Text positions/);
    assert.equal(JSON.stringify([p.semanticSpec, p.graphicSpec, p.trace]), before);
  }
  const shifted = p.editTextMark({ dx: 3, dy: -8 });
  assert.deepEqual(positions(shifted, "text"), positions(p, "point").map(([x, y]) => [x + 3, y - 8]));
  const pending = chart().createCanvas().createData({ values: rows }).createPointMark()
    .createTextMark({ source: "point", text: "label" });
  assert.throws(() => pending.encodeX({ target: "text", field: "x" }), /source-owned/);
  const complete = pending.encodeX({ target: "point", field: "x" }).encodeY({ target: "point", field: "y" });
  assert.deepEqual(positions(complete, "text"), positions(complete, "point"));
});

test("rule and rectangular source labels use source positions after scale field replacement", () => {
  const rule = points().removeMark({ target: "point" }).createRuleMark({ data: "data" })
    .encodeY({ field: "y", fieldType: "quantitative" })
    .createTextMark({ source: "rule", text: "rule" })
    .encodeY({ target: "rule", field: "other", fieldType: "quantitative" });
  assert.deepEqual(rule.resolvedScales.y.domain, [100, 1000]);
  assert.deepEqual(positions(rule, "text"), rule.graphicSpec.objects.rule.items.map(i => [i.properties.x2, i.properties.y2]));
  const rect = points().removeMark({ target: "point" }).createRectMark({ data: "data" })
    .encodeY({ field: "y" }).encodeY2({ datum: 1001 })
    .createTextMark({ source: "rect", text: "rect" }).encodeY({ target: "rect", field: "other" });
  assert.deepEqual(rect.resolvedScales.y.domain, [100, 1001]);
  assert.deepEqual(positions(rect, "text"), rect.graphicSpec.objects.rect.items.map(i =>
    [i.properties.x + i.properties.width / 2, i.properties.y + i.properties.height / 2]));
});
