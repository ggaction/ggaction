import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { assertChartProgramsEquivalent } from "../support/chart-equivalence.js";
import { assertRenderedPNG } from "../support/png.js";

test("source field reassignment with labels matches literal endpoint graphics and PNG", async () => {
  const base = chart().createCanvas({ width: 480, height: 320, margin: 40 })
    .createData({ values: [{ x: 1, y: 1, other: 100 }, { x: 2, y: 3, other: 1000 }] })
    .createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" })
    .createTextMark({ source: "point", text: "label", dy: -8 });
  const primitive = base.editSemantic({ property: "layer[point].encoding.y.field", value: "other" })
    .editGraphics({ target: "point", property: "y", value: [280, 40] })
    .editGraphics({ target: "text", property: "y", value: [272, 32] });
  const actual = base.encodeY({ target: "point", field: "other" });
  assertChartProgramsEquivalent({ publicProgram: actual, primitiveProgram: primitive });
  const artifact = { scope: "charts", capability: "labels", chart: "source-scale", variant: "field-replacement",
    title: "Labels follow the source scale after field replacement", userFacingCallChain:
      'base.encodeY({target:"point",field:"other"})' };
  const options = { width: 480, height: 320, colors: [{ value: "#4c78a8", tolerance: 2, minimumPixels: 10 }],
    regions: [{ name: "lower-source", x: 35, y: 265, width: 45, height: 20, minimumInkPixels: 10 }] };
  const a = await assertRenderedPNG(primitive, { ...options, artifact: { ...artifact, kind: "primitive" } });
  const b = await assertRenderedPNG(actual, { ...options, artifact: { ...artifact, kind: "user-facing" } });
  assert.equal(a.pixelHash, b.pixelHash);
});
