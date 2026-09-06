import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";

const rows = [
  { value: 2, date: "2024-01-01" },
  { value: 5, date: "2024-02-01" }
];

function base() {
  return chart()
    .createCanvas({ width: 240, height: 160, margin: 20 })
    .createData({ id: "source", values: rows });
}

test("creates horizontal-measure Rug ticks at the bottom plot edge", () => {
  const actual = base().createRugPlot({
    id: "rug",
    x: { field: "value", scale: { domain: [0, 6] } },
    edge: "bottom",
    tick: { length: 12, stroke: "#2563eb", opacity: 0.5 },
    guides: false
  });
  const expected = base()
    .createTickMark({
      id: "rug", length: 12, stroke: "#2563eb", opacity: 0.5
    })
    .encodeX({ target: "rug", field: "value", fieldType: "quantitative", scale: { domain: [0, 6] } })
    .encodeY({
      target: "rug", datum: 0, fieldType: "quantitative",
      scale: { id: "rugAnchor", domain: [0, 1], zero: false, nice: false }
    })
    .encodeAngle({ target: "rug", value: 0 });
  assert.deepEqual(actual.semanticSpec, expected.semanticSpec);
  assert.deepEqual(actual.graphicSpec, expected.graphicSpec);
  assert.equal(actual.graphicSpec.objects.rug.items.every(item =>
    item.properties.y1 + item.properties.y2 === 280 &&
    item.properties.x1 === item.properties.x2
  ), true);
  assert.deepEqual(actual.trace.children.at(-1).children.map(node => node.op), [
    "createTickMark", "encodeX", "encodeY", "encodeAngle"
  ]);
});

test("places vertical-measure Rug ticks at either horizontal edge", () => {
  for (const [edge, expectedX] of [["left", 20], ["right", 220]]) {
    const program = base().createRugPlot({ y: "value", edge, guides: false });
    assert.equal(program.graphicSpec.objects.rugPlot.items.every(item =>
      item.properties.x1 + item.properties.x2 === expectedX * 2 &&
      item.properties.y1 === item.properties.y2
    ), true);
    assert.equal(program.semanticSpec.layers[0].encoding.angle.datum, 90);
  }
});

test("creates only the measure guide by default", () => {
  const program = chart()
    .createCanvas({
      width: 240,
      height: 200,
      margin: { top: 50, right: 20, bottom: 60, left: 50 }
    })
    .createData({ id: "source", values: rows })
    .createRugPlot({ x: "value", edge: "top" });
  assert.ok(program.guideConfigs.axis.x);
  assert.equal(program.guideConfigs.axis.y, undefined);
  assert.equal(program.semanticSpec.guides.grid, undefined);
  assert.equal(program.semanticSpec.guides.legend, undefined);
});

test("targets an explicit Cartesian coordinate when several are available", () => {
  const program = base()
    .createCoordinate({ id: "overview", type: "cartesian" })
    .createCoordinate({ id: "detail", type: "cartesian" })
    .createRugPlot({ x: "value", edge: "bottom", coordinate: "detail", guides: false });
  assert.equal(program.semanticSpec.layers[0].coordinate, "detail");
  assert.equal(program.trace.children.at(-1).children[1].op, "createCoordinate");
});

test("rejects ambiguous measures, incompatible edges and anchor guides atomically", () => {
  const source = base();
  const before = JSON.stringify(source);
  for (const options of [
    { edge: "bottom" },
    { x: "value", y: "value", edge: "bottom" },
    { x: "value", edge: "left" },
    { y: "value", edge: "top" },
    { x: { field: "value", fieldType: "nominal" }, edge: "bottom" },
    { x: "value", edge: "bottom", guides: { axes: { y: {} } } },
    { x: "value", edge: "bottom", guides: { grid: { horizontal: true } } },
    { x: "value", edge: "bottom", guides: { legend: {} } }
  ]) {
    assert.throws(() => source.createRugPlot(options));
    assert.equal(JSON.stringify(source), before);
  }
});
