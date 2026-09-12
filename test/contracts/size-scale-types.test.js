import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { chart, render } from "../../src/index.js";
import { renderToPDF } from "../../src/renderers/pdf.js";
import { renderToPNG } from "../../src/renderers/png.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import {
  createMockCanvasContext,
  findCanvasCalls
} from "../support/canvas.js";

function close(actual, expected, tolerance = 1e-10) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)),
    `expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

function pointAreas(program, id = "points") {
  const object = program.graphicSpec.objects[id];
  return object.items.map(item => {
    const type = item.type ?? object.type;
    if (type === "circle") return Math.PI * item.properties.radius ** 2;
    if (type === "rect") {
      return item.properties.width * item.properties.height;
    }
    throw new Error(`Unexpected test point graphic "${type}".`);
  });
}

function closeArray(actual, expected) {
  assert.equal(actual.length, expected.length);
  actual.forEach((value, index) => close(value, expected[index]));
}

function base(values, { right = 240 } = {}) {
  return chart()
    .createCanvas({
      width: 640,
      height: 360,
      margin: { top: 30, right, bottom: 50, left: 50 }
    })
    .createData({
      id: "data",
      values: values.map((magnitude, index) => ({
        x: index,
        y: index,
        magnitude
      }))
    })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });
}

function sizeScale(program) {
  return program.semanticSpec.scales.find(scale => scale.id === "size");
}

test("maps logarithmic, power, and square-root size scales in area space", () => {
  const logarithmic = base([1, 10, 100]).encodeSize({
    field: "magnitude",
    scale: {
      type: "log",
      domain: [1, 100],
      range: [4 * Math.PI, 100 * Math.PI]
    }
  });
  const logAreas = pointAreas(logarithmic);
  close(logAreas[0], 4 * Math.PI);
  close(logAreas[1], 52 * Math.PI);
  close(logAreas[2], 100 * Math.PI);
  close(
    logarithmic.graphicSpec.objects.points.items[1].properties.radius,
    Math.sqrt(52)
  );
  assert.deepEqual(sizeScale(logarithmic), {
    id: "size",
    type: "log",
    domain: [1, 100],
    range: [4 * Math.PI, 100 * Math.PI],
    base: 10
  });

  const power = base([1, 5, 9]).encodeSize({
    field: "magnitude",
    scale: { type: "pow", exponent: 2, domain: [1, 9], range: [0, 80] }
  });
  const powerAreas = pointAreas(power);
  close(powerAreas[1], 24);
  assert.notEqual(powerAreas[1], 20);

  const squareRoot = base([1, 4, 9]).encodeSize({
    field: "magnitude",
    scale: { type: "sqrt", domain: [1, 9], range: [0, 100] }
  });
  close(pointAreas(squareRoot)[1], 50);

  const square = base([1, 10, 100])
    .encodeShape({
      field: "x",
      fieldType: "nominal",
      scale: { domain: [0, 1, 2], range: ["square", "circle", "diamond"] }
    })
    .encodeSize({
      field: "magnitude",
      scale: { type: "log", domain: [1, 100], range: [16, 144] }
    });
  assert.equal(square.graphicSpec.objects.points.items[0].type, "rect");
  close(square.graphicSpec.objects.points.items[0].properties.width, 4);
  close(square.graphicSpec.objects.points.items[0].properties.height, 4);
});

test("renders nonlinear size marks and their legend through every public backend", async t => {
  const program = base([1, 10, 100]).encodeSize({
    field: "magnitude",
    scale: {
      type: "log",
      domain: [1, 100],
      range: [4 * Math.PI, 100 * Math.PI]
    }
  }).createLegend({ channels: ["size"], count: 3 });

  const context = createMockCanvasContext();
  render(program, context);
  assert.equal(findCanvasCalls(context, "fill").length > 0, true);
  const svg = renderToSVG(program, { title: "Logarithmic size" });
  assert.match(svg, /^<svg /);
  assert.match(svg, /<circle /);
  assert.match(svg, />50\.5</);

  const directory = await mkdtemp(join(tmpdir(), "ggaction-size-scale-render-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const pngPath = join(directory, "size.png");
  const png = await renderToPNG(program, { output: pngPath, pixelRatio: 2 });
  assert.deepEqual({ width: png.width, height: png.height }, {
    width: 1280, height: 720
  });
  assert.deepEqual(
    [...(await readFile(pngPath)).subarray(0, 8)],
    [137, 80, 78, 71, 13, 10, 26, 10]
  );

  const pdfPath = join(directory, "size.pdf");
  const pdf = await renderToPDF(program, {
    output: pdfPath,
    metadata: { title: "Logarithmic size" }
  });
  assert.deepEqual(
    { width: pdf.width, height: pdf.height, pages: pdf.pages },
    { width: 640, height: 360, pages: 1 }
  );
  assert.match((await readFile(pdfPath)).toString("latin1"), /^%PDF-/);
});

test("maps threshold and duplicate-quantile buckets and renders every interval", () => {
  const threshold = base([9, 10, 19, 20]).encodeSize({
    field: "magnitude",
    scale: { type: "threshold", domain: [10, 20], range: [2, 4, 8] }
  });
  closeArray(pointAreas(threshold), [2, 4, 4, 8]);
  assert.deepEqual(threshold.resolvedScales.size, {
    type: "threshold",
    domain: [10, 20],
    thresholds: [10, 20],
    range: [2, 4, 8]
  });
  const thresholdLegend = threshold.createLegend({ channels: ["size"] });
  assert.deepEqual(
    thresholdLegend.graphicSpec.objects.sizeLegendLabels.items.map(
      item => item.properties.text
    ),
    ["< 10", "10–20", "≥ 20"]
  );
  closeArray(
    pointAreas({
      graphicSpec: {
        objects: {
          points: thresholdLegend.graphicSpec.objects.sizeLegendSymbols
        }
      }
    }),
    [2, 4, 8]
  );

  const quantile = base([0, 0, 0, 10]).encodeSize({
    field: "magnitude",
    scale: {
      type: "quantile",
      domain: [0, 0, 0, 10],
      range: [1, 2, 3, 4]
    }
  });
  assert.deepEqual(quantile.resolvedScales.size.thresholds, [0, 0, 2.5]);
  closeArray(pointAreas(quantile), [3, 3, 3, 4]);
  const legend = quantile.createLegend({ channels: ["size"] });
  assert.deepEqual(
    legend.graphicSpec.objects.sizeLegendLabels.items.map(
      item => item.properties.text
    ),
    ["< 0", "0–0", "0–2.5", "≥ 2.5"]
  );
  assert.throws(
    () => quantile.createLegend({ channels: ["size"], count: 3 }),
    /do not support count/
  );
  assert.throws(
    () => legend.editLegend({ count: 3 }),
    /do not support count/
  );
});

test("edits size scale families with explicit migration and stable interval labels", () => {
  const source = base([1, 2, 3, 4])
    .encodeSize({
      field: "magnitude",
      scale: { domain: [1, 4], range: [10, 40], clamp: true }
    })
    .createLegend({ channels: ["size"], count: 4 });
  const discrete = source.editSizeScale({
    type: "quantile",
    domain: "auto",
    range: [4, 9, 16, 25]
  });
  assert.deepEqual(sizeScale(discrete), {
    id: "size",
    type: "quantile",
    domain: "auto",
    range: [4, 9, 16, 25]
  });
  assert.equal(Object.hasOwn(sizeScale(discrete), "clamp"), false);
  assert.deepEqual(discrete.resolvedScales.size.thresholds, [1.75, 2.5, 3.25]);
  const labels = discrete.graphicSpec.objects.sizeLegendLabels.items.map(
    item => item.properties.text
  );

  const reversed = discrete.editSizeScale({ reverse: true });
  assert.deepEqual(reversed.resolvedScales.size.range, [25, 16, 9, 4]);
  assert.deepEqual(
    reversed.graphicSpec.objects.sizeLegendLabels.items.map(
      item => item.properties.text
    ),
    labels
  );
  closeArray(pointAreas(reversed), [25, 16, 9, 4]);

  const restored = reversed.editSizeScale({
    type: "sqrt",
    domain: [1, 4],
    range: "auto"
  });
  assert.deepEqual(sizeScale(restored), {
    id: "size",
    type: "sqrt",
    domain: [1, 4],
    range: "auto",
    reverse: true
  });
  assert.equal(Object.hasOwn(sizeScale(restored), "base"), false);
  assert.equal(Object.hasOwn(sizeScale(restored), "exponent"), false);
  assert.deepEqual(restored.resolvedScales.size.range, [196, 24]);
});

test("recomputes automatic quantile thresholds after a derived source revision", () => {
  const multiply = constant => ({
    op: "multiply",
    left: { field: "source" },
    right: { constant }
  });
  const before = chart()
    .createCanvas({
      width: 640,
      height: 360,
      margin: { top: 30, right: 240, bottom: 50, left: 50 }
    })
    .createData({
      id: "raw",
      values: [1, 2, 3, 4].map((source, index) => ({ x: index, y: index, source }))
    })
    .createComputedData({
      id: "scaled",
      source: "raw",
      as: "magnitude",
      expression: multiply(1)
    })
    .createPointMark({ id: "points", data: "scaled" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeSize({
      field: "magnitude",
      scale: { type: "quantile", domain: "auto", range: [4, 9, 16, 25] }
    })
    .createLegend({ channels: ["size"] });
  const snapshot = JSON.stringify(before);
  const after = before.editComputedData({
    target: "scaled",
    expression: multiply(10)
  });

  assert.deepEqual(before.resolvedScales.size.thresholds, [1.75, 2.5, 3.25]);
  assert.deepEqual(after.resolvedScales.size.thresholds, [17.5, 25, 32.5]);
  assert.deepEqual(
    after.graphicSpec.objects.sizeLegendLabels.items.map(
      item => item.properties.text
    ),
    ["< 17.5", "17.5–25", "25–32.5", "≥ 32.5"]
  );
  assert.equal(JSON.stringify(before), snapshot);
});

test("uses unknown areas only for missing values and rejects invalid size states atomically", () => {
  const unknown = base([1, null, 100]).encodeSize({
    field: "magnitude",
    scale: {
      type: "log",
      domain: [1, 100],
      range: [4, 100],
      unknown: 25
    }
  });
  close(pointAreas(unknown)[1], 25);

  const source = base([1, 2, 3, 4]).encodeSize({ field: "magnitude" });
  const fingerprint = JSON.stringify(source);
  for (const [operation, pattern] of [
    [() => source.editSizeScale({ type: "quantile", range: [1, 2] }), /explicit domain/],
    [() => source.editSizeScale({ type: "threshold", domain: [2, 3] }), /explicit range/],
    [() => source.editSizeScale({ type: "pow", domain: [1, 4], range: "auto" }), /explicit exponent/],
    [() => source.editSizeScale({ type: "log", domain: [0, 4], range: "auto" }), /strictly positive/],
    [() => source.editSizeScale({ type: "quantize", domain: [1, 4], range: [4, 2] }), /nondecreasing/],
    [() => source.editSizeScale({ type: "threshold", domain: [2, 2], range: [1, 2, 3] }), /strictly increasing/],
    [() => base([-1, 1]).encodeSize({
      field: "magnitude",
      scale: { type: "log", domain: [1, 10], range: [4, 16], unknown: 9 }
    }), /strictly positive/]
  ]) {
    assert.throws(operation, pattern);
    assert.equal(JSON.stringify(source), fingerprint);
  }
});
