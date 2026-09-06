import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { assertChartProgramsEquivalent } from "../support/chart-equivalence.js";
import { assertRenderedPNG } from "../support/png.js";

test("constant Text position matches literal graphics, Canvas, and decoded PNG", async () => {
  const base = chart()
    .createCanvas({ width: 480, height: 320, margin: 40 })
    .createData({ values: [] });
  const publicProgram = base
    .createTextMark({
      id: "annotation",
      data: "data",
      text: "Peak · 9.0",
      dx: 8,
      dy: -16,
      fontWeight: 600
    })
    .encodeX({ target: "annotation", datum: 8, scale: { domain: [0, 10] } })
    .encodeY({ target: "annotation", datum: 9, scale: { domain: [0, 10] } });
  const primitiveProgram = base
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
    primitiveProgram,
    compareSemanticSpec: false
  });
  assert.equal(publicProgram.graphicSpec.objects.annotation.items.length, 1);
  const artifact = {
    scope: "charts",
    capability: "annotations",
    chart: "text-datum",
    variant: "constant-position",
    title: "Constant text in data coordinates",
    userFacingCallChain: "createTextMark({data:'data',text:'Peak · 9.0'}).encodeX({datum:8}).encodeY({datum:9})"
  };
  const options = {
    width: 480,
    height: 320,
    minimumInkPixels: 25,
    colors: [{ value: "#334155", tolerance: 2, minimumPixels: 25 }]
  };
  const primitive = await assertRenderedPNG(primitiveProgram, {
    ...options,
    artifact: { ...artifact, kind: "primitive" }
  });
  const userFacing = await assertRenderedPNG(publicProgram, {
    ...options,
    artifact: { ...artifact, kind: "user-facing" }
  });
  assert.equal(userFacing.pixelHash, primitive.pixelHash);
});
