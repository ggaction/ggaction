import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const rows = Object.freeze([
  Object.freeze({ x: 1, y: 2, color: 10, size: 25, shape: "a", opacity: 0.8 }),
  Object.freeze({ x: null, y: 4, color: null, size: null, shape: null, opacity: null })
]);

function fallbackPoints() {
  return chart()
    .createCanvas({ width: 240, height: 180, margin: 20 })
    .createData({ values: rows })
    .createPointMark()
    .encodeX({ field: "x", scale: { domain: [0, 10], unknown: 15 } })
    .encodeY({ field: "y" })
    .encodeColor({
      field: "color",
      fieldType: "quantitative",
      scale: { domain: [0, 20], unknown: "#ff00ff" }
    })
    .encodeSize({ field: "size", scale: { domain: [0, 100], unknown: 64 } })
    .encodeShape({ field: "shape", scale: { unknown: "diamond" } })
    .encodeOpacity({
      field: "opacity",
      scale: { domain: [0, 1], unknown: 0.3 }
    });
}

test("creates every public scale type with its type-specific definition", () => {
  let program = chart()
    .createScale({ id: "sequential", type: "sequential", palette: "viridis" })
    .createScale({ id: "quantize", type: "quantize", range: ["red", "blue"] })
    .createScale({ id: "quantile", type: "quantile", range: ["red", "blue"] })
    .createScale({
      id: "threshold",
      type: "threshold",
      domain: [10],
      range: ["red", "blue"]
    });

  assert.deepEqual(program.semanticSpec.scales.map(scale => scale.type), [
    "sequential", "quantize", "quantile", "threshold"
  ]);
  assert.equal(program.semanticSpec.scales[0].interpolate, "rgb");
  assert.throws(
    () => chart().createScale({ id: "threshold", type: "threshold" }),
    /requires an explicit domain/
  );
  assert.throws(
    () => chart().createScale({ id: "linear", palette: "viridis" }),
    /does not support palette/
  );
});

test("edits quantitative point color types atomically and removes stale state", () => {
  const sequential = chart()
    .createCanvas({ width: 240, height: 180, margin: 20 })
    .createData({ values: [{ x: 1, y: 1, color: 2 }, { x: 2, y: 2, color: 8 }] })
    .createPointMark()
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeColor({ field: "color", fieldType: "quantitative" })
    .encodeRadius({ value: 3 });
  const quantize = sequential.editScale({
    id: "color",
    type: "quantize",
    range: ["red", "blue"]
  });
  const threshold = quantize.editScale({
    id: "color",
    type: "threshold",
    domain: [5],
    range: ["black", "white"]
  });

  assert.equal(Object.hasOwn(quantize.semanticSpec.scales[2], "interpolate"), false);
  assert.deepEqual(
    threshold.graphicSpec.objects.point.children.map(child => child.properties.fill),
    ["black", "white"]
  );
  assert.equal(sequential.semanticSpec.scales[2].type, "sequential");
  assert.throws(
    () => quantize.editScale({ id: "color", type: "threshold" }),
    /requires an explicit domain/
  );
});

test("edits an unassigned scale type after validating the complete definition", () => {
  const linear = chart().createScale({
    id: "standalone",
    type: "linear",
    domain: [0, 10],
    range: [0, 100]
  });
  const sequential = linear.editScale({
    id: "standalone",
    type: "sequential",
    range: ["black", "white"]
  });

  assert.deepEqual(sequential.semanticSpec.scales[0], {
    id: "standalone",
    type: "sequential",
    domain: [0, 10],
    range: ["black", "white"],
    interpolate: "rgb"
  });
  assert.equal(linear.semanticSpec.scales[0].type, "linear");
});

test("attaches direct color scales and defers unknown validation to the channel", () => {
  const scale = chart().createScale({
    id: "direct-color",
    type: "sequential",
    domain: [0, 10],
    range: ["black", "white"],
    unknown: "gray"
  });
  const program = scale
    .createCanvas({ width: 240, height: 180, margin: 20 })
    .createData({ values: [{ x: 1, y: 1, color: null }] })
    .createPointMark()
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeColor({
      field: "color",
      fieldType: "quantitative",
      scale: { id: "direct-color" }
    })
    .encodeRadius({ value: 3 });

  assert.equal(
    program.graphicSpec.objects.point.children[0].properties.fill,
    "gray"
  );
  assert.throws(
    () => chart()
      .createScale({
        id: "invalid-color",
        type: "sequential",
        unknown: 10
      })
      .createCanvas({ width: 240, height: 180, margin: 20 })
      .createData({ values: [{ x: 1, y: 1, color: null }] })
      .createPointMark()
      .encodeColor({
        field: "color",
        fieldType: "quantitative",
        scale: { id: "invalid-color" }
      }),
    /unknown for color must be a non-empty color string/
  );
});

test("maps missing point values through channel-valid unknown fallbacks", () => {
  const program = fallbackPoints();
  const missing = program.graphicSpec.objects.point.children[1];
  const [move, , opposite] = missing.properties.commands;

  assert.equal((move.x + opposite.x) / 2, 15);
  assert.equal(missing.properties.fill, "#ff00ff");
  assert.equal(missing.properties.opacity, 0.3);
  assert.equal(missing.type, "path");
  assert.deepEqual(program.resolvedScales.x.domain, [0, 10]);
  assert.equal(program.resolvedScales.shape.unknown, "diamond");
  assert.equal(program.semanticSpec.scales.find(scale => scale.id === "size").unknown, 64);
});

test("keeps unknown outside the domain and stable across Canvas rematerialization", () => {
  const program = chart()
    .createCanvas({ width: 240, height: 180, margin: 20 })
    .createData({ values: [{ x: "a", y: 1 }, { x: "b", y: 2 }] })
    .createPointMark()
    .encodeX({
      field: "x",
      fieldType: "ordinal",
      scale: { domain: ["a"], unknown: 12 }
    })
    .encodeY({ field: "y" })
    .encodeRadius({ value: 3 });
  const resized = program.editCanvas({ width: 320 });

  assert.equal(program.graphicSpec.objects.point.children[1].properties.x, 12);
  assert.equal(resized.graphicSpec.objects.point.children[1].properties.x, 12);
  assert.notEqual(
    program.graphicSpec.objects.point.children[0].properties.x,
    resized.graphicSpec.objects.point.children[0].properties.x
  );
});

test("validates unknown by output channel and preserves failed programs", () => {
  const base = chart()
    .createCanvas({ width: 240, height: 180, margin: 20 })
    .createData({ values: [{ x: 1, y: 2 }] })
    .createPointMark();

  assert.throws(
    () => base.encodeX({ field: "x", scale: { unknown: "left" } }),
    /unknown for x must be a finite number/
  );
  assert.throws(
    () => base.encodeColor({
      field: "x",
      fieldType: "quantitative",
      scale: { unknown: 3 }
    }),
    /unknown for color must be a non-empty color string/
  );
  assert.throws(
    () => base.encodeShape({ field: "x", scale: { unknown: "missing-shape" } }),
    /Unsupported scale unknown shape/
  );
  assert.deepEqual(base.semanticSpec.scales, []);
  assert.equal(base.semanticSpec.layers[0].encoding, undefined);
});

test("edits unknown for every shared point consumer before rematerializing", () => {
  const base = chart()
    .createCanvas({ width: 240, height: 180, margin: 20 })
    .createData({ id: "rows", values: [{ x: 1 }, { x: null }] })
    .createPointMark({ id: "first" })
    .encodeX({ field: "x", scale: { id: "shared", domain: [0, 2], unknown: 10 } })
    .encodeRadius({ value: 3 })
    .createPointMark({ id: "second", data: "rows" })
    .encodeX({ target: "second", field: "x", scale: { id: "shared" } })
    .encodeRadius({ target: "second", value: 3 });
  const edited = base.editScale({ id: "shared", unknown: 30 });

  for (const id of ["first", "second"]) {
    assert.equal(edited.graphicSpec.objects[id].children[1].properties.x, 30);
    assert.equal(base.graphicSpec.objects[id].children[1].properties.x, 10);
  }
});

test("rejects unknown for compound mark grains instead of changing topology", () => {
  const line = chart()
    .createCanvas({ width: 240, height: 180, margin: 20 })
    .createData({ values: [{ year: 2000, value: 1 }, { year: 2001, value: 2 }] })
    .createLineMark();

  assert.throws(
    () => line.encodeX({
      field: "year",
      fieldType: "temporal",
      scale: { unknown: 20 }
    }),
    /row-owned point mark/
  );
  assert.equal(line.semanticSpec.scales.length, 0);
});

test("rejects a color type edit that would change an active legend recipe", () => {
  const program = chart()
    .createCanvas({
      width: 500,
      height: 300,
      margin: { top: 30, right: 180, bottom: 40, left: 50 }
    })
    .createData({ values: [{ x: 1, y: 1, color: 1 }, { x: 2, y: 2, color: 9 }] })
    .createPointMark()
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeColor({ field: "color", fieldType: "quantitative" })
    .encodeRadius({ value: 3 })
    .createLegend();

  assert.throws(
    () => program.editScale({
      id: "color",
      type: "quantize",
      range: ["red", "blue"]
    }),
    /gradient legend is active/
  );
  assert.equal(
    program.semanticSpec.scales.find(scale => scale.id === "color").type,
    "sequential"
  );
});
