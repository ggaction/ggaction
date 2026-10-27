import { assertEquivalentMeaning } from "../../../support/identity-equivalence.js";
import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { decodeValue, encodeValue } from "../../../../src/persistence/codec.js";
import { cartesianTitleAnchor } from "../../../oracles/cartesian-axis-geometry.js";
import { renderToPNGBuffer } from "../../../../src/renderers/png.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";

function base() {
  return chart().createCanvas({ width: 900, height: 800, margin: 200 })
    .createData({ values: [{ x: 0, y: 0, panel: "A" }, { x: 10, y: 10, panel: "B" }] })
    .createScatterPlot({ x: "x", y: "y", guides: false });
}
const entries = object => object.items?.map(item => item.properties) ?? [object.properties];

test("frame displacement moves all four components together and keeps grids and marks fixed", () => {
  for (const [channel, side] of [["x", "bottom"], ["x", "top"], ["y", "left"], ["y", "right"]]) {
    const create = channel === "x" ? "createXAxis" : "createYAxis";
    const p = base().createGrid({ horizontal: true, vertical: true });
    const before = p[create]({ position: side, title: { offset: 90 } });
    const after = p[create]({ position: side, offset: 20, title: { offset: 90 } });
    const axis = channel === "x" ? "y" : "x";
    const shift = ["bottom", "right"].includes(side) ? 20 : -20;
    for (const suffix of ["Line", "Ticks", "Labels", "Title"]) {
      const a = entries(before.graphicSpec.objects[`${channel}Axis${suffix}`]);
      const b = entries(after.graphicSpec.objects[`${channel}Axis${suffix}`]);
      assert.equal(a.length, b.length);
      a.forEach((old, index) => {
        for (const key of Object.keys(old)) {
          if ([axis, `${axis}1`, `${axis}2`].includes(key)) assert.equal(b[index][key], old[key] + shift);
          else assert.deepEqual(b[index][key], old[key]);
        }
      });
    }
    for (const id of ["scatterPlot", "horizontalGridLines", "verticalGridLines"])
      assert.deepEqual(after.graphicSpec.objects[id], before.graphicSpec.objects[id]);
    assert.deepEqual(after.semanticSpec, before.semanticSpec);
    assert.deepEqual(after.resolvedScales, before.resolvedScales);
  }
});

test("frame/title orthogonal offsets match the independent screen-coordinate oracle", () => {
  const p = base().createXAxis({ offset: 20, title: {
    text: "Inside", offset: -50, alongOffset: 85, align: "right", baseline: "bottom"
  } });
  const expected = cartesianTitleAnchor({ plot: { left: 200, top: 200, width: 500, height: 400 },
    channel: "x", side: "bottom", frameOffset: 20, offset: -50, alongOffset: 85 });
  assert.deepEqual(expected, { x: 535, y: 570 });
  assert.equal(p.graphicSpec.objects.xAxisTitle.properties.x, expected.x);
  assert.equal(p.graphicSpec.objects.xAxisTitle.properties.y, expected.y);
});

test("complete, aggregate and whole edits converge and zero restores plot-edge graphics", () => {
  const p = base().createXAxis();
  const expected = base().createXAxis({ offset: 20 });
  assertEquivalentMeaning(p.editXAxis({ offset: 20 }).graphicSpec, expected.graphicSpec);
  assertEquivalentMeaning(base().createAxes({ x: { offset: 20 }, y: false }).graphicSpec, expected.graphicSpec);
  assertEquivalentMeaning(expected.editXAxis({ offset: 0 }).graphicSpec, p.graphicSpec);
  const moved = expected.editXAxis({ position: "top" });
  assert.equal(moved.guideConfigs.axis.x.frame.offset, 20);
  assert.equal(moved.graphicSpec.objects.xAxisLine.properties.y1, 180);
});

test("component recreation, scale/Canvas refresh, persistence and facets retain the owned frame", () => {
  const p = base().createXAxis({ offset: 20 });
  const recreated = p.editXAxis({ title: false }).createXAxisTitle();
  assert.deepEqual(recreated.graphicSpec, p.graphicSpec);
  const restored = deserializeProgram(serializeProgram(p));
  assert.deepEqual(restored.graphicSpec, p.graphicSpec);
  assert.equal(restored.editCanvas({ height: 900 }).graphicSpec.objects.xAxisLine.properties.y1, 720);
  assert.equal(restored.editScale({ id: "x", domain: [0, 20] }).graphicSpec.objects.xAxisLine.properties.y1, 620);
  const facet = restored.facet({ field: "panel", guides: { axes: "each", legend: false } });
  for (const child of Object.values(facet.children)) {
    assert.equal(child.guideConfigs.axis.x.frame.offset, 20);
    assert.equal(child.graphicSpec.objects.xAxisLine.properties.y1, 620);
  }
  assert.deepEqual(deserializeProgram(serializeProgram(facet)).graphicSpec, facet.graphicSpec);
});

test("invalid frame edits and malformed persisted frames reject atomically", () => {
  const p = base().createXAxis(), before = serializeProgram(p);
  for (const offset of [-1, NaN, Infinity, undefined, null, "20", 10000]) {
    assert.throws(() => p.editXAxis({ offset }));
    assert.throws(() => base().createXAxis({ offset }));
  }
  assert.throws(() => base().editXAxis({ offset: 20 }), /existing/);
  const envelope = JSON.parse(before), state = decodeValue(envelope.payload);
  state.materializationConfigs.guides.axis.x.frame = { offset: -1 };
  envelope.payload = encodeValue(state);
  assert.throws(() => deserializeProgram(JSON.stringify(envelope)));
  assert.equal(serializeProgram(p), before);
});

test("public frame geometry has exact same-run PNG and SVG parity with independent primitive translation", async () => {
  const original = base().createXAxis({ title: { text: "Measurement", offset: 80 } });
  const actual = base().createXAxis({ offset: 20, title: { text: "Measurement", offset: 80 } });
  let primitive = original;
  for (const suffix of ["Line", "Ticks", "Labels", "Title"]) {
    const id = `xAxis${suffix}`, object = original.graphicSpec.objects[id];
    for (const property of ["y", "y1", "y2"]) {
      const values = entries(object).map(properties => properties[property]);
      if (values.every(value => Number.isFinite(value))) {
        primitive = primitive.editGraphics({ target: id, property,
          value: object.items === undefined ? values[0] + 20 : values.map(value => value + 20) });
      }
    }
  }
  assertEquivalentMeaning(actual.graphicSpec, primitive.graphicSpec);
  assert.equal(renderToSVG(actual), renderToSVG(primitive));
  const expectedPng = await renderToPNGBuffer(primitive), actualPng = await renderToPNGBuffer(actual);
  assert.deepEqual(actualPng.buffer, expectedPng.buffer);
});
