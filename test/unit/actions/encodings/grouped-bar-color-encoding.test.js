import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const values = [
  { year: 1850, perc: 1, sex: "men" },
  { year: 1850, perc: 9, sex: "women" },
  { year: 1860, perc: 2, sex: "men" },
  { year: 1860, perc: 8, sex: "women" }
];

function aggregateBarProgram() {
  return chart()
    .createCanvas({
      width: 420,
      height: 300,
      margin: { top: 30, right: 40, bottom: 50, left: 60 }
    })
    .createData({ id: "jobs", values })
    .createBarMark({ id: "bars" })
    .encodeX({ field: "year", fieldType: "ordinal" })
    .encodeY({ field: "perc" });
}

test("encodes grouped bar color through a nested xOffset action", () => {
  const before = aggregateBarProgram();
  assert.deepEqual(before.resolvedScales.y.domain, [5, 5]);

  const program = before.encodeColor({ field: "sex", layout: "group" });

  assert.deepEqual(program.semanticSpec.layers[0].encoding.color, {
    field: "sex",
    fieldType: "nominal",
    scale: "color"
  });
  assert.deepEqual(program.semanticSpec.layers[0].encoding.xOffset, {
    field: "sex",
    fieldType: "nominal",
    scale: "xOffset"
  });
  assert.equal(program.semanticSpec.layers[0].encoding.y.stack, null);
  assert.deepEqual(program.resolvedScales.color.domain, ["men", "women"]);
  assert.deepEqual(program.resolvedScales.xOffset.range, [0, 160]);
  assert.deepEqual(program.resolvedScales.y.domain, [0, 10]);
  assert.deepEqual(program.graphicSpec.objects.bars.children, []);

  const node = program.trace.children.at(-1);
  assert.equal(node.op, "encodeColor");
  assert.deepEqual(node.children.map(child => child.op), [
    "editSemantic",
    "editSemantic",
    "editSemantic",
    "createScale",
    "editSemantic",
    "encodeXOffset",
    "rematerializeBarMark"
  ]);
  assert.deepEqual(node.children.at(-1).children.map(child => child.op), [
    "rematerializeScale",
    "rematerializeScale",
    "rematerializeScale",
    "rematerializeScale",
    "editGraphics"
  ]);
});

test("supports explicit grouped color order and palette", () => {
  const program = aggregateBarProgram().encodeColor({
    field: "sex",
    layout: "group",
    scale: {
      domain: ["women", "men"],
      palette: "tableau10"
    }
  });

  assert.deepEqual(program.resolvedScales.color.domain, ["women", "men"]);
  assert.deepEqual(program.resolvedScales.color.range.slice(0, 2), [
    "#4c78a8",
    "#f58518"
  ]);
});

test("validates color layout against the bar policy", () => {
  const program = aggregateBarProgram();

  assert.throws(
    () => program.encodeColor({ field: "sex" }),
    /layout must be "group"/
  );
  assert.throws(
    () => program.encodeColor({ field: "sex", layout: "stack" }),
    /layout must be "group"/
  );
  assert.throws(
    () => program.encodeColor({ field: "sex", layout: "overlay" }),
    /Unsupported color layout/
  );

  const point = chart()
    .createData({ id: "jobs", values })
    .createPointMark({ id: "points" });
  assert.throws(
    () => point.encodeColor({ field: "sex", layout: "group" }),
    /only for bar marks/
  );

  const histogram = chart()
    .createCanvas({ width: 300, height: 240 })
    .createData({ id: "values", values: [{ value: 1, group: "a" }] })
    .createBarMark({ id: "bars" })
    .encodeX({ field: "value", bin: {} })
    .encodeY();
  assert.doesNotThrow(() =>
    histogram.encodeColor({ field: "group", layout: "stack" })
  );
  assert.throws(
    () => histogram.encodeColor({ field: "group", layout: "group" }),
    /layout must be "stack"/
  );
});
