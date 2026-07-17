import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/ChartProgram.js";

const values = Object.freeze([
  Object.freeze({ angle: 0, distance: 10, category: "A" }),
  Object.freeze({ angle: 90, distance: 20, category: "B" }),
  Object.freeze({ angle: 180, distance: 30, category: "A" })
]);

function base() {
  return chart()
    .createCanvas({ width: 240, height: 200, margin: 20 })
    .createData({ id: "values", values })
    .createPointMark({ id: "points" });
}

function positions(program) {
  return program.graphicSpec.objects.points.items.map(child => ({
    x: child.properties.x,
    y: child.properties.y
  }));
}

test("encodes Polar angle and radius into final Cartesian point geometry", () => {
  const program = base()
    .encodeTheta({ field: "angle" })
    .encodeR({ field: "distance" });
  const layer = program.semanticSpec.layers[0];

  assert.deepEqual(layer.encoding, {
    theta: {
      field: "angle", fieldType: "quantitative", scale: "theta"
    },
    radius: {
      field: "distance", fieldType: "quantitative", scale: "radius"
    }
  });
  assert.equal(layer.coordinate, "polar");
  assert.deepEqual(program.semanticSpec.coordinates, [
    { id: "polar", type: "polar" }
  ]);
  assert.deepEqual(program.resolvedScales.theta.range, [0, 360]);
  assert.deepEqual(program.resolvedScales.radius.range, [0, 80]);
  const resolvedPositions = positions(program);
  const expectedPositions = [
    { x: 120, y: 100 },
    { x: 120, y: 140 },
    { x: 120, y: 20 }
  ];
  for (let index = 0; index < expectedPositions.length; index += 1) {
    assert.equal(
      Math.abs(resolvedPositions[index].x - expectedPositions[index].x) < 1e-10,
      true
    );
    assert.equal(
      Math.abs(resolvedPositions[index].y - expectedPositions[index].y) < 1e-10,
      true
    );
  }
  assert.equal(
    Object.hasOwn(program.graphicSpec.objects.points.items[0].properties, "theta"),
    false
  );
  assert.equal(
    Object.hasOwn(program.graphicSpec.objects.points.items[0].properties, "radius"),
    false
  );
});

test("keeps one Polar position channel graphically incomplete", () => {
  const program = base().encodeTheta({ field: "angle" });

  assert.equal(program.semanticSpec.layers[0].encoding.theta.field, "angle");
  assert.equal(program.semanticSpec.layers[0].coordinate, "polar");
  assert.equal(program.resolvedScales.theta !== undefined, true);
  assert.deepEqual(positions(program), [
    { x: undefined, y: undefined },
    { x: undefined, y: undefined },
    { x: undefined, y: undefined }
  ]);
});

test("produces identical state regardless of Polar encoding order", () => {
  const thetaFirst = base()
    .encodeTheta({ field: "angle" })
    .encodeR({ field: "distance" });
  const radiusFirst = base()
    .encodeR({ field: "distance" })
    .encodeTheta({ field: "angle" });

  assert.deepEqual(thetaFirst.semanticSpec.layers, radiusFirst.semanticSpec.layers);
  assert.deepEqual(thetaFirst.semanticSpec.coordinates, radiusFirst.semanticSpec.coordinates);
  assert.deepEqual(
    [...thetaFirst.semanticSpec.scales].sort((a, b) => a.id.localeCompare(b.id)),
    [...radiusFirst.semanticSpec.scales].sort((a, b) => a.id.localeCompare(b.id))
  );
  assert.deepEqual(thetaFirst.graphicSpec, radiusFirst.graphicSpec);
});

test("supports discrete theta and explicit radial scale policy", () => {
  const program = base()
    .encodeTheta({ field: "category", fieldType: "nominal" })
    .encodeR({
      field: "distance",
      scale: { domain: [0, 40], range: [5, 70], reverse: true }
    });

  assert.equal(program.semanticSpec.scales[0].type, "point");
  assert.deepEqual(program.resolvedScales.theta.domain, ["A", "B"]);
  assert.deepEqual(program.resolvedScales.radius.range, [70, 5]);
});

test("supports temporal theta, transformed radius, and safe coordinate inference", () => {
  const temporalValues = [
    { angle: "2020-01-01", distance: 1 },
    { angle: "2021-01-01", distance: 100 }
  ];
  const program = base()
    .createCoordinate({ id: "detail", type: "polar" })
    .encodeTheta({ field: "angle" })
    .encodeR({ field: "distance", scale: { type: "log" } });
  const temporal = chart()
    .createCanvas({ width: 200, height: 200, margin: 20 })
    .createData({ values: temporalValues })
    .createPointMark()
    .encodeTheta({ field: "angle", fieldType: "temporal" })
    .encodeR({ field: "distance" });

  assert.equal(program.semanticSpec.layers[0].coordinate, "detail");
  assert.equal(program.semanticSpec.scales.find(scale => scale.id === "radius").type, "log");
  assert.equal(temporal.semanticSpec.scales.find(scale => scale.id === "theta").type, "time");
  assert.deepEqual(temporal.resolvedScales.theta.domain, [
    Date.UTC(2020, 0, 1),
    Date.UTC(2021, 0, 1)
  ]);

  const ambiguous = base()
    .createCoordinate({ id: "first", type: "polar" })
    .createCoordinate({ id: "second", type: "polar" });
  assert.throws(
    () => ambiguous.encodeTheta({ field: "angle" }),
    /multiple polar coordinates/
  );
});

test("rejects mixed coordinate families and unsupported Polar contracts atomically", () => {
  const polar = base().encodeTheta({ field: "angle" });
  const cartesian = base().encodeX({ field: "angle" });
  const before = JSON.stringify(polar);

  assert.throws(
    () => polar.encodeX({ field: "distance" }),
    /cannot mix x with theta/
  );
  assert.throws(
    () => cartesian.encodeR({ field: "distance" }),
    /cannot mix radius with x/
  );
  assert.throws(
    () => base().encodeR({ field: "category", fieldType: "nominal" }),
    /does not support field type/
  );
  assert.throws(
    () => base().encodeTheta({ field: "angle", scale: { range: [0, 361] } }),
    /must not exceed 360/
  );
  assert.throws(
    () => base().encodeR({ field: "distance", scale: { range: [-1, 20] } }),
    /non-negative/
  );
  assert.throws(
    () => base().encodeTheta({ field: "angle", scale: { type: "log" } }),
    /Unsupported position scale type/
  );
  assert.equal(JSON.stringify(polar), before);
});

test("exposes encodePointRadius as a traced alias of encodeRadius", () => {
  const program = base().encodePointRadius({ value: 4 });
  const node = program.trace.children.at(-1);

  assert.equal(node.op, "encodePointRadius");
  assert.deepEqual(node.children.map(child => child.op), ["encodeRadius"]);
  assert.deepEqual(
    program.graphicSpec.objects.points.items.map(child => child.properties.radius),
    [4, 4, 4]
  );
});

test("rematerializes Polar ranges and points after Canvas and scale edits", () => {
  const before = base()
    .encodeTheta({ field: "angle" })
    .encodeR({ field: "distance" })
    .encodePointRadius({ value: 3 });
  const resized = before.editCanvas({ width: 160, height: 160, margin: 20 });
  const reversed = resized.editScale({ id: "theta", reverse: true });

  assert.deepEqual(before.resolvedScales.radius.range, [0, 80]);
  assert.deepEqual(resized.resolvedScales.radius.range, [0, 60]);
  assert.notDeepEqual(positions(resized), positions(before));
  assert.deepEqual(reversed.resolvedScales.theta.range, [360, 0]);
  assert.notDeepEqual(positions(reversed), positions(resized));
  const transformed = before.editScale({ id: "radius", type: "sqrt" });
  assert.equal(transformed.resolvedScales.radius.type, "sqrt");
  assert.throws(
    () => before.editScale({ id: "theta", type: "log" }),
    /Theta quantitative position currently requires a linear scale/
  );
  assert.deepEqual(before.graphicSpec.objects.canvas.properties, {
    width: 240,
    height: 200,
    background: "white"
  });
});

test("rejects Polar guide requests explicitly", () => {
  const program = base()
    .encodeTheta({ field: "angle" })
    .encodeR({ field: "distance" })
    .encodePointRadius({ value: 3 });

  assert.throws(() => program.createAxes(), /does not yet support Polar axes/);
  assert.throws(
    () => program.createGuides({ axes: {} }),
    /does not yet support Polar axes/
  );
});

test("rejects an explicit radial range that no longer fits Canvas bounds", () => {
  const program = base()
    .encodeTheta({ field: "angle" })
    .encodeR({ field: "distance", scale: { range: [0, 70] } })
    .encodePointRadius({ value: 3 });
  const before = JSON.stringify(program);

  assert.throws(
    () => program.editCanvas({ width: 100, height: 100, margin: 20 }),
    /fit within the available radius 30/
  );
  assert.equal(JSON.stringify(program), before);
});

test("filters, selects, and highlights final Polar point items", () => {
  const program = base()
    .encodeTheta({ field: "angle" })
    .encodeR({ field: "distance" })
    .encodeColor({ field: "category" })
    .encodePointRadius({ value: 3 });
  const selected = program.selectMarks({
    id: "large-angle",
    channel: "theta",
    op: "gte",
    value: 90
  });
  const highlighted = selected.highlightMarks({
    selection: "large-angle",
    color: "#111111",
    dimOthers: { opacity: 0.2 }
  });
  const filtered = program.filterMarks({
    field: "category",
    op: "eq",
    value: "A"
  });

  assert.deepEqual(
    selected.materializationConfigs.selections["large-angle"].selector,
    { grain: "item", channel: "theta", op: "gte", value: 90 }
  );
  assert.deepEqual(
    highlighted.graphicSpec.objects.points.items.map(child => child.properties.fill),
    ["#4c78a8", "#111111", "#111111"]
  );
  assert.equal(filtered.semanticSpec.datasets.at(-1).values.length, 2);
  assert.equal(filtered.graphicSpec.objects.points.items.length, 2);
  assert.deepEqual(filtered.resolvedScales.theta.domain, [0, 180]);
});
