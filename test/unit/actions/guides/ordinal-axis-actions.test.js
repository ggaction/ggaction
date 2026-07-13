import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const values = [
  { year: 1850, perc: 1, sex: "men" },
  { year: 1850, perc: 9, sex: "women" },
  { year: 1860, perc: 2, sex: "men" },
  { year: 1860, perc: 8, sex: "women" }
];

function groupedBars(xScale = {}) {
  return chart()
    .createCanvas({
      width: 420,
      height: 300,
      margin: { top: 30, right: 40, bottom: 50, left: 60 }
    })
    .createData({ id: "jobs", values })
    .createBarMark({ id: "bars" })
    .encodeX({ field: "year", fieldType: "ordinal", scale: xScale })
    .encodeY({ field: "perc" })
    .encodeColor({ field: "sex", layout: "group" })
    .encodeBarWidth();
}

test("creates a complete ordinal x axis at category centers", () => {
  const before = groupedBars();
  const program = before.createXAxis();

  assert.deepEqual(program.semanticSpec.guides.axis.x, {
    scale: "x",
    title: "year"
  });
  assert.deepEqual(
    program.graphicSpec.objects.xAxisTicks.children.map(
      child => child.properties.x1
    ),
    [140, 300]
  );
  assert.deepEqual(
    program.graphicSpec.objects.xAxisLabels.children.map(
      child => child.properties.text
    ),
    ["1850", "1860"]
  );
  assert.deepEqual(
    program.graphicSpec.objects.xAxisLabels.children.map(
      child => child.properties.x
    ),
    [140, 300]
  );

  const node = program.trace.children.at(-1);
  assert.equal(node.op, "createXAxis");
  assert.deepEqual(node.children.map(child => child.op), [
    "createXAxisLine",
    "createXAxisTicksAndLabels",
    "createXAxisTitle"
  ]);
  assert.equal(before.semanticSpec.guides.axis, undefined);
});

test("supports explicit ordinal values and reversed x ranges", () => {
  const program = groupedBars({ range: [380, 60] }).createXAxis({
    ticksAndLabels: { values: [1860] }
  });

  assert.deepEqual(
    program.graphicSpec.objects.xAxisTicks.children.map(
      child => child.properties.x1
    ),
    [140]
  );
  assert.deepEqual(
    program.graphicSpec.objects.xAxisLabels.children.map(
      child => child.properties.text
    ),
    ["1860"]
  );
});

test("rematerializes ordinal axis positions after Canvas edits", () => {
  const before = groupedBars().createXAxis();
  const after = before.editCanvas({ width: 620 });

  assert.deepEqual(
    after.graphicSpec.objects.xAxisLabels.children.map(
      child => child.properties.x
    ),
    [190, 450]
  );
  assert.deepEqual(
    before.graphicSpec.objects.xAxisLabels.children.map(
      child => child.properties.x
    ),
    [140, 300]
  );
});

test("validates ordinal axis count and requested values", () => {
  const program = groupedBars();

  assert.throws(
    () => program.createXAxis({ ticksAndLabels: { count: 1 } }),
    /not count/
  );
  assert.throws(
    () => program.createXAxis({ ticksAndLabels: { values: [1900] } }),
    /inside the scale domain/
  );
  assert.throws(
    () => program.createXAxis({
      ticksAndLabels: { labels: { format: { decimals: 0 } } }
    }),
    /require format "auto"/
  );
});
