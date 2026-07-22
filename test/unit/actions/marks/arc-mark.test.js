import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const rows = Object.freeze([
  Object.freeze({ category: "A", value: 2, series: "first" }),
  Object.freeze({ category: "A", value: 1, series: "second" }),
  Object.freeze({ category: "B", value: 3, series: "first" }),
  Object.freeze({ category: "B", value: 0, series: "second" })
]);

function base(options = {}) {
  return chart()
    .createCanvas({ width: 300, height: 300, margin: 30 })
    .createData({ values: rows })
    .createArcMark(options);
}

function radial(order = "theta-first") {
  const program = base({ innerRadius: 0.2, padAngle: 2 });
  const theta = current => current.encodeTheta({
    field: "category",
    fieldType: "nominal"
  });
  const radius = current => current.encodeR({
    field: "value",
    scale: { domain: [0, 3] }
  });
  return (order === "theta-first" ? radius(theta(program)) : theta(radius(program)))
    .encodeColor({ field: "series", layout: "overlay" });
}

test("materializes count theta as proportional donut sectors", () => {
  const program = base({ innerRadius: 0.5, padAngle: 1 })
    .encodeTheta({ field: "category", aggregate: "count" })
    .encodeColor({ field: "category" });
  const items = program.graphicSpec.objects.arc.items;

  assert.equal(items.length, 2);
  assert.deepEqual(program.semanticSpec.layers[0].encoding.theta, {
    field: "category",
    fieldType: "nominal",
    aggregate: "count",
    scale: "theta"
  });
  assert.deepEqual(items.map(item => item.properties.fill), [
    "#4c78a8",
    "#f58518"
  ]);
  assert.equal(items.every(item => item.properties.commands.at(-1).op === "Z"), true);
  assert.equal(items[0].properties.commands[0].op, "M");
});

test("materializes weighted theta and removes stale weight when reassigned to count", () => {
  const initial = base({ innerRadius: 0.4 })
    .encodeTheta({
      field: "category",
      aggregate: "sum",
      weight: "value"
    })
    .encodeColor({ field: "category" });
  const reassigned = initial.encodeTheta({
    field: "category",
    aggregate: "count"
  });

  assert.deepEqual(initial.semanticSpec.layers[0].encoding.theta, {
    field: "category",
    fieldType: "nominal",
    aggregate: "sum",
    weight: "value",
    scale: "theta"
  });
  assert.equal(initial.graphicSpec.objects.arc.items.length, 2);
  assert.equal(reassigned.semanticSpec.layers[0].encoding.theta.weight, undefined);
  assert.equal(reassigned.semanticSpec.layers[0].encoding.theta.aggregate, "count");
  assert.equal(reassigned.graphicSpec.objects.arc.items.length, 2);
  assert.equal(initial.semanticSpec.layers[0].encoding.theta.weight, "value");
  const thetaTrace = initial.trace.children.find(node => node.op === "encodeTheta");
  assert.equal(
    thetaTrace.children.some(node => node.op === "rematerializeArcMark"),
    true
  );
});

test("keeps incomplete arc collections empty and converges across encoding order", () => {
  const thetaOnly = base().encodeTheta({
    field: "category",
    fieldType: "nominal"
  });
  const thetaFirst = radial("theta-first");
  const radiusFirst = radial("radius-first");

  assert.equal(thetaOnly.graphicSpec.objects.arc.items.length, 0);
  assert.deepEqual(radiusFirst.semanticSpec.layers, thetaFirst.semanticSpec.layers);
  assert.deepEqual(radiusFirst.semanticSpec.coordinates, thetaFirst.semanticSpec.coordinates);
  assert.deepEqual(
    [...radiusFirst.semanticSpec.scales].sort((a, b) => a.id.localeCompare(b.id)),
    [...thetaFirst.semanticSpec.scales].sort((a, b) => a.id.localeCompare(b.id))
  );
  assert.deepEqual(radiusFirst.graphicSpec, thetaFirst.graphicSpec);
  assert.deepEqual(radiusFirst.resolvedScales, thetaFirst.resolvedScales);
});

test("uses circular theta bands, inner radial range, larger-first overlay, and zero omission", () => {
  const program = radial();
  const items = program.graphicSpec.objects.arc.items;

  assert.deepEqual(program.resolvedScales.theta.range, [-90, 270]);
  assert.deepEqual(program.resolvedScales.radius.range, [24, 120]);
  assert.equal(items.length, 3);
  assert.deepEqual(items.map(item => item.properties.fill), [
    "#4c78a8",
    "#f58518",
    "#4c78a8"
  ]);
  assert.equal(
    items[0].properties.commands[0].x !== items[1].properties.commands[0].x,
    true
  );
});

test("rematerializes arc geometry after focused mark, scale, and Canvas edits", () => {
  const original = radial();
  const edited = original.editArcMark({ innerRadius: 0.3, padAngle: 4 });
  const reversed = original.editScale({ id: "theta", reverse: true });
  const resized = original.editCanvas({ width: 360, height: 340 });

  assert.deepEqual(edited.resolvedScales.radius.range, [36, 120]);
  assert.notDeepEqual(edited.graphicSpec, original.graphicSpec);
  assert.notDeepEqual(reversed.graphicSpec, original.graphicSpec);
  assert.notDeepEqual(resized.graphicSpec, original.graphicSpec);
  assert.equal(original.markConfigs.arc.innerRadius, 0.2);
});

test("disables and restores arc outlines without stale widths", () => {
  const original = radial().editArcMark({
    stroke: "#111111",
    strokeWidth: 5
  });
  const disabled = original.editArcMark({ stroke: false });
  const resized = disabled.editCanvas({ width: 340 });
  const restored = resized.editArcMark({ stroke: "#2563eb" });

  assert.equal(disabled.markConfigs.arc.stroke, false);
  assert.equal(disabled.markConfigs.arc.strokeWidth, undefined);
  for (const program of [disabled, resized]) {
    assert.equal(program.graphicSpec.objects.arc.items.every(item =>
      item.properties.stroke === "transparent" &&
      item.properties.strokeWidth === 0
    ), true);
  }
  assert.equal(restored.markConfigs.arc.stroke, "#2563eb");
  assert.equal(restored.markConfigs.arc.strokeWidth, 1);
  assert.equal(restored.graphicSpec.objects.arc.items.every(item =>
    item.properties.stroke === "#2563eb" &&
    item.properties.strokeWidth === 1
  ), true);
  assert.throws(
    () => original.editArcMark({ stroke: false, strokeWidth: 2 }),
    /cannot set strokeWidth while removing stroke/
  );
  assert.throws(
    () => disabled.editArcMark({ strokeWidth: 2 }),
    /requires an active stroke/
  );
});

test("accepts color before complete position without materializing too early", () => {
  const program = base()
    .encodeColor({ field: "series", layout: "overlay" })
    .encodeR({ field: "value", scale: { domain: [0, 3] } })
    .encodeTheta({ field: "category", fieldType: "nominal" });

  assert.equal(program.graphicSpec.objects.arc.items.length, 3);
});

test("rejects incompatible arc position and appearance contracts atomically", () => {
  const program = base();
  const before = JSON.stringify(program);

  assert.throws(
    () => program.encodeTheta({ field: "value" }),
    /does not support field type|requires an ordinal or nominal/
  );
  assert.throws(
    () => program.encodeTheta({
      field: "category",
      fieldType: "nominal",
      aggregate: "mean"
    }),
    /supports only "count" or "sum"/
  );
  assert.throws(
    () => program.encodeTheta({
      field: "category",
      aggregate: "sum"
    }),
    /requires weight/
  );
  assert.throws(
    () => program.encodeTheta({
      field: "category",
      aggregate: "count",
      weight: "value"
    }),
    /weight requires aggregate: "sum"/
  );
  assert.throws(
    () => radial().editArcMark({ fill: "red" }),
    /cannot be combined with a color encoding/
  );
  assert.equal(JSON.stringify(program), before);
});

test("rejects invalid weighted theta rows before state or trace changes", () => {
  for (const value of [-1, Infinity, NaN, undefined, "2"]) {
    const program = chart()
      .createCanvas({ width: 300, height: 300, margin: 30 })
      .createData({ values: [{ category: "A", weight: value }] })
      .createArcMark();
    const before = JSON.stringify(program);

    assert.throws(
      () => program.encodeTheta({
        field: "category",
        aggregate: "sum",
        weight: "weight"
      }),
      /non-negative finite numbers at row 0/
    );
    assert.equal(JSON.stringify(program), before);
  }

  const zeros = chart()
    .createCanvas({ width: 300, height: 300, margin: 30 })
    .createData({ values: [
      { category: "A", weight: 0 },
      { category: "B", weight: 0 }
    ] })
    .createArcMark();
  assert.throws(
    () => zeros.encodeTheta({
      field: "category",
      aggregate: "sum",
      weight: "weight"
    }),
    /positive total/
  );
});

test("does not accept theta weight on non-arc marks", () => {
  const point = chart()
    .createCanvas({ width: 300, height: 300, margin: 30 })
    .createData({ values: [{ angle: "A", weight: 2 }] })
    .createPointMark();

  assert.throws(
    () => point.encodeTheta({ field: "angle", weight: "weight" }),
    /supported only for arc theta encoding/
  );
});
