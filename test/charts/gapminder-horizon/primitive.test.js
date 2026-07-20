import assert from "node:assert/strict";
import test from "node:test";

import { render } from "../../../src/index.js";
import { walkGraphicDrawOrder } from
  "../../../src/grammar/schemas/graphicTree.js";
import { calculateHorizon } from "../../oracles/horizon.js";
import { createMockCanvasContext, findCanvasCalls } from
  "../../support/canvas.js";
import { loadGapminder } from "../../support/data.js";
import { createGapminderHorizonPrimitiveResult } from "./primitive.program.js";
import {
  HORIZON_BASELINE,
  HORIZON_BANDS,
  HORIZON_COLORS,
  createGapminderHorizonValues,
  prepareKenyaRows
} from "./reference-values.js";

const gapminder = loadGapminder();

test("locks literal crossing and band-amplitude anchors", () => {
  const result = calculateHorizon([
    { x: 10, y: 5 },
    { x: 0, y: -5 }
  ], {
    xField: "x",
    yField: "y",
    bands: 2,
    baseline: 0,
    extent: 6
  });

  assert.equal(result.groups[0].bandHeight, 3);
  assert.deepEqual(
    result.series.map(series => [
      series.sign,
      series.bandIndex,
      series.points.map(point => [point.x, point.amplitude])
    ]),
    [
      ["negative", 0, [[0, 3], [5, 0]]],
      ["negative", 1, [[0, 2], [5, 0]]],
      ["positive", 0, [[5, 0], [10, 3]]],
      ["positive", 1, [[5, 0], [10, 2]]]
    ]
  );
  const crossing = result.groups[0].segments[0][1];
  assert.equal(crossing.interpolated, true);
  assert.equal(crossing.x, 5);
  assert.equal(crossing.fraction, 0.5);
});

test("preserves amplitude and deterministic sign-band-segment order", () => {
  const values = createGapminderHorizonValues(gapminder);
  const { horizon } = values;
  assert.equal(horizon.groups.length, 1);
  assert.equal(horizon.groups[0].extent, 8.39);
  assert.equal(horizon.groups[0].bandHeight, 8.39 / HORIZON_BANDS);
  assert.deepEqual(
    horizon.series.map(series => [series.sign, series.bandIndex, series.segmentId]),
    [
      ["negative", 0, "0:negative:0"],
      ["negative", 0, "0:negative:1"],
      ["negative", 1, "0:negative:0"],
      ["positive", 0, "0:positive:0"],
      ["positive", 0, "0:positive:1"],
      ["positive", 1, "0:positive:0"],
      ["positive", 2, "0:positive:0"]
    ]
  );

  for (const row of values.rows) {
    const sign = row.life_expect >= HORIZON_BASELINE ? "positive" : "negative";
    const amplitudes = horizon.series.flatMap(series =>
      series.sign === sign
        ? series.points.filter(point => point.sourceRowIndex === values.rows.indexOf(row))
          .map(point => point.amplitude)
        : []
    );
    assert.ok(Math.abs(
      amplitudes.reduce((sum, value) => sum + value, 0) -
      Math.abs(row.life_expect - HORIZON_BASELINE)
    ) < 1e-9);
  }
});

test("supports independent extents, gaps, clipping and all-baseline input", () => {
  const grouped = calculateHorizon([
    { group: "A", x: 0, y: -2 },
    { group: "A", x: 1, y: 4 },
    { group: "B", x: 0, y: -8 },
    { group: "B", x: 1, y: 3 }
  ], {
    xField: "x",
    yField: "y",
    groupBy: "group",
    bands: 2,
    resolve: "independent"
  });
  assert.deepEqual(grouped.groups.map(group => group.extent), [4, 8]);

  const gapped = calculateHorizon([
    { x: 0, y: 2 },
    { x: 1, y: null },
    { x: 2, y: 3 }
  ], { xField: "x", yField: "y" });
  assert.equal(gapped.groups[0].segments.length, 2);
  assert.equal(new Set(gapped.series.map(series => series.segmentId)).size, 2);

  const clipped = calculateHorizon([{ x: 0, y: 9 }], {
    xField: "x",
    yField: "y",
    bands: 2,
    extent: 4
  });
  assert.equal(clipped.series.every(series =>
    series.points.every(point => point.amplitude === 2 && point.overflowed)
  ), true);

  const baseline = calculateHorizon([{ x: 0, y: 5 }], {
    xField: "x",
    yField: "y",
    baseline: 5
  });
  assert.equal(baseline.groups[0].extent, 0);
  assert.deepEqual(baseline.series, []);
});

test("rejects ambiguous or destructive Horizon inputs explicitly", () => {
  assert.throws(
    () => calculateHorizon([
      { group: "A", x: 1, y: 2 },
      { group: "A", x: 1, y: 3 }
    ], { xField: "x", yField: "y", groupBy: "group" }),
    /duplicate x value/
  );
  assert.throws(
    () => calculateHorizon([{ x: 0, y: null }], {
      xField: "x",
      yField: "y",
      missing: "error"
    }),
    /is missing/
  );
  assert.throws(
    () => calculateHorizon([{ x: 0, y: 9 }], {
      xField: "x",
      yField: "y",
      extent: 4,
      overflow: "error"
    }),
    /exceeds extent/
  );
  assert.throws(
    () => calculateHorizon([], { xField: "x", yField: "y", bands: 0 }),
    /positive integer/
  );
});

test("authors a renderer-neutral primitive Horizon tree", () => {
  const input = gapminder.map(row => ({ ...row }));
  const before = structuredClone(input);
  const { program, values } = createGapminderHorizonPrimitiveResult(input);
  assert.deepEqual(input, before);
  input.find(row => row.country === "Kenya").life_expect = 999;
  assert.notEqual(program.semanticSpec.datasets[0].values[0].life_expect, 999);

  const bands = program.graphicSpec.objects.area.items;
  assert.equal(bands.length, 7);
  assert.deepEqual(
    bands.map(item => item.properties.fill),
    values.series.map(series => series.fill)
  );
  assert.equal(bands.every(item =>
    item.properties.commands[0].op === "M" &&
    item.properties.commands.at(-1).op === "Z" &&
    item.properties.commands.some(command => command.op === "C")
  ), true);
  assert.equal(program.graphicSpec.objects.yAxisLine, undefined);
  assert.equal(program.graphicSpec.objects.colorLegend, undefined);
  assert.equal(program.trace.children.some(node =>
    ["encodeHorizon", "editHorizon"].includes(node.op)
  ), false);

  const order = [];
  walkGraphicDrawOrder(program.graphicSpec, ({ id }) => order.push(id));
  assert.ok(order.indexOf("verticalGridLines") < order.indexOf("area"));
  assert.ok(order.indexOf("area") < order.indexOf("xAxisLine"));

  const context = createMockCanvasContext();
  render({
    graphicSpec: program.graphicSpec,
    get semanticSpec() {
      throw new Error("Primitive renderer must not read semanticSpec.");
    }
  }, context);
  assert.equal(findCanvasCalls(context, "fill").length, values.series.length);
  assert.equal(context.canvas.width, 760);
  assert.equal(context.canvas.height, 300);
  assert.deepEqual(values.series.map(series => series.fill), [
    HORIZON_COLORS.negative[0],
    HORIZON_COLORS.negative[0],
    HORIZON_COLORS.negative[1],
    HORIZON_COLORS.positive[0],
    HORIZON_COLORS.positive[0],
    HORIZON_COLORS.positive[1],
    HORIZON_COLORS.positive[2]
  ]);
});
