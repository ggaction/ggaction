import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { chart } from "../../src/index.js";

const cars = JSON.parse(
  readFileSync(new URL("../../data/cars.json", import.meta.url), "utf8")
).filter(
  row =>
    Number.isFinite(row.Displacement) &&
    typeof row.Origin === "string" &&
    row.Origin.length > 0
);

function histogram(values = cars) {
  return chart()
    .createCanvas({
      width: 432,
      height: 460,
      margin: { top: 80, right: 60, bottom: 130, left: 80 }
    })
    .createData({ id: "cars", values })
    .createBarMark({ id: "bars" })
    .encodeHistogram({ field: "Displacement", maxBins: 10 });
}

test("encodes bar color and materializes zero-stacked category rects", () => {
  const before = histogram();
  const yScale = before.resolvedScales.y;
  const program = before.encodeColor({ field: "Origin" });
  const bars = program.graphicSpec.objects.bars;

  assert.deepEqual(program.semanticSpec.layers[0].encoding.color, {
    field: "Origin",
    fieldType: "nominal",
    scale: "color"
  });
  assert.deepEqual(program.semanticSpec.scales[2], {
    id: "color",
    type: "ordinal",
    domain: "auto",
    range: "auto"
  });
  assert.deepEqual(program.resolvedScales.color.domain, [
    "USA",
    "Europe",
    "Japan"
  ]);
  assert.deepEqual(program.resolvedScales.color.range.slice(0, 3), [
    "#4c78a8",
    "#f58518",
    "#e45756"
  ]);
  assert.deepEqual(program.resolvedScales.y, yScale);
  assert.equal(before.graphicSpec.objects.bars.children.length, 9);
  assert.equal(bars.children.length, 15);
  assert.deepEqual(
    bars.children.slice(0, 3).map(child => child.properties.fill),
    ["#4c78a8", "#f58518", "#e45756"]
  );
  assert.equal(Object.isFrozen(bars.children[0].properties), true);

  const node = program.trace.children.at(-1);
  assert.equal(node.op, "encodeColor");
  assert.deepEqual(node.children.map(child => child.op), [
    "editSemantic",
    "editSemantic",
    "editSemantic",
    "createScale",
    "rematerializeBarMark"
  ]);
  assert.deepEqual(node.children.at(-1).children.slice(0, 3).map(
    child => child.op
  ), ["rematerializeScale", "rematerializeScale", "rematerializeScale"]);
});

test("uses explicit color domain order for stacking and fill", () => {
  const values = [
    { Displacement: 100, Origin: "A" },
    { Displacement: 100, Origin: "B" },
    { Displacement: 100, Origin: "B" }
  ];
  const program = histogram(values).encodeColor({
    field: "Origin",
    scale: {
      domain: ["B", "A"],
      range: ["orange", "blue"]
    }
  });
  const bars = program.graphicSpec.objects.bars.children;

  assert.equal(bars.length, 2);
  assert.deepEqual(
    bars.map(child => child.properties.fill),
    ["orange", "blue"]
  );
  assert.equal(bars[0].properties.height > bars[1].properties.height, true);
  assert.equal(
    bars[0].properties.y,
    bars[1].properties.y + bars[1].properties.height
  );
});

test("rematerializes colored bars after Canvas edits", () => {
  const program = histogram().encodeColor({ field: "Origin" });
  const edited = program.editCanvas({ width: 500, height: 500 });

  assert.equal(edited.graphicSpec.objects.bars.children.length, 15);
  assert.deepEqual(
    edited.graphicSpec.objects.bars.children.slice(0, 3).map(
      child => child.properties.fill
    ),
    ["#4c78a8", "#f58518", "#e45756"]
  );
  assert.notEqual(
    edited.graphicSpec.objects.bars.children[0].properties.width,
    program.graphicSpec.objects.bars.children[0].properties.width
  );
  assert.equal(program.graphicSpec.objects.canvas.properties.width, 432);
});

test("validates bar color prerequisites and complete explicit domains", () => {
  const incomplete = chart()
    .createData({ id: "cars", values: cars })
    .createBarMark({ id: "bars" });

  assert.throws(
    () => incomplete.encodeColor({ field: "Origin" }),
    /requires a complete histogram encoding/
  );

  const program = histogram();
  assert.throws(
    () =>
      program.encodeColor({
        field: "Origin",
        scale: { domain: ["USA"] }
      }),
    /outside the ordinal domain/
  );
  assert.equal(program.semanticSpec.layers[0].encoding.color, undefined);
});
