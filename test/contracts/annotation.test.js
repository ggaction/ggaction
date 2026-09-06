import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { assertChartProgramsEquivalent } from "../support/chart-equivalence.js";
import { assertRenderedPNG } from "../support/png.js";

function source() {
  return chart()
    .createCanvas({ width: 480, height: 320, margin: 40 })
    .createData({ values: [{ x: 1, y: 2 }, { x: 4, y: 5 }, { x: 8, y: 9 }] })
    .createPointMark()
    .encodeX({ field: "x", scale: { domain: [0, 10] } })
    .encodeY({ field: "y", scale: { domain: [0, 10] } });
}

test("data annotation equals its lower actions, literal graphic, Canvas, and PNG", async () => {
  const base = source();
  const options = {
    text: "Peak · 9.0",
    x: 8,
    y: 9,
    dx: 8,
    dy: -16,
    fontWeight: 600
  };
  const publicProgram = base.createAnnotation(options);
  const lower = base
    .createTextMark({ id: "annotation", data: "data", dx: 8, dy: -16, fontWeight: 600 })
    .encodeText({ target: "annotation", value: "Peak · 9.0" })
    .encodeX({ target: "annotation", datum: 8, fieldType: "quantitative", scale: { id: "x" }, coordinate: "main" })
    .encodeY({ target: "annotation", datum: 9, fieldType: "quantitative", scale: { id: "y" }, coordinate: "main" });
  assertChartProgramsEquivalent({ publicProgram, primitiveProgram: lower });

  const primitive = base
    .createGraphics({ id: "annotation", type: "text", length: 0, parent: "plot-main" })
    .editGraphics({ target: "annotation", property: "items", value: [{
      type: "text",
      properties: {
        x: 368,
        y: 48,
        text: "Peak · 9.0",
        fill: "#334155",
        opacity: 1,
        fontSize: 12,
        fontFamily: "sans-serif",
        fontWeight: 600,
        textAlign: "left",
        textBaseline: "alphabetic",
        rotation: 0
      }
    }] });
  assertChartProgramsEquivalent({
    publicProgram,
    primitiveProgram: primitive,
    compareSemanticSpec: false
  });

  const artifact = {
    scope: "charts",
    capability: "annotations",
    chart: "annotation-facade",
    variant: "data-anchor",
    title: "Text annotation at a data coordinate",
    userFacingCallChain: "source.createAnnotation({text:'Peak · 9.0',x:8,y:9,dx:8,dy:-16})"
  };
  const pngOptions = {
    width: 480,
    height: 320,
    colors: ["#4c78a8", { value: "#334155", tolerance: 2, minimumPixels: 20 }]
  };
  const a = await assertRenderedPNG(primitive, {
    ...pngOptions,
    artifact: { ...artifact, kind: "primitive" }
  });
  const b = await assertRenderedPNG(publicProgram, {
    ...pngOptions,
    artifact: { ...artifact, kind: "user-facing" }
  });
  assert.equal(a.pixelHash, b.pixelHash);
});

test("mark and plot annotation branches equal their lower public chains", () => {
  const markSource = source();
  assertChartProgramsEquivalent({
    publicProgram: markSource.createAnnotation({ text: "Point", source: "point" }),
    primitiveProgram: markSource.createMarkLabels({ id: "annotation", source: "point", value: "Point" })
  });

  const plotSource = chart()
    .createCanvas({ width: 480, height: 320, margin: 40 })
    .createData({ values: [] });
  const publicProgram = plotSource.createAnnotation({
    text: "Forecast",
    space: "plot",
    x: 0.75,
    y: 0.8
  });
  const lower = plotSource
    .createScale({ id: "annotation-x", type: "linear", domain: [0, 1] })
    .createScale({ id: "annotation-y", type: "linear", domain: [0, 1] })
    .createTextMark({ id: "annotation", data: "data" })
    .encodeText({ target: "annotation", value: "Forecast" })
    .encodeX({ target: "annotation", datum: 0.75, fieldType: "quantitative", scale: { id: "annotation-x" } })
    .encodeY({ target: "annotation", datum: 0.8, fieldType: "quantitative", scale: { id: "annotation-y" } });
  assertChartProgramsEquivalent({ publicProgram, primitiveProgram: lower });
  assert.equal(publicProgram.graphicSpec.objects.annotation.items.length, 1);
});
