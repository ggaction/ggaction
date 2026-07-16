import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const values = [
  { year: 1850, perc: 1, sex: "men" },
  { year: 1850, perc: 9, sex: "women" },
  { year: 1860, perc: 2, sex: "men" },
  { year: 1860, perc: 8, sex: "women" }
];

function groupedBarProgram(rows = values) {
  return chart()
    .createCanvas({
      width: 420,
      height: 300,
      margin: { top: 30, right: 40, bottom: 50, left: 60 }
    })
    .createData({ id: "jobs", values: rows })
    .createBarMark({ id: "bars" })
    .encodeX({ field: "year", fieldType: "ordinal" })
    .encodeY({ field: "perc" })
    .encodeColor({ field: "sex", layout: "group" });
}

test("materializes grouped rectangles with the default band", () => {
  const before = groupedBarProgram();
  const program = before.encodeBarWidth();
  const rectangles = program.graphicSpec.objects.bars.children.map(
    child => child.properties
  );

  assert.deepEqual(program.markConfigs.bars, {
    xOffset: { paddingInner: 0, paddingOuter: 0 },
    barWidth: { band: 0.72 }
  });
  assert.equal(rectangles.length, 4);
  assert.deepEqual(
    rectangles.map(rect => Number(rect.width.toFixed(6))),
    [57.6, 57.6, 57.6, 57.6]
  );
  assert.deepEqual(
    rectangles.map(rect => Number(rect.x.toFixed(6))),
    [71.2, 151.2, 231.2, 311.2]
  );
  assert.deepEqual(rectangles.map(rect => rect.fill), [
    "#4c78a8", "#f58518", "#4c78a8", "#f58518"
  ]);
  assert.deepEqual(rectangles.map(rect => rect.height), [22, 198, 44, 176]);
  assert.equal(before.graphicSpec.objects.bars.children.length, 0);

  const node = program.trace.children.at(-1);
  assert.equal(node.op, "encodeBarWidth");
  assert.deepEqual(node.args, {});
  assert.deepEqual(node.children.map(child => child.op), [
    "rematerializeBarMark"
  ]);
  assert.deepEqual(node.children[0].children.map(child => child.op), [
    "rematerializeScale",
    "rematerializeScale",
    "rematerializeScale",
    "rematerializeScale",
    "editGraphics",
    "editGraphics",
    "editGraphics",
    "editGraphics",
    "editGraphics",
    "editGraphics",
    "editGraphics",
    "editGraphics"
  ]);
});

test("supports an explicit band and omits missing category cells", () => {
  const missing = values.filter(
    row => !(row.year === 1850 && row.sex === "women")
  );
  const program = groupedBarProgram(missing).encodeBarWidth({ band: 0.5 });
  const rectangles = program.graphicSpec.objects.bars.children;

  assert.equal(rectangles.length, 3);
  assert.equal(rectangles.every(child => child.properties.width === 40), true);
  assert.equal(program.markConfigs.bars.barWidth.band, 0.5);
});

test("replaces an existing bar width through the same assignment", () => {
  const before = groupedBarProgram().encodeBarWidth({ band: 0.5 });
  const after = before.encodeBarWidth({ band: 0.8 });

  assert.equal(before.markConfigs.bars.barWidth.band, 0.5);
  assert.equal(after.markConfigs.bars.barWidth.band, 0.8);
  assert.equal(before.graphicSpec.objects.bars.children[0].properties.width, 40);
  assert.equal(after.graphicSpec.objects.bars.children[0].properties.width, 64);
  assert.equal(after.trace.children.at(-1).op, "encodeBarWidth");
});

test("supports fixed logical pixels and retains an omitted reassignment mode", () => {
  const fixed = groupedBarProgram().encodeBarWidth({ pixels: 14 });
  const retained = fixed.encodeBarWidth();

  assert.deepEqual(fixed.markConfigs.bars.barWidth, { pixels: 14 });
  assert.deepEqual(retained.markConfigs.bars.barWidth, { pixels: 14 });
  assert.equal(
    retained.graphicSpec.objects.bars.children.every(
      child => child.properties.width === 14
    ),
    true
  );
  const resized = retained.editCanvas({ width: 620 });
  assert.equal(
    resized.graphicSpec.objects.bars.children.every(
      child => child.properties.width === 14
    ),
    true
  );
});

test("allows an explicit pixel width wider than its group slot", () => {
  const program = groupedBarProgram().encodeBarWidth({ pixels: 120 });
  assert.equal(program.graphicSpec.objects.bars.children[0].properties.width, 120);
});

test("uses one explicit domain order for color and group slots", () => {
  const program = chart()
    .createCanvas({
      width: 420,
      height: 300,
      margin: { top: 30, right: 40, bottom: 50, left: 60 }
    })
    .createData({ id: "jobs", values })
    .createBarMark({ id: "bars" })
    .encodeX({ field: "year", fieldType: "ordinal" })
    .encodeY({ field: "perc" })
    .encodeColor({
      field: "sex",
      layout: "group",
      scale: { domain: ["women", "men"] }
    })
    .encodeBarWidth();
  const rectangles = program.graphicSpec.objects.bars.children.map(
    child => child.properties
  );

  assert.deepEqual(program.resolvedScales.xOffset.domain, ["women", "men"]);
  assert.deepEqual(rectangles.slice(0, 2).map(rect => rect.fill), [
    "#4c78a8",
    "#f58518"
  ]);
  assert.deepEqual(
    rectangles.slice(0, 2).map(rect => Number(rect.x.toFixed(6))),
    [71.2, 151.2]
  );
});

test("rematerializes grouped rectangles after Canvas edits", () => {
  const program = groupedBarProgram().encodeBarWidth();
  const edited = program.editCanvas({ width: 620, height: 400 });

  assert.equal(
    edited.graphicSpec.objects.bars.children[0].properties.width,
    93.6
  );
  assert.notEqual(
    edited.graphicSpec.objects.bars.children[0].properties.height,
    program.graphicSpec.objects.bars.children[0].properties.height
  );
  assert.equal(program.graphicSpec.objects.canvas.properties.width, 420);
});

test("validates grouped bar width options and prerequisites", () => {
  const program = groupedBarProgram();

  for (const band of [0, -1, 1.1, NaN]) {
    assert.throws(
      () => program.encodeBarWidth({ band }),
      /greater than 0 and at most 1/
    );
  }
  for (const pixels of [0, -1, Infinity, NaN]) {
    assert.throws(
      () => program.encodeBarWidth({ pixels }),
      /positive finite/
    );
  }
  assert.throws(
    () => program.encodeBarWidth({ band: 0.5, pixels: 10 }),
    /mutually exclusive/
  );
  assert.throws(
    () => program.encodeBarWidth({ band: 0.5, width: 10 }),
    /Unknown encodeBarWidth option/
  );

  const incomplete = chart()
    .createCanvas({ width: 200, height: 200 })
    .createData({ id: "jobs", values })
    .createBarMark({ id: "bars" })
    .encodeX({ field: "year", fieldType: "ordinal" })
    .encodeY({ field: "perc" });
  const uncolored = incomplete.encodeBarWidth();
  assert.deepEqual(uncolored.markConfigs.bars.barWidth, { band: 0.72 });
  assert.deepEqual(program.markConfigs, {
    bars: { xOffset: { paddingInner: 0, paddingOuter: 0 } }
  });
});

test("requires an explicit target when more than one bar mark is eligible", () => {
  const ambiguous = groupedBarProgram()
    .createBarMark({ id: "other" })
    .encodeX({
      field: "year",
      fieldType: "ordinal",
      scale: { id: "otherX" }
    })
    .encodeY({ field: "perc", scale: { id: "otherY" } })
    .encodeColor({
      field: "sex",
      layout: "group",
      scale: { id: "otherColor" }
    })
    ._withContext({ currentMark: undefined });

  assert.throws(
    () => ambiguous.encodeBarWidth(),
    /bar mark target is ambiguous/
  );
  assert.deepEqual(ambiguous.markConfigs.bars, {
    xOffset: { paddingInner: 0, paddingOuter: 0 }
  });
});
