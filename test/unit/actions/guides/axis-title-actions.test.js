import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/ChartProgram.js";

function program() {
  return chart()
    .createCanvas({ width: 200, height: 120, margin: 10 })
    .createData({ id: "data", values: [{ x: 0, y: 5 }, { x: 10, y: 15 }] })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });
}

test("infers title text and materializes centered x/y titles", () => {
  const before = program();
  const result = before.createXAxisTitle().createYAxisTitle();

  assert.equal(result.semanticSpec.guides.axis.x.title, "x");
  assert.equal(result.semanticSpec.guides.axis.y.title, "y");
  assert.deepEqual(result.graphicSpec.objects.xAxisTitle.properties, {
    x: 100, y: 152, text: "x", fill: "#334155", fontSize: 13,
    fontFamily: "sans-serif", fontWeight: 600, textAlign: "center",
    textBaseline: "middle", rotation: 0
  });
  assert.equal(result.graphicSpec.objects.yAxisTitle.properties.x, -42);
  assert.equal(result.graphicSpec.objects.yAxisTitle.properties.y, 60);
  assert.equal(result.graphicSpec.objects.yAxisTitle.properties.rotation, -Math.PI / 2);
  assert.equal(before.semanticSpec.guides.axis, undefined);
});

test("supports start/end and numeric data-space title locations", () => {
  const result = program()
    .createXAxisTitle({ text: "Start", at: "start" })
    .createYAxisTitle({ text: "Ten", at: 10, rotation: 0 });

  assert.equal(result.graphicSpec.objects.xAxisTitle.properties.x, 10);
  assert.equal(result.graphicSpec.objects.yAxisTitle.properties.y, 60);
  assert.equal(result.graphicSpec.objects.yAxisTitle.properties.rotation, 0);
});

test("edits semantic text and appearance while preserving earlier programs", () => {
  const created = program().createXAxisTitle();
  const edited = created.editXAxisTitle({ text: "Horizontal", at: "end", color: "black" });
  const node = edited.trace.children.at(-1);

  assert.equal(edited.semanticSpec.guides.axis.x.title, "Horizontal");
  assert.equal(edited.graphicSpec.objects.xAxisTitle.properties.x, 190);
  assert.equal(edited.graphicSpec.objects.xAxisTitle.properties.fill, "black");
  assert.equal(created.semanticSpec.guides.axis.x.title, "x");
  assert.equal(node.children[0].op, "editSemantic");
});

test("rematerializes titles and validates invalid at values", () => {
  const created = program().createXAxisTitle({ at: "center" });
  const resized = created.editCanvas({ width: 300, margin: 20 });

  assert.equal(resized.graphicSpec.objects.xAxisTitle.properties.x, 150);
  assert.equal(resized.graphicSpec.objects.xAxisTitle.properties.y, 142);
  assert.throws(() => program().createXAxisTitle({ at: 20 }), /inside the scale domain/);
  assert.throws(() => program().createXAxisTitle({ at: "middle" }), /start, center, end/);
});

test("creates mirrored titles and preserves explicit rotation across position edits", () => {
  const base = chart()
    .createCanvas({
      width: 260,
      height: 180,
      margin: { top: 60, right: 70, bottom: 30, left: 30 }
    })
    .createData({ id: "data", values: [{ x: 0, y: 5 }, { x: 10, y: 15 }] })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });
  const created = base
    .createXAxisTitle({ position: "top" })
    .createYAxisTitle({ position: "right" });

  assert.equal(created.graphicSpec.objects.xAxisTitle.properties.y, 18);
  assert.equal(created.graphicSpec.objects.yAxisTitle.properties.x, 242);
  assert.equal(created.graphicSpec.objects.yAxisTitle.properties.rotation, Math.PI / 2);

  const inferred = created.editYAxisTitle({ position: "left" });
  assert.equal(inferred.graphicSpec.objects.yAxisTitle.properties.rotation, -Math.PI / 2);
  const explicit = created
    .editYAxisTitle({ rotation: 0 })
    .editYAxisTitle({ position: "left" });
  assert.equal(explicit.graphicSpec.objects.yAxisTitle.properties.rotation, 0);
  assert.equal(created.guideConfigs.axis.y.title.position, "right");
});

test("preserves explicit y-title rotation through repeated data-space locations", () => {
  const created = program().createYAxisTitle({ rotation: 0, at: 5 });
  const moved = created.editYAxisTitle({ at: 15 });
  const rotated = moved.editYAxisTitle({ rotation: Math.PI / 4, at: 10 });
  const final = rotated.editYAxisTitle({ at: "end" });

  assert.equal(moved.graphicSpec.objects.yAxisTitle.properties.rotation, 0);
  assert.equal(rotated.graphicSpec.objects.yAxisTitle.properties.rotation, Math.PI / 4);
  assert.equal(final.graphicSpec.objects.yAxisTitle.properties.rotation, Math.PI / 4);
  assert.equal(created.guideConfigs.axis.y.title.at, 5);
});

test("rejects mirrored titles when the requested margin is too small", () => {
  assert.throws(
    () => program().createXAxisTitle({ position: "top" }),
    /does not fit the Canvas margin/
  );
  assert.throws(
    () => program().createYAxisTitle({ position: "right" }),
    /does not fit the Canvas margin/
  );
});
