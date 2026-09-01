import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/ChartProgram.js";

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

function labelsFor(dates, axis = {}) {
  const values = dates.map((date, index) => ({ date, value: index + 1 }));
  return chart()
    .createCanvas({ width: 780, height: 260, margin: 60 })
    .createData({ values })
    .createLineMark()
    .encodeX({ field: "date", fieldType: "temporal" })
    .encodeY({ field: "value", aggregate: "mean" })
    .createXAxis(axis);
}

test("creates complete temporal x and aggregate linear y axes", () => {
  const before = createTemporalLine();
  const program = before.createAxes();

  assert.deepEqual(
    program.graphicSpec.objects.xAxisLabels.items.map(
      child => child.properties.text
    ),
    ["1970", "1972", "1974", "1976", "1978", "1980", "1982"]
  );
  assert.deepEqual(
    program.graphicSpec.objects.xAxisTicks.items.map(
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
  const positions = program.graphicSpec.objects.xAxisTicks.items.map(
    child => child.properties.x1
  );

  assert.equal(positions[0], 80);
  assert.equal(positions.at(-1), 750);
  assert.deepEqual(
    program.graphicSpec.objects.xAxisLabels.items.map(
      child => child.properties.text
    ),
    ["1970", "1972", "1974", "1976", "1978", "1980", "1982"]
  );
  assert.equal(before.graphicSpec.objects.xAxisTicks.items.at(-1).properties.x1, 550);
});

test("spans temporal bar baselines across the complete plot bounds", () => {
  const program = chart()
    .createCanvas({
      width: 720,
      height: 460,
      margin: { top: 52, right: 36, bottom: 52, left: 88 }
    })
    .createData({
      values: [
        { date: Date.UTC(2024, 0, 1), value: 10 },
        { date: Date.UTC(2024, 1, 1), value: 20 },
        { date: Date.UTC(2024, 2, 1), value: 15 }
      ]
    })
    .createBarPlot({
      x: { field: "date", fieldType: "temporal" },
      y: { field: "value" },
      guides: false
    })
    .createGrid({
      horizontal: { values: [0], color: "#d9d9d9", lineWidth: 0.7 }
    })
    .createXAxisLine({ color: "#333333", lineWidth: 0.8 });

  const range = program.resolvedScales.x.range;
  const grid = program.graphicSpec.objects.horizontalGridLines.items[0].properties;
  const axis = program.graphicSpec.objects.xAxisLine.properties;
  const reversedAxis = program.editScale({ id: "x", reverse: true })
    .graphicSpec.objects.xAxisLine.properties;

  assert.ok(range[0] > 88);
  assert.ok(range[1] < 684);
  assert.deepEqual([grid.x1, grid.x2], [88, 684]);
  assert.deepEqual([axis.x1, axis.x2], [88, 684]);
  assert.deepEqual([reversedAxis.x1, reversedAxis.x2], [684, 88]);
});

test("validates temporal axis formatting and explicit tick values", () => {
  const encoded = createTemporalLine();

  assert.deepEqual(
    encoded.createXAxis({
      ticksAndLabels: { labels: { format: "%Y" } }
    }).graphicSpec.objects.xAxisLabels.items.map(
      child => child.properties.text
    ),
    ["1970", "1972", "1974", "1976", "1978", "1980", "1982"]
  );

  assert.throws(
    () => encoded.createXAxis({
      ticksAndLabels: { labels: { format: { decimals: 0 } } }
    }),
    /supported time format/
  );
  assert.throws(
    () => encoded.createXAxis({
      ticksAndLabels: { values: [Date.UTC(1960, 0, 1)] }
    }),
    /inside the scale domain/
  );
});

test("keeps automatic month and day tick labels distinct after rematerialization", () => {
  const months = labelsFor(["2024-01-01", "2024-02-01", "2024-03-01"]);
  const days = labelsFor(["2024-01-01", "2024-01-02", "2024-01-03"]);
  const monthLabels = months.graphicSpec.objects.xAxisLabels.items.map(
    item => item.properties.text
  );
  const dayLabels = days.graphicSpec.objects.xAxisLabels.items.map(
    item => item.properties.text
  );
  const resized = months.editCanvas({ width: 880 });

  assert.equal(new Set(monthLabels).size, monthLabels.length);
  assert.equal(new Set(dayLabels).size, dayLabels.length);
  assert.deepEqual(
    resized.graphicSpec.objects.xAxisLabels.items.map(
      item => item.properties.text
    ),
    monthLabels
  );
  const explicit = labelsFor(
    ["2024-01-01", "2024-02-01", "2024-03-01"],
    { ticksAndLabels: { labels: { format: "%Y-%m" } } }
  );
  assert.ok(
    explicit.graphicSpec.objects.xAxisLabels.items.length >
      new Set(explicit.graphicSpec.objects.xAxisLabels.items.map(
        item => item.properties.text
      )).size
  );
});
