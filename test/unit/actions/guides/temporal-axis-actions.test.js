import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/core/ChartProgram.js";

const rows = Array.from({ length: 13 }, (_, index) => ({
  year: `${1970 + index}-01-01`,
  value: 10 + index
}));

function createTemporalLine() {
  return chart()
    .createCanvas({
      width: 720,
      height: 460,
      margin: { top: 80, right: 170, bottom: 60, left: 80 }
    })
    .createData({ id: "data", values: rows })
    .createLineMark({ id: "trends" })
    .encodeX({ field: "year", fieldType: "temporal", scale: { nice: true } })
    .encodeY({
      field: "value",
      aggregate: "mean",
      scale: { nice: true, zero: false }
    });
}

test("creates complete temporal x and aggregate linear y axes", () => {
  const before = createTemporalLine();
  const program = before.createAxes();

  assert.deepEqual(
    program.graphicSpec.objects.xAxisLabels.children.map(
      child => child.properties.text
    ),
    ["1970", "1972", "1974", "1976", "1978", "1980", "1982"]
  );
  assert.deepEqual(
    program.graphicSpec.objects.xAxisTicks.children.map(
      child => child.properties.x1
    ),
    [
      80,
      158.27971708875202,
      236.66666666666666,
      314.94638375541865,
      393.3333333333333,
      471.61305042208534,
      550
    ]
  );
  assert.equal(
    program.graphicSpec.objects.xAxisTitle.properties.text,
    "year"
  );
  assert.equal(
    program.graphicSpec.objects.yAxisTitle.properties.text,
    "mean(value)"
  );
  assert.deepEqual(program.semanticSpec.guides.axis, {
    x: { coordinate: "main", scale: "x", title: "year" },
    y: { coordinate: "main", scale: "y", title: "mean(value)" }
  });
  assert.equal(before.graphicSpec.objects.xAxisLine, undefined);
});

test("preserves the aggregate axis action hierarchy", () => {
  const program = createTemporalLine().createAxes();
  const node = program.trace.children.at(-1);

  assert.equal(node.op, "createAxes");
  assert.deepEqual(node.children.map(child => child.op), [
    "createXAxis",
    "createYAxis"
  ]);
  assert.deepEqual(node.children[0].children.map(child => child.op), [
    "editSemantic",
    "createXAxisLine",
    "createXAxisTicksAndLabels",
    "createXAxisTitle"
  ]);
});

test("rematerializes temporal axis geometry after Canvas edits", () => {
  const before = createTemporalLine().createAxes();
  const program = before.editCanvas({ width: 920 });
  const positions = program.graphicSpec.objects.xAxisTicks.children.map(
    child => child.properties.x1
  );

  assert.equal(positions[0], 80);
  assert.equal(positions.at(-1), 750);
  assert.deepEqual(
    program.graphicSpec.objects.xAxisLabels.children.map(
      child => child.properties.text
    ),
    ["1970", "1972", "1974", "1976", "1978", "1980", "1982"]
  );
  assert.equal(before.graphicSpec.objects.xAxisTicks.children.at(-1).properties.x1, 550);
});

test("validates temporal axis formatting and explicit tick values", () => {
  const encoded = createTemporalLine();

  assert.throws(
    () => encoded.createXAxis({
      ticksAndLabels: { labels: { format: { decimals: 0 } } }
    }),
    /Time axis labels currently require format "auto"/
  );
  assert.throws(
    () => encoded.createXAxis({
      ticksAndLabels: { values: [Date.UTC(1960, 0, 1)] }
    }),
    /inside the scale domain/
  );
});
