import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { chart, render } from "../../src/index.js";
import { resolveTextBounds } from "../../src/core/textMetrics.js";
import { renderToPDF } from "../../src/renderers/pdf.js";
import { renderToPNG } from "../../src/renderers/png.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { assertAtomicFailures } from "../support/program-state.js";
import { createMockCanvasContext, findCanvasCalls } from "../support/canvas.js";

function barProgram(rows = [
  { category: "positive", value: 5 },
  { category: "negative", value: -5 }
]) {
  return chart()
    .createCanvas({ width: 240, height: 180, margin: 24 })
    .createData({ values: rows })
    .createBarPlot({
      id: "bars",
      x: "category",
      y: { field: "value", aggregate: "sum" },
      guides: false
    });
}

function textBounds(program, id = "labels") {
  return program.graphicSpec.objects[id].items.map(item =>
    resolveTextBounds(item.properties)
  );
}

test("anchors signed bar labels outside each final value boundary", () => {
  const options = Object.freeze({
    id: "labels",
    source: "bars",
    field: "value",
    placement: Object.freeze({ anchor: "outsideEnd" })
  });
  const before = barProgram();
  const labeled = before.createMarkLabels(options);
  const bars = labeled.graphicSpec.objects.bars.items.map(item => item.properties);
  const bounds = textBounds(labeled);

  assert.ok(Math.abs(bounds[0].bottom - (bars[0].y - 4)) < 1e-9);
  assert.ok(Math.abs(bounds[1].top - (bars[1].y + bars[1].height + 4)) < 1e-9);
  assert.deepEqual(labeled.markConfigs.labels.labelAuthoring.placement, {
    anchor: "outsideEnd",
    gap: 4,
    overflow: "hide",
    leader: false
  });
  assert.deepEqual(options, {
    id: "labels",
    source: "bars",
    field: "value",
    placement: { anchor: "outsideEnd" }
  });
  assert.equal(before.graphicSpec.objects.labels, undefined);
});

test("does not let an omitted zero-length bar fail the remaining labels", () => {
  const labeled = barProgram([
    { category: "zero", value: 0 },
    { category: "positive", value: 5 }
  ]).createMarkLabels({
    id: "labels",
    field: "value",
    placement: { anchor: "outsideEnd" }
  });
  assert.equal(labeled.graphicSpec.objects.labels.items.length, 1);
  assert.deepEqual(
    labeled.graphicSpec.objects.labels.items.map(item => item.properties.text),
    ["5"]
  );
});

test("anchors every stacked segment at its own start and end", () => {
  const labeled = chart()
    .createCanvas({ width: 240, height: 180, margin: 24 })
    .createData({ values: [
      { category: "A", series: "first", value: 2 },
      { category: "A", series: "second", value: 3 }
    ] })
    .createBarPlot({
      id: "bars",
      x: "category",
      y: { field: "value", aggregate: "sum" },
      color: { field: "series", layout: "stack" },
      guides: false
    })
    .createMarkLabels({
      id: "labels",
      field: "value",
      placement: { anchor: "outsideEnd" }
    });
  const bars = labeled.graphicSpec.objects.bars.items.map(item => item.properties);
  const bounds = textBounds(labeled);

  assert.equal(bounds.length, 2);
  assert.notEqual(bars[0].y, bars[1].y);
  assert.ok(Math.abs(bounds[0].bottom - (bars[0].y - 4)) < 1e-9);
  assert.ok(Math.abs(bounds[1].bottom - (bars[1].y - 4)) < 1e-9);
});

test("supports Cartesian Point centers, Polar Point outward anchors, and directed Rect intervals", () => {
  const point = chart()
    .createCanvas({ width: 200, height: 160, margin: 20 })
    .createData({ values: [{ x: 1, y: 2, label: "center" }] })
    .createPointMark({ id: "points" })
    .encodeX({ target: "points", field: "x" })
    .encodeY({ target: "points", field: "y" })
    .createMarkLabels({
      id: "labels",
      field: "label",
      placement: { anchor: "center" }
    });
  assert.deepEqual(
    point.graphicSpec.objects.labels.items.map(item => [
      item.properties.x,
      item.properties.y
    ]),
    point.graphicSpec.objects.points.items.map(item => [
      item.properties.x,
      item.properties.y
    ])
  );

  const polar = chart()
    .createCanvas({ width: 240, height: 200, margin: 20 })
    .createData({ values: [
      { angle: 0, radius: 80, label: "top" },
      { angle: 90, radius: 80, label: "right" }
    ] })
    .createPolarScatterPlot({
      id: "points",
      theta: { field: "angle", scale: { domain: [0, 360] } },
      radius: { field: "radius", scale: { domain: [0, 80] } },
      guides: false
    })
    .createMarkLabels({
      id: "labels",
      field: "label",
      placement: { anchor: "outsideEnd" }
    });
  assert.ok(
    polar.graphicSpec.objects.labels.items[0].properties.y <
      polar.graphicSpec.objects.points.items[0].properties.y
  );
  assert.ok(
    polar.graphicSpec.objects.labels.items[1].properties.x >
      polar.graphicSpec.objects.points.items[1].properties.x
  );

  const band = barProgram([{ category: "A", value: 5 }])
    .createReferenceBand({ id: "band", source: "bars", y: [1, 3] })
    .createMarkLabels({
      id: "labels",
      source: "band",
      value: "range",
      placement: { anchor: "outsideEnd" }
    });
  const rect = band.graphicSpec.objects.band.items[0].properties;
  assert.ok(Math.abs(textBounds(band)[0].bottom - (rect.y - 4)) < 1e-9);
});

test("recomputes inside fit, reverse direction, Canvas geometry, and Polar frame", () => {
  const inside = chart()
    .createCanvas({ width: 180, height: 100, margin: 10 })
    .createData({ values: [{ category: "A", value: 1 }] })
    .createBarPlot({
      id: "bars",
      x: "category",
      y: { field: "value", aggregate: "sum" },
      guides: false
    })
    .createMarkLabels({
      id: "labels",
      value: "x",
      fontSize: 6,
      placement: { anchor: "insideEnd" }
    });
  assert.equal(inside.graphicSpec.objects.labels.items.length, 1);
  const tooLarge = inside.editTextMark({ target: "labels", fontSize: 80 });
  assert.equal(tooLarge.graphicSpec.objects.labels.items.length, 0);

  const outside = barProgram([{ category: "A", value: 5 }]).createMarkLabels({
    id: "labels",
    field: "value",
    placement: { anchor: "outsideEnd" }
  });
  const reversed = outside.editScale({ id: "y", reverse: true });
  assert.ok(
    outside.graphicSpec.objects.labels.items[0].properties.y <
      outside.graphicSpec.objects.bars.items[0].properties.y
  );
  assert.ok(
    reversed.graphicSpec.objects.labels.items[0].properties.y >
      reversed.graphicSpec.objects.bars.items[0].properties.y +
        reversed.graphicSpec.objects.bars.items[0].properties.height
  );
  const resized = outside.editCanvas({ width: 360, height: 240 });
  assert.notDeepEqual(
    resized.graphicSpec.objects.labels.items[0].properties,
    outside.graphicSpec.objects.labels.items[0].properties
  );

  const arc = chart()
    .createCanvas({ width: 240, height: 240, margin: 20 })
    .createData({ values: [
      { category: "A", value: 1 },
      { category: "B", value: 1 }
    ] })
    .createPiePlot({
      id: "arcs",
      category: "category",
      value: "value",
      aggregate: "sum",
      guides: false
    })
    .editArcMark({ target: "arcs", innerRadius: 0.4 })
    .createMarkLabels({
      id: "arcLabels",
      field: "category",
      placement: { anchor: "outsideEnd" }
    });
  const moved = arc.editCoordinate({
    target: "polar",
    polarFrame: {
      center: { x: 0.35, y: 0.4 },
      radius: { unit: "fraction", value: 0.8 }
    }
  });
  assert.notDeepEqual(
    moved.graphicSpec.objects.arcLabels.items.map(item => item.properties),
    arc.graphicSpec.objects.arcLabels.items.map(item => item.properties)
  );
});

test("creates one owned placement leader and removes every stale owner", () => {
  const labeled = barProgram([{ category: "A", value: 5 }]).createMarkLabels({
    id: "labels",
    field: "value",
    placement: {
      anchor: "outsideEnd",
      leader: { stroke: "#475569", strokeWidth: 2 }
    }
  });
  const leader = labeled.graphicSpec.objects["labels-placement-leaders"];
  assert.equal(leader.type, "line");
  assert.equal(leader.items.length, 1);
  assert.equal(leader.items[0].properties.stroke, "#475569");
  assert.equal(leader.items[0].properties.strokeWidth, 2);

  const hidden = labeled
    .editMarkLabelPlacement({
      target: "labels",
      placement: { anchor: "insideEnd", leader: {} }
    })
    .editTextMark({ target: "labels", fontSize: 200 });
  assert.equal(hidden.graphicSpec.objects.labels.items.length, 0);
  assert.equal(hidden.graphicSpec.objects["labels-placement-leaders"], undefined);

  const reset = labeled.editMarkLabelPlacement({
    target: "labels",
    placement: "auto"
  });
  assert.equal(reset.markConfigs.labels.labelAuthoring.placement, undefined);
  assert.equal(reset.graphicSpec.objects["labels-placement-leaders"], undefined);
  const removed = labeled.removeMarkLabels({ target: "labels" });
  assert.equal(removed.graphicSpec.objects.labels, undefined);
  assert.equal(removed.graphicSpec.objects["labels-placement-leaders"], undefined);
  assert.equal(removed.markConfigs.labels, undefined);
});

test("updates placement leaders after collision layout displacement", () => {
  const laidOut = chart()
    .createCanvas({ width: 240, height: 180, margin: 24 })
    .createData({ values: [
      { x: 1, y: 1, label: "Alpha" },
      { x: 1, y: 1, label: "Beta" }
    ] })
    .createPointMark({ id: "points" })
    .encodeX({ target: "points", field: "x" })
    .encodeY({ target: "points", field: "y" })
    .createMarkLabels({
      id: "labels",
      field: "label",
      placement: { anchor: "center", leader: {} },
      layout: { maxDisplacement: 48 }
    });

  assert.equal(
    laidOut.materializationConfigs.labelLayouts.labels.resolution.displaced,
    1
  );
  assert.equal(
    laidOut.graphicSpec.objects["labels-placement-leaders"].items.length,
    1
  );
  assert.equal(
    laidOut.graphicSpec.objects["labels-label-leaders"],
    undefined
  );
});

test("rejects unsupported families, invalid policies, and dual leader ownership atomically", () => {
  const point = chart()
    .createCanvas({ width: 180, height: 140, margin: 20 })
    .createData({ values: [
      { x: 1, y: 2, label: "A" },
      { x: 2, y: 3, label: "B" }
    ] })
    .createPointMark({ id: "points" })
    .encodeX({ target: "points", field: "x" })
    .encodeY({ target: "points", field: "y" });
  const line = chart()
    .createCanvas({ width: 180, height: 140, margin: 20 })
    .createData({ values: [
      { x: 1, y: 2, label: "A" },
      { x: 2, y: 3, label: "B" }
    ] })
    .createLineMark({ id: "line" })
    .encodeX({ target: "line", field: "x" })
    .encodeY({ target: "line", field: "y" });
  const labeled = barProgram([{ category: "A", value: 5 }]).createMarkLabels({
    id: "labels",
    field: "value"
  });

  assertAtomicFailures(point, [{
    operation: () => point.createMarkLabels({
      id: "labels",
      field: "label",
      placement: { anchor: "insideEnd" }
    }),
    error: /Point does not support/
  }]);
  assertAtomicFailures(line, [{
    operation: () => line.createMarkLabels({
      id: "labels",
      field: "label",
      placement: { anchor: "center" }
    }),
    error: /endpoint API/
  }]);
  assertAtomicFailures(labeled, [
    {
      operation: () => labeled.editMarkLabelPlacement({
        target: "labels",
        placement: { anchor: "outsideEnd", gap: -1 }
      }),
      error: /non-negative/
    },
    {
      operation: () => labeled.editMarkLabelPlacement({ target: "labels" }),
      error: /requires target and placement/
    },
    {
      operation: () => labeled.editMarkLabelPlacement({
        target: "labels",
        placement: { anchor: "outsideEnd", leader: {} }
      }).layoutLabels({ target: "labels", leader: {} }),
      error: /conflicts/
    }
  ]);
  const collisionLayout = labeled.layoutLabels({ target: "labels", leader: {} });
  assertAtomicFailures(collisionLayout, [{
    operation: () => collisionLayout.editMarkLabelPlacement({
      target: "labels",
      placement: { anchor: "outsideEnd", leader: {} }
    }),
    error: /conflicts/
  }]);
});

test("renders semantic placement and leaders through Canvas, SVG, PNG, and PDF", async t => {
  const program = barProgram([{ category: "A", value: 5 }]).createMarkLabels({
    id: "labels",
    field: "value",
    placement: { anchor: "outsideEnd", leader: {} }
  });
  const context = createMockCanvasContext();
  render(program, context);
  assert.ok(findCanvasCalls(context, "fillText").length > 0);
  assert.ok(findCanvasCalls(context, "lineTo").length > 0);
  const svg = renderToSVG(program);
  assert.match(svg, /<text/);
  assert.match(svg, /<line/);

  const directory = await mkdtemp(join(tmpdir(), "ggaction-semantic-labels-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const pngPath = join(directory, "labels.png");
  const pdfPath = join(directory, "labels.pdf");
  await renderToPNG(program, { output: pngPath });
  await renderToPDF(program, { output: pdfPath });
  const png = await readFile(pngPath);
  const pdf = await readFile(pdfPath);
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.match(pdf.toString("latin1", 0, 8), /^%PDF-/);
});
