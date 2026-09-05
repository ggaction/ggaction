import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { assertChartProgramsEquivalent } from "../support/chart-equivalence.js";
import { assertRenderedPNG } from "../support/png.js";

function base() {
  return chart().createCanvas({ width: 1400, height: 1200, margin: 350 })
    .createData({ values: [{ x: 0, y: 0, g: "A", m: 0 }, { x: 1, y: 1, g: "B", m: 10 }] })
    .createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" }).encodeColor({ field: "g" })
    .encodeSize({ field: "m", scale: { range: [4 * Math.PI, 36 * Math.PI] } });
}

test("combined size titles share the categorical appearance at every edge", async () => {
  for (const position of ["right", "left", "top", "bottom"]) {
    const options = { channels: ["color", "size"], position, count: 2 };
    // The existing layout is unchanged; this literal primitive owns the color correction.
    const primitive = base().createLegend(options)
      .editGraphics({ target: "sizeLegendTitle", property: "fill", value: "#334155" });
    const actual = base().createLegend(options);
    assert.equal(actual.graphicSpec.objects.sizeLegendTitle.properties.fill, "#334155");
    assertChartProgramsEquivalent({ primitiveProgram: primitive, publicProgram: actual, compareSemanticSpec: false });
    const artifact = { scope: "charts", capability: "legend-layout", chart: "combined-appearance", variant: position,
      title: `Combined legend appearance at ${position}`,
      userFacingCallChain: `base().createLegend({channels:["color","size"],position:"${position}",count:2})` };
    const renderOptions = { width: 1400, height: 1200, colors: ["#4c78a8", "#f58518"],
      regions: [{ name: "marks", x: 340, y: 340, width: 720, height: 520, minimumInkPixels: 10 }] };
    const a = await assertRenderedPNG(primitive, { ...renderOptions, artifact: { ...artifact, kind: "primitive" } });
    const b = await assertRenderedPNG(actual, { ...renderOptions, artifact: { ...artifact, kind: "user-facing" } });
    assert.equal(a.pixelHash, b.pixelHash);
  }
});
