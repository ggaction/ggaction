import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../src/index.js";
import { ChartProgram } from "../../../src/ChartProgram.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { guideAnchorItems } from "../../../src/materialization/animation/guideAnchors.js";
import { resolveGuideAnchor, prepareGuideAnchor, sampleGuideAnchor } from "../../../src/grammar/animation/guideAnchors.js";
import { resolveParallelTickValues, valuesFromTickConfig, resolvePolarTickValues, mapPolarGuideValues } from "../../../src/materialization/guides/tickValues.js";

function check(program) {
  const before = serializeProgram(program), items = guideAnchorItems(program);
  const graphics = new Map(Object.entries(program.graphicSpec.objects).flatMap(([id, object]) =>
    [[id, object], ...(object.items ?? []).map(item => [item.id, { ...item, type: object.type }])]));
  for (const item of items) {
    if (item.reason !== undefined) continue;
    const expected = resolveGuideAnchor(item.anchor), graphic = graphics.get(item.graphicId);
    assert.equal(graphic.type, expected.type, item.graphicId);
    for (const [key, value] of Object.entries(expected.properties)) assert.deepEqual(graphic.properties[key], value, `${item.graphicId}.${key}`);
  }
  assert.equal(serializeProgram(program), before);
  assert.deepEqual(guideAnchorItems(deserializeProgram(before)), items);
  return items;
}
const base = () => chart().createCanvas({ width: 600, height: 420, margin: 90 })
  .createData({ id: "source", values: [{ x: 1, y: 0, a: "A" }, { x: 100, y: 10, a: "B" }] })
  .createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" });

test("native numeric and range-role titles project exact anchors through resize and scale edits", () => {
  const p = base().createXAxis({ title: { text: "Amount", at: 10, alongOffset: 3, offset: 35 } })
    .createYAxis({ title: { text: "Value", at: "start", offset: 55, overlap: "allow" } });
  const a = check(p), b = check(p.editCanvas({ width: 800, height: 500 }).editScale({ id: "x", domain: [0, 200] }));
  assert.equal(a.length, 2);
  assert.equal(a[0].anchor.anchor.kind, "value");
  assert.equal(a[1].anchor.anchor.kind, "range");
  for (let i = 0; i < a.length; i++) assert.equal(sampleGuideAnchor(prepareGuideAnchor(a[i].anchor, b[i].anchor), .5).kind, "guide-anchor");
  const labelRelative = p.editXAxisTitle({ offset: { from: "labels", gap: 12 } });
  assert.equal(check(labelRelative).find(item => item.owner === "x").reason, "guide-layout");
  assert.equal(check(base().createXAxis({ title: { text: "Amount" } })).find(item => item.owner === "x").reason, "guide-layout");
  assert.equal(check(p.editXAxisTitle({ at: "end", align: "right", baseline: "bottom", offset: 50 }))[0].anchor.policy.align, "right");
});

test("native polar titles retain exact inside outside and theta frame roles", () => {
  const p = chart().createCanvas({ width: 600, height: 600, margin: 120 })
    .createData({ values: [{ a: 0, r: 0 }, { a: 10, r: 10 }] }).createPointMark()
    .encodeTheta({ field: "a" }).encodeR({ field: "r" })
    .createThetaAxis({ title: { text: "Angle" }, ticksAndLabels: false })
    .createRadialAxis({ angle: 90, title: { text: "Radius", position: "outside", align: "left" }, ticksAndLabels: false });
  const a = check(p), b = check(p.editCanvas({ width: 680, height: 680 }).editRadialAxis({ angle: 120 }));
  assert.equal(a.length, 2);
  for (let i = 0; i < a.length; i++) assert.equal(sampleGuideAnchor(prepareGuideAnchor(a[i].anchor, b[i].anchor), .5).kind, "guide-anchor");
  assert.equal(check(p.editRadialAxisTitle({ position: "inside" }))[1].anchor.policy.position, "inside");
});

test("native band boundary preparation preserves shared edge membership and subset topology", () => {
  const p = chart().createCanvas({ width: 600, height: 400, margin: 70 }).createData({ values: [{ c: 1, v: 1 }, { c: "1", v: 2 }] })
    .createBarMark().encodeX({ field: "c", fieldType: "nominal", scale: { type: "band", paddingInner: 0, paddingOuter: 0 } })
    .encodeY({ field: "v" }).createGrid({ horizontal: false, vertical: { bandPosition: "boundary", alongOffset: 3 } });
  const a = check(p), b = check(p.editCanvas({ width: 800 }));
  assert.equal(a.length, 3); assert.equal(a[1].value.length, 2);
  for (let i = 0; i < a.length; i++) assert.equal(sampleGuideAnchor(prepareGuideAnchor(a[i].anchor, b[i].anchor), .5).kind, "guide-anchor");
  assert.equal(check(p.editVerticalGrid({ values: ["1"] })).length, 2);
  assert.equal(check(p.removeGrid()).length, 0);
  const objects = structuredClone(p.graphicSpec.objects); objects.verticalGridLines.items.pop();
  assert.throws(() => guideAnchorItems(new ChartProgram({ ...p, graphicSpec: { ...p.graphicSpec, objects } })), /stale boundary/);
});

test("native Parallel anchors identify fields while order scales and visible component counts change", () => {
  const p = chart().createCanvas({ width: 600, height: 400, margin: 70 })
    .createData({ values: [{ a: 1, b: 10, c: 100, d: 1000 }, { a: 2, b: 20, c: 200, d: 2000 }] })
    .createParallelCoordinates({ id: "lines", dimensions: ["a", "b", "c", "d"], guides: { legend: false } });
  const a = check(p), q = p.encodeParallelCoordinates({ target: "lines", dimensions: ["d", "a", "c"] });
  const b = check(q), find = (items, field) => items.find(item => item.component === "title" && item.field === field);
  assert.deepEqual(find(a, "a").anchor.slot, { index: 0, count: 4 });
  assert.deepEqual(find(b, "a").anchor.slot, { index: 1, count: 3 });
  assert.equal(sampleGuideAnchor(prepareGuideAnchor(find(a, "a").anchor, find(b, "a").anchor), .5).state.field, "a");
  check(q.editCanvas({ width: 700 }).editParallelAxis({ target: "lines", field: "a", line: false, title: false, ticksAndLabels: { values: [1, 2], labels: { align: "left" } } }));
  const objects = structuredClone(p.graphicSpec.objects); objects.parallelAxisLabels.items.pop();
  assert.throws(() => guideAnchorItems(new ChartProgram({ ...p, graphicSpec: { ...p.graphicSpec, objects } })), /stale field/);
  const malformed = new ChartProgram({ ...p, semanticSpec: { ...p.semanticSpec, layers: [] } });
  assert.throws(() => guideAnchorItems(malformed), /current encoded owner/);
  assert.equal(check(base()).length, 0);
});

test("Parallel preparation and native materialization share their established tick selection", () => {
  const discrete = { type: "band", domain: [1, "1"], range: [0, 100] };
  assert.deepEqual(resolveParallelTickValues(discrete, { mode: "auto" }, "d"), [1, "1"]);
  assert.deepEqual(resolveParallelTickValues({ type: "log", domain: [1, 100], range: [0, 100], base: 10 }, { mode: "auto" }, "d"), [1, 10, 100]);
  for (const scale of [{ type: "pow", exponent: 2 }, { type: "symlog", constant: 2 }, { type: "sqrt" }, { type: "time" }, { type: "linear" }]) {
    assert.ok(resolveParallelTickValues({ ...scale, domain: [1, 100], range: [0, 100] }, { mode: "auto" }, "d").length > 0);
  }
  assert.throws(() => resolveParallelTickValues(discrete, { mode: "count", count: 2 }, "d"), /Ordinal/);
  assert.throws(() => resolveParallelTickValues(discrete, { mode: "values", values: [false] }, "d"), /distinct/);
  assert.throws(() => resolveParallelTickValues(discrete, { mode: "values", values: [1, 1] }, "d"), /distinct/);
  assert.throws(() => resolveParallelTickValues({ type: "linear", domain: [0, 10] }, { mode: "values", values: [11] }, "d"), /distinct/);
  assert.throws(() => resolveParallelTickValues({ type: "linear", domain: [0, 10] }, { mode: "auto", labelMap: [] }, "d"), /categorical/);
  const program = scale => ({ resolvedScales: { value: scale } }), config = { scale: "value", mode: "auto", count: 3 };
  assert.deepEqual(valuesFromTickConfig(program({ type: "log", domain: [1, 100], base: 10 }), config), [1, 10, 100]);
  assert.ok(valuesFromTickConfig(program({ type: "pow", domain: [1, 100], exponent: 2 }), config).length > 0);
  assert.ok(valuesFromTickConfig(program({ type: "symlog", domain: [-100, 100], constant: 2 }), config).length > 0);
  assert.ok(valuesFromTickConfig(program({ type: "sqrt", domain: [0, 100] }), config).length > 0);
  assert.throws(() => valuesFromTickConfig(program(discrete), config), /resolved continuous/);
  const band = program({ ...discrete, step: 50, start: 0, bandwidth: 50, paddingInner: 0, paddingOuter: 0, align: .5 });
  const selected = { scale: "value", mode: "values", values: [1, "1"] };
  assert.deepEqual(mapPolarGuideValues(band, selected), { values: [1, "1"], positions: [25, 75] });
  assert.throws(() => resolvePolarTickValues(band, config), /Discrete theta/);
  assert.throws(() => resolvePolarTickValues(band, { ...selected, values: [false] }), /inside/);
  assert.throws(() => resolvePolarTickValues(program({ type: "linear", domain: [0, 10], range: [0, 100] }), { ...selected, values: [-1] }), /inside/);
});

test("Parallel anchor preparation rejects cumulative mapping work before reading any range", () => {
  let rangeReads = 0;
  const scale = { type: "band", domain: Array.from({ length: 10000 }, (_, index) => index),
    get range() { rangeReads++; throw new Error("Mapping must not run"); } };
  const config = { field: "a", labels: { mode: "values", values: scale.domain.slice(0, 1001), offset: 10 } };
  const program = { semanticSpec: { guides: {}, layers: [{ id: "lines", coordinate: "c", encoding: { parallel: { dimensions: [{ field: "a", scale: "a" }, { field: "b", scale: "b" }] } } }], coordinates: [{ id: "c", type: "parallel" }] },
    guideConfigs: { axis: { parallel: { axes: { target: "lines", dimensions: [config] } } } },
    materializationConfigs: { guides: {}, canvas: { margin: { top: 10, right: 10, bottom: 10, left: 10 } } }, resolvedScales: { a: scale },
    graphicSpec: { objects: { canvas: { type: "canvas", properties: { width: 100, height: 100, margin: { top: 10, right: 10, bottom: 10, left: 10 } } }, parallelAxisLabels: { type: "text", items: [] } } } };
  assert.throws(() => guideAnchorItems(program), /work must not exceed/);
  assert.equal(rangeReads, 0);
});
