import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";

const rows = Object.freeze([
  Object.freeze({ x: 1, y: 2, label: "A" }),
  Object.freeze({ x: 4, y: 5, label: "B" }),
  Object.freeze({ x: 8, y: 9, label: "C" })
]);

function base(values = rows) {
  return chart()
    .createCanvas({ width: 480, height: 320, margin: 40 })
    .createData({ values });
}

function item(program, id = "note") {
  return program.graphicSpec.objects[id].items[0].properties;
}

test("independent Text maps constant x/y datum once, including empty datasets", () => {
  const args = { target: "note", datum: 8, scale: { domain: [0, 10] } };
  const before = JSON.stringify(args);
  const p = base([])
    .createTextMark({ id: "note", data: "data", text: "Peak · 9.0", dx: 8, dy: -16, fontWeight: 600 })
    .encodeX(args)
    .encodeY({ target: "note", datum: 9, scale: { domain: [0, 10] } });

  assert.equal(JSON.stringify(args), before);
  assert.deepEqual(p.semanticSpec.layers.at(-1).encoding.x, {
    datum: 8,
    fieldType: "quantitative",
    scale: "x"
  });
  assert.equal(p.graphicSpec.objects.note.items.length, 1);
  assert.deepEqual(
    Object.fromEntries(["x", "y", "text", "fontWeight"].map(key => [key, item(p)[key]])),
    { x: 368, y: 48, text: "Peak · 9.0", fontWeight: 600 }
  );

  const resized = p.editCanvas({ width: 580 });
  assert.equal(item(resized).x, 448);
  assert.equal(item(resized).y, 48);
  assert.equal(p.graphicSpec.objects.canvas.properties.width, 480);
});

test("Text datum broadcasts at field grain and all-constant Text ignores dataset length", () => {
  const mixed = base()
    .createTextMark({ id: "mixed", data: "data", text: "row" })
    .encodeX({ target: "mixed", field: "x" })
    .encodeY({ target: "mixed", datum: 5 });
  assert.equal(mixed.graphicSpec.objects.mixed.items.length, 3);
  assert.deepEqual(
    mixed.graphicSpec.objects.mixed.items.map(entry => entry.properties.y),
    [160, 160, 160]
  );

  const constant = mixed.encodeX({ target: "mixed", datum: 4 });
  assert.equal(constant.graphicSpec.objects.mixed.items.length, 1);
  assert.equal(constant.graphicSpec.objects.mixed.items[0].properties.text, "row");

  const fieldText = constant.encodeText({ target: "mixed", field: "label" });
  assert.equal(fieldText.graphicSpec.objects.mixed.items.length, 3);
  assert.deepEqual(
    fieldText.graphicSpec.objects.mixed.items.map(entry => entry.properties.text),
    ["A", "B", "C"]
  );
  assert.deepEqual(fieldText.semanticSpec.datasets[0].values, rows);
});

test("Text datum supports quantitative, categorical, and temporal scale families", () => {
  const categorical = base([])
    .createTextMark({ id: "note", data: "data", text: "Milestone" })
    .encodeX({ target: "note", datum: "B", fieldType: "nominal" })
    .encodeY({
      target: "note",
      datum: "2025-01-02",
      fieldType: "temporal",
      scale: { nice: false }
    });
  assert.deepEqual(categorical.resolvedScales.x.domain, ["B"]);
  assert.equal(categorical.semanticSpec.scales.find(scale => scale.id === "y").type, "time");
  assert.equal(categorical.graphicSpec.objects.note.items.length, 1);
  assert.ok(Number.isFinite(item(categorical).x));
  assert.ok(Number.isFinite(item(categorical).y));
});

test("independent Text datum contributes to shared automatic domains", () => {
  const source = base()
    .createPointMark()
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });
  const p = source
    .createTextMark({ id: "note", data: "data", text: "outside" })
    .encodeX({ target: "note", datum: 10, scale: { id: "x" } })
    .encodeY({ target: "note", datum: 12, scale: { id: "y" } });
  assert.deepEqual(p.resolvedScales.x.domain, [1, 10]);
  assert.deepEqual(p.resolvedScales.y.domain, [2, 12]);
  assert.equal(p.graphicSpec.objects.note.items.length, 1);
  assert.equal(source.resolvedScales.x.domain.at(-1), 8);
});

test("Text datum validation is atomic and source-owned Text remains indirect", () => {
  const independent = base().createTextMark({ id: "note", data: "data", text: "note" });
  const semanticBefore = JSON.stringify(independent.semanticSpec);
  const traceBefore = JSON.stringify(independent.trace);
  for (const [options, pattern] of [
    [{ target: "note" }, /exactly one of field or datum/],
    [{ target: "note", field: "x", datum: 1 }, /exactly one of field or datum/],
    [{ target: "note", datum: Infinity, fieldType: "quantitative" }, /finite number/],
    [{ target: "note", datum: {}, fieldType: "nominal" }, /nominal value/],
    [{ target: "note", datum: 1, aggregate: "sum" }, /does not support aggregate/]
  ]) {
    assert.throws(() => independent.encodeX(options), pattern);
    assert.equal(JSON.stringify(independent.semanticSpec), semanticBefore);
    assert.equal(JSON.stringify(independent.trace), traceBefore);
  }

  const attached = base()
    .createPointMark()
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .createTextMark({ source: "point", text: "label" });
  assert.throws(
    () => attached.encodeX({ target: "text", datum: 4 }),
    /cannot replace source-owned Text positions/
  );
});
