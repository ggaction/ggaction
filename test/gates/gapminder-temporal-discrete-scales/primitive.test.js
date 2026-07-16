import assert from "node:assert/strict";
import test from "node:test";

import { loadGapminder } from "../../support/data.js";
import {
  createGapminderBandPointPrimitives,
  createGapminderTimePrimitives
} from "./primitive.program.js";
import {
  createBandPointReference,
  createTimeReference,
  normalizeUtcTemporalReference
} from "./reference-values.js";

const gapminder = loadGapminder();

test("normalizes temporal years and calendar strings through UTC references", () => {
  assert.equal(normalizeUtcTemporalReference(1955), Date.UTC(1955, 0, 1));
  assert.equal(
    normalizeUtcTemporalReference("1990-08-05"),
    Date.UTC(1990, 7, 5)
  );
  assert.equal(
    normalizeUtcTemporalReference("1997/08/21"),
    Date.UTC(1997, 7, 21)
  );
  assert.throws(() => normalizeUtcTemporalReference("not-a-date"), /UTC timestamp/);
});

test("locks band width, padding, and zero-bandwidth point centers", () => {
  const values = createBandPointReference(gapminder);

  assert.equal(values.rows.length, 6);
  assert.ok(Math.abs(values.band.step - 60.666666666666664) < 1e-10);
  assert.ok(Math.abs(values.band.bandwidth - 48.53333333333333) < 1e-10);
  assert.equal(values.band.paddingInner, 0.2);
  assert.equal(values.band.paddingOuter, 0.1);
  assert.equal(values.point.bandwidth, 0);
  assert.equal(values.point.padding, 0.5);
  assert.equal(values.point.align, 0.5);
  assert.deepEqual(values.centers, [
    100.33333333333333,
    161,
    221.66666666666666,
    282.3333333333333,
    343,
    403.66666666666663
  ]);
  values.bars.forEach((bar, index) => {
    assert.ok(Math.abs(bar.x + bar.width / 2 - values.centers[index]) < 1e-10);
  });
});

test("authors explicit band and point semantics with primitive calls only", () => {
  const values = createBandPointReference(gapminder);
  const program = createGapminderBandPointPrimitives(gapminder);
  const scales = Object.fromEntries(
    program.semanticSpec.scales.map(scale => [scale.id, scale])
  );

  assert.deepEqual(scales.x, {
    id: "x",
    type: "band",
    domain: "auto",
    range: "auto",
    paddingInner: 0.2,
    paddingOuter: 0.1,
    align: 0.5
  });
  assert.equal(scales.countryPoint, undefined);
  assert.equal(program.semanticSpec.layers[0].encoding.x.scale, "x");
  assert.equal(program.semanticSpec.layers[1].encoding.x.scale, "x");
  assert.equal(program.semanticSpec.layers[0].encoding.y.scale, "y");
  assert.equal(program.semanticSpec.layers[1].encoding.y.scale, "y");
  assert.deepEqual(
    program.graphicSpec.objects.bar.children.map(child => child.properties.x),
    values.bars.map(bar => bar.x)
  );
  assert.deepEqual(
    program.graphicSpec.objects.point.children.map(child => child.properties.x),
    values.centers
  );
  assert.equal(
    program.graphicSpec.order.indexOf("horizontalGridLines") <
      program.graphicSpec.order.indexOf("bar"),
    true
  );
  assert.equal(
    program.graphicSpec.order.indexOf("bar") <
      program.graphicSpec.order.indexOf("point"),
    true
  );
  assert.equal(program.trace.children.every(node =>
    ["editSemantic", "createGraphics", "editGraphics"].includes(node.op)
  ), true);
});

test("locks UTC time positions and one path per line series", () => {
  const values = createTimeReference(gapminder);
  const program = createGapminderTimePrimitives(gapminder);
  const scale = program.semanticSpec.scales.find(item => item.id === "x");

  assert.deepEqual(values.xTickYears, [1955, 1965, 1975, 1985, 1995, 2005]);
  assert.deepEqual(values.xTicks, values.xTickYears.map(year => Date.UTC(year, 0, 1)));
  assert.deepEqual(values.xDomain, [Date.UTC(1955, 0, 1), Date.UTC(2005, 0, 1)]);
  assert.deepEqual(values.yDomain, [20, 80]);
  assert.equal(values.series.length, 3);
  assert.equal(values.series.every(series => series.commands.length === 11), true);
  assert.deepEqual(scale, {
    id: "x",
    type: "time",
    domain: "auto",
    range: "auto",
    nice: true
  });
  assert.deepEqual(
    program.graphicSpec.objects.line.children.map(child => child.properties.commands),
    values.series.map(series => series.commands)
  );
  assert.deepEqual(
    program.graphicSpec.objects.xAxisLabels.children.map(
      child => child.properties.text
    ),
    values.xTickYears.map(String)
  );
  assert.equal(program.trace.children.every(node =>
    ["editSemantic", "createGraphics", "editGraphics"].includes(node.op)
  ), true);
});
