import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const rows = Object.freeze([
  Object.freeze({ x: 1, y: 1 }),
  Object.freeze({ x: 10, y: 4 }),
  Object.freeze({ x: 100, y: 9 })
]);

function pointProgram() {
  return chart()
    .createCanvas({ width: 300, height: 200, margin: 20 })
    .createData({ id: "rows", values: rows })
    .createPointMark({ id: "points" });
}

test("encodes log and sqrt positions and shares their mappings with guides", () => {
  const program = pointProgram()
    .encodeX({ field: "x", scale: { type: "log", base: 10, nice: true } })
    .encodeY({ field: "y", scale: { type: "sqrt", nice: true, zero: false } })
    .encodeRadius({ value: 3 })
    .createGuides({ grid: { horizontal: {}, vertical: {} } });

  assert.deepEqual(program.resolvedScales.x, {
    type: "log",
    domain: [1, 100],
    range: [20, 280],
    base: 10
  });
  assert.deepEqual(program.resolvedScales.y, {
    type: "sqrt",
    domain: [0, 10],
    range: [180, 20]
  });
  assert.deepEqual(
    program.graphicSpec.objects.points.children.map(child => child.properties.x),
    [20, 150, 280]
  );
  assert.deepEqual(
    program.graphicSpec.objects.xAxisLabels.children.map(child => child.properties.text),
    ["1", "10", "100"]
  );
  assert.deepEqual(
    program.graphicSpec.objects.verticalGridLines.children.map(
      child => child.properties.x1
    ),
    [20, 150, 280]
  );
});

test("materializes pow and symlog parameters and supports Canvas rematerialization", () => {
  const power = pointProgram()
    .encodeX({ field: "x", scale: { type: "pow", exponent: 2 } })
    .encodeRadius({ value: 3 });
  const symmetric = pointProgram()
    .encodeX({ field: "x", scale: { type: "symlog", constant: 2 } })
    .encodeRadius({ value: 3 });
  const resized = symmetric.editCanvas({ width: 500 });

  assert.equal(power.resolvedScales.x.exponent, 2);
  assert.equal(symmetric.resolvedScales.x.constant, 2);
  assert.equal(resized.resolvedScales.x.range[1], 480);
  assert.notDeepEqual(
    resized.graphicSpec.objects.points.children.map(child => child.properties.x),
    symmetric.graphicSpec.objects.points.children.map(child => child.properties.x)
  );
});

test("changes quantitative position types atomically and removes stale parameters", () => {
  const linear = pointProgram()
    .encodeX({
      field: "x",
      scale: { nice: true, zero: false, clamp: true, reverse: true }
    })
    .encodeRadius({ value: 3 });
  const log = linear.editScale({ id: "x", type: "log" });
  const power = log.editScale({ id: "x", type: "pow", exponent: 2 });

  assert.deepEqual(log.semanticSpec.scales[0], {
    id: "x",
    type: "log",
    domain: "auto",
    range: "auto",
    nice: true,
    clamp: true,
    reverse: true,
    base: 10
  });
  assert.deepEqual(power.semanticSpec.scales[0], {
    id: "x",
    type: "pow",
    domain: "auto",
    range: "auto",
    nice: true,
    clamp: true,
    reverse: true,
    exponent: 2
  });
  assert.equal(Object.hasOwn(power.semanticSpec.scales[0], "base"), false);
  assert.equal(linear.semanticSpec.scales[0].type, "linear");
});

test("converges between direct transformed encoding and a later type edit", () => {
  const direct = pointProgram()
    .encodeX({ field: "x", scale: { type: "log", base: 10 } })
    .encodeRadius({ value: 3 });
  const edited = pointProgram()
    .encodeX({ field: "x" })
    .encodeRadius({ value: 3 })
    .editScale({ id: "x", type: "log", base: 10 });

  assert.deepEqual(edited.semanticSpec, direct.semanticSpec);
  assert.deepEqual(edited.resolvedScales, direct.resolvedScales);
  assert.deepEqual(edited.graphicSpec, direct.graphicSpec);
});

test("rematerializes every shared point consumer and rejects invalid transitions", () => {
  const shared = pointProgram()
    .encodeX({ field: "x", scale: { id: "shared" } })
    .encodeRadius({ value: 3 })
    .createPointMark({ id: "other", data: "rows" })
    .encodeX({ target: "other", field: "x", scale: { id: "shared" } })
    .encodeRadius({ target: "other", value: 3 });
  const log = shared.editScale({ id: "shared", type: "log" });

  assert.deepEqual(
    log.graphicSpec.objects.points.children.map(child => child.properties.x),
    log.graphicSpec.objects.other.children.map(child => child.properties.x)
  );
  assert.throws(
    () => shared.editScale({ id: "shared", type: "log", domain: [-1, 1] }),
    /strictly positive or strictly negative/
  );
  assert.throws(
    () => shared.editScale({ id: "shared", type: "log", base: 1 }),
    /must not equal 1/
  );
  assert.equal(shared.semanticSpec.scales.find(scale => scale.id === "shared").type, "linear");
});

test("rejects transformed positions for marks without transformed materialization", () => {
  const area = chart()
    .createCanvas({ width: 300, height: 200, margin: 20 })
    .createData({ id: "rows", values: rows })
    .createAreaMark({ id: "area" });

  assert.throws(
    () => area.encodeX({ field: "x", scale: { type: "log" } }),
    /currently require a point mark/
  );
  assert.equal(area.semanticSpec.scales.length, 0);
});
