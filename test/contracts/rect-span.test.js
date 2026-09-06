import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { assertChartProgramsEquivalent } from "../support/chart-equivalence.js";
import { assertRenderedPNG } from "../support/png.js";

for (const axis of ["x", "y"]) test(`constant ${axis} Rect span matches literal graphics and PNG`, async () => {
  const base = chart().createCanvas({ width: 480, height: 320, margin: 40 }).createData({ values: [{ value: 3 }, { value: 7 }] })
    .createRectMark({ id: "band", data: "data", fill: "#93c5fd", opacity: 0.5, stroke: false })
    .createScale({ id: axis, type: "linear", domain: [0, 10], range: axis === "x" ? [40, 440] : [280, 40] });
  const rect = { ...(axis === "x" ? { x: 120, y: 40, width: 160, height: 240 } : { x: 40, y: 136, width: 400, height: 96 }),
    fill: "#93c5fd", opacity: 0.5, stroke: "transparent", strokeWidth: 0 };
  const primitive = base.editGraphics({ target: "band", property: "items", value: [{ type: "rect", properties: rect }] });
  const actual = base[axis === "x" ? "encodeX" : "encodeY"]({ datum: 2 })
    [axis === "x" ? "encodeX2" : "encodeY2"]({ datum: 6 });
  assertChartProgramsEquivalent({ publicProgram: actual, primitiveProgram: primitive, compareSemanticSpec: false });
  const artifact = { scope: "charts", capability: "rectangles", chart: "constant-spans", variant: axis,
    title: `Constant ${axis} interval across the plot`, userFacingCallChain: `base.encode${axis.toUpperCase()}({datum:2}).encode${axis.toUpperCase()}2({datum:6})` };
  const options = { width: 480, height: 320, colors: [{ value: "#c9e2fe", tolerance: 1, minimumPixels: 1000 }], regions: [{ name: "band", ...rect, minimumInkPixels: 1000 }] };
  const a = await assertRenderedPNG(primitive, { ...options, artifact: { ...artifact, kind: "primitive" } });
  const b = await assertRenderedPNG(actual, { ...options, artifact: { ...artifact, kind: "user-facing" } });
  assert.equal(a.pixelHash, b.pixelHash);
});
