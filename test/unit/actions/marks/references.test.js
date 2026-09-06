import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basic } from "../../../../src/basic.js";

function base(values = [{ x: 0, y: 0 }, { x: 10, y: 10 }]) {
  return chart().createCanvas({ width: 480, height: 320, margin: 40 }).createData({ values });
}
function points() { return base().createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" }); }
const items = (p, id) => p.graphicSpec.objects[id].items.map(item => item.properties);
const layer = (p, id) => p.semanticSpec.layers.find(item => item.id === id);

test("data references share inferred source bindings through visible lower actions", () => {
  const source = points();
  const p = source.createReferenceLine({ y: 5 }).createReferenceBand({ x: [2, 6] });
  assert.equal(items(p, "referenceLine")[0].y1, 160);
  assert.deepEqual(items(p, "referenceBand")[0], { x: 120, y: 40, width: 160, height: 240,
    fill: "#94a3b8", opacity: 0.15, stroke: "transparent", strokeWidth: 0 });
  assert.deepEqual(layer(p, "referenceBand").encoding.x, { datum: 2, fieldType: "quantitative", scale: "x" });
  assert.equal(layer(p, "referenceLine").source, undefined);
  assert.equal(layer(p, "referenceBand").data, "data");
  assert.deepEqual(p.trace.children.at(-1).children.map(child => child.op), ["createRectMark", "encodeX", "encodeX2"]);
  assert.equal(source.semanticSpec.layers.length, 1);
  assert.equal(basic().createReferenceLine, undefined);
  assert.equal(basic().createReferenceBand, undefined);
});

test("plot references are row-independent, use bottom-to-top y fractions and resize", () => {
  for (const values of [[], [{ x: 1 }], [{ x: 1 }, { x: 2 }]]) {
    const source = base(values);
    const p = source.createReferenceBand({ space: "plot", y: [0.25, 0.75] })
      .createReferenceLine({ space: "plot", x: 1 });
    assert.deepEqual(p.semanticSpec.datasets, source.semanticSpec.datasets);
    assert.deepEqual(items(p, "referenceBand").map(r => [r.x, r.y, r.width, r.height]), [[40, 100, 400, 120]]);
    assert.equal(items(p, "referenceLine")[0].x1, 440);
    assert.deepEqual(p.trace.children.at(-1).children.map(child => child.op), ["createScale", "createRuleMark", "encodeX"]);
    const resized = p.editCanvas({ width: 680, height: 520, margin: 60 });
    assert.deepEqual(items(resized, "referenceBand").map(r => [r.x, r.y, r.width, r.height]), [[60, 160, 560, 200]]);
    assert.equal(items(resized, "referenceLine")[0].x1, 620);
  }
});

test("data reference constants extend automatic domains and respect explicit domains, log and reverse", () => {
  const p = points().createReferenceLine({ y: 20 });
  assert.equal(items(p, "referenceLine")[0].y1, 40);
  assert.equal(items(p, "point")[1].y, 160);
  const fixed = p.editScale({ id: "y", domain: [0, 10] });
  assert.equal(items(fixed, "referenceLine")[0].y1, -200);
  const log = base([{ x: 1 }, { x: 100 }]).createPointMark().encodeX({ field: "x" }).editScale({ id: "x", type: "log", domain: [1, 100], reverse: true })
    .createReferenceBand({ x: [10, 100] });
  assert.deepEqual(items(log, "referenceBand").map(r => [r.x, r.width]), [[40, 200]]);
});

test("category reference lines preserve literal values and bands reject discrete sources", () => {
  const p = base([{ c: "A", y: 1 }, { c: "B", y: 2 }]).createPointMark()
    .encodeX({ field: "c", fieldType: "nominal" }).encodeY({ field: "y" });
  assert.equal(items(p.createReferenceLine({ x: "B" }), "referenceLine")[0].x1, items(p, "point")[1].x);
  assert.throws(() => p.createReferenceBand({ x: ["A", "B"] }), /eligible/);
});

test("temporal references inherit calendar-year units and accept explicit timestamp units", () => {
  const p = base([{ year: 2020, y: 1 }, { year: 2022, y: 2 }]).createPointMark()
    .encodeX({ field: "year", fieldType: "temporal", temporalUnit: "year" }).encodeY({ field: "y" });
  const a = p.createReferenceLine({ x: 2021 });
  const b = p.createReferenceLine({ x: Date.UTC(2021, 0, 1), temporalUnit: "timestamp" });
  assert.deepEqual(a.graphicSpec, b.graphicSpec);
  assert.equal(layer(a, "referenceLine").encoding.x.temporalUnit, "year");
  const band = p.createReferenceBand({ x: [2020, 2021] });
  assert.equal(items(band, "referenceBand").length, 1);
  assert.equal(items(band, "referenceBand")[0].x, 40);
});

test("explicit source wins, ambiguity rejects, and removed sources leave independent references", () => {
  const p = points().createData({ id: "other", values: [{ x: 100 }, { x: 200 }] })
    .createPointMark({ id: "otherPoint", data: "other" }).encodeX({ field: "x", scale: { id: "otherX" } });
  const a = p.createReferenceLine({ source: "point", x: 5 });
  assert.equal(layer(a, "referenceLine").data, "data");
  assert.equal(items(a, "referenceLine")[0].x1, 240);
  assert.equal(layer(p.createReferenceLine({ x: 150 }), "referenceLine").encoding.x.scale, "otherX");
  assert.throws(() => p._withContext({ currentMark: undefined }).createReferenceLine({ x: 5 }), /ambiguous; provide source/);
  const removed = a.removeMark({ target: "point" });
  assert.equal(items(removed, "referenceLine").length, 1);
  const edited = a.encodeX({ target: "point", field: "x", scale: { id: "newX" } });
  assert.equal(layer(edited, "referenceLine").encoding.x.scale, "x");
});

test("lower owners edit references, attach labels and remove or recreate named plot roles", () => {
  const p = base().createReferenceLine({ space: "plot", y: 0.5 })
    .createMarkLabels({ source: "referenceLine", value: "Target" })
    .editRuleMark({ target: "referenceLine", stroke: "red", strokeWidth: 3 })
    .encodeY({ target: "referenceLine", datum: 0.25 });
  assert.equal(items(p, "referenceLine")[0].y1, 220);
  assert.equal(items(p, "referenceLine-labels")[0].text, "Target");
  const removed = p.removeMark({ target: "referenceLine" });
  assert.equal(removed.graphicSpec.objects["referenceLine-labels"], undefined);
  assert.equal(removed.semanticSpec.scales.some(s => s.id === "referenceLine-y"), true);
  assert.equal(items(removed.createReferenceLine({ space: "plot", y: 0 }), "referenceLine")[0].y1, 280);
  assert.throws(() => removed.editScale({ id: "referenceLine-y", reverse: true })
    .createReferenceLine({ space: "plot", y: 0.5 }), /different definition/);
  const band = base().createReferenceBand({ space: "plot", x: [0.8, 0.2], fill: "red", opacity: 0.5 })
    .editRectMark({ target: "referenceBand", fill: "blue" });
  assert.equal(items(band, "referenceBand")[0].width, 240);
  assert.equal(items(band, "referenceBand")[0].fill, "blue");
  assert.equal(items(base().createReferenceBand({ space: "plot", x: [0.5, 0.5] }), "referenceBand").length, 0);
});

test("invalid reference inputs leave no partial semantic, graphic or trace changes", () => {
  const p = points();
  const before = JSON.stringify([p.semanticSpec, p.graphicSpec, p.trace]);
  for (const [method, args] of [
    ["createReferenceLine", {}], ["createReferenceLine", { x: 1, y: 2 }],
    ["createReferenceLine", { x: 1, space: "screen" }], ["createReferenceLine", { x: 1, space: null }],
    ["createReferenceLine", { x: 1, source: "missing" }], ["createReferenceLine", { x: 1, source: "bad.id" }],
    ["createReferenceLine", { x: 1, data: "data" }], ["createReferenceLine", { x: 1, coordinate: "main" }],
    ["createReferenceLine", { x: 1, unknown: true }], ["createReferenceLine", { x: NaN }],
    ["createReferenceLine", { x: 1, strokeWidth: -1 }], ["createReferenceLine", { x: 1, temporalUnit: "year" }],
    ["createReferenceLine", { x: 1, space: "plot", source: "point" }],
    ["createReferenceLine", { x: 1, space: "plot", temporalUnit: "year" }],
    ["createReferenceLine", { x: 1.1, space: "plot" }], ["createReferenceLine", { x: "0.5", space: "plot" }],
    ["createReferenceLine", { x: 1, space: "plot", data: "missing" }],
    ["createReferenceBand", { x: 1 }], ["createReferenceBand", { x: [1] }],
    ["createReferenceBand", { x: [1, 2, 3] }], ["createReferenceBand", { x: [1, "bad"] }],
    ["createReferenceBand", { x: [0, 1], opacity: 2 }],
    ["createReferenceBand", { x: [0, 1], strokeWidth: 1 }],
    ["createReferenceBand", { x: [-0.1, 1], space: "plot" }]
  ]) {
    assert.throws(() => p[method](args), undefined, `${method} ${JSON.stringify(args)}`);
    assert.equal(JSON.stringify([p.semanticSpec, p.graphicSpec, p.trace]), before);
  }
  assert.throws(() => base().createReferenceLine({ x: 1 }), /eligible/);
  assert.throws(() => chart().createReferenceLine({ space: "plot", x: 0.5 }), /dataset/);
  const created = p.createReferenceLine({ x: 1 });
  assert.throws(() => created.createReferenceLine({ x: 1 }), /ambiguous/);
  assert.throws(() => created.createReferenceLine({ id: "referenceLine", x: 1 }), /already exists/);
  assert.throws(() => base().createScale({ id: "referenceBand-x", domain: [0, 10] })
    .createReferenceBand({ space: "plot", x: [0, 1] }), /different definition/);
});

test("plot bindings require unambiguous Cartesian coordinates and existing data", () => {
  const p = base([]).createCoordinate({ id: "first", type: "cartesian" })
    .createCoordinate({ id: "second", type: "cartesian" });
  assert.throws(() => p.createReferenceLine({ space: "plot", y: 0.5 }), /multiple cartesian/);
  const a = p.createReferenceBand({ space: "plot", x: [0, 1], data: "data", coordinate: "second",
    stroke: "red", strokeWidth: 2 });
  assert.equal(layer(a, "referenceBand").coordinate, "second");
  assert.equal(items(a, "referenceBand")[0].stroke, "red");
  const polar = base([]).createCoordinate({ id: "polar", type: "polar" });
  assert.throws(() => polar.createReferenceLine({ space: "plot", y: 0.5, coordinate: "polar" }), /cartesian/);
  const multiple = base([]).createData({ id: "other", values: [] })._withContext({ currentData: undefined });
  assert.throws(() => multiple.createReferenceBand({ space: "plot", y: [0, 1] }), /multiple datasets/);
  assert.equal(layer(multiple.createReferenceLine({ space: "plot", y: 0.5, data: "other" }), "referenceLine").data, "other");
});
