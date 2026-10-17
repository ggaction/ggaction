import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { resolveConcreteGraphicBounds } from "../../../../src/grammar/schemas/graphicBounds.js";
import { resolveGraphicBounds } from "../../../../src/layout/canvas.js";
import { resolveTextBounds } from "../../../../src/core/textMetrics.js";

const rows = ["Alpha category", "Beta category", "Gamma category"].map((category, i) => ({ category, value: i + 1 }));
function source(automatic = false) {
  return chart().createCanvas(automatic
    ? { plot: { width: 300, height: 300 } }
    : { width: 800, height: 800, margin: 250 })
    .createData({ values: rows })
    .createScatterPlot({ x: { field: "category", fieldType: "nominal" }, y: "value", guides: false });
}
function assertOutside(program, channel, position, offset = 7) {
  const plot = resolveGraphicBounds(program);
  const collection = program.graphicSpec.objects[`${channel}AxisLabels`];
  const keys = { bottom: ["top", plot.y + plot.height, 1], top: ["bottom", plot.y, -1], left: ["right", plot.x, -1], right: ["left", plot.x + plot.width, 1] };
  const [key, edge, direction] = keys[position];
  for (const item of collection.items) {
    const bounds = resolveTextBounds(item.properties, program.materializationConfigs.textMetrics);
    assert.ok(Math.abs(direction * (bounds[key] - edge) - offset) < 1e-8, `${position} label stays ${offset}px outside its plot edge`);
  }
}

for (const automatic of [false, true]) {
  for (const angle of [-270, -90, -45, 45, 90, 270]) {
    for (const position of ["bottom", "top"]) {
      test(`${automatic ? "automatic" : "fixed"} Canvas anchors ${position} labels outward at ${angle} degrees`, () => {
        const base = source(automatic), before = JSON.stringify(base);
        const program = base.createXAxis({ title: false, position, ticksAndLabels: { labels: { rotation: { value: angle, unit: "degrees" }, offset: 7, fontSize: 10 } } });
        assertOutside(program, "x", position);
        if (Math.abs(angle) % 180 === 90) {
          const labels = program.graphicSpec.objects.xAxisLabels.items;
          const ticks = program.graphicSpec.objects.xAxisTicks.items;
          for (const [i, label] of labels.entries()) {
            const b = resolveTextBounds(label.properties, program.materializationConfigs.textMetrics);
            assert.ok(Math.abs((b.left + b.right) / 2 - ticks[i].properties.x1) < 1e-8, "vertical glyphs are centered over their tick");
          }
        }
        assert.equal(JSON.stringify(base), before);
      });
    }
  }
}

test("rotated side-axis labels stay outside fixed margins", () => {
  for (const position of ["left", "right"]) for (const angle of [-90, -45, 45, 90]) {
    const p = source().createYAxis({ title: false, position, ticksAndLabels: { values: [1, 2, 3], labels: { rotation: { value: angle, unit: "degrees" }, offset: 7 } } });
    assertOutside(p, "y", position);
  }
});

test("focused edits, mirrored positions, scale and Canvas replay preserve rotated edge anchoring", () => {
  const initial = source().createXAxis({ title: false, ticksAndLabels: { labels: { rotation: -Math.PI / 2, offset: 7, fontSize: 10 } } });
  const before = JSON.stringify(initial);
  const edited = initial.editXAxisLabels({ rotation: { value: 45, unit: "degrees" } })
    .editXScale({ domain: rows.map(r => r.category).reverse() })
    .editCanvas({ width: 840 });
  assertOutside(edited, "x", "bottom");
  const mirrored = edited.editXAxis({ position: "top" });
  assertOutside(mirrored, "x", "top");
  assert.equal(JSON.stringify(initial), before);
  const snapshot = JSON.stringify(edited);
  assert.throws(() => edited.editXAxisLabels({ offset: 400 }), /labels do not fit/);
  assert.equal(JSON.stringify(edited), snapshot);
  assert.ok(resolveConcreteGraphicBounds(edited.graphicSpec, "xAxisLabels").bottom <= 800);
});

test("all output adapters consume the same outward-anchored rotated labels", async () => {
  const { renderToSVG } = await import("../../../../src/renderers/svg.js");
  const { render } = await import("../../../../src/renderers/canvas/index.js");
  const { renderToPNGBuffer } = await import("../../../../src/renderers/png.js");
  const { renderToPDFBuffer } = await import("../../../../src/renderers/pdf.js");
  const { createMockCanvasContext, findCanvasCalls } = await import("../../../support/canvas.js");
  const p = source().createXAxis({ title: false, ticksAndLabels: { labels: { rotation: -Math.PI / 2, fontSize: 10, offset: 7 } } });
  const before = JSON.stringify(p);
  const svg = renderToSVG(p);
  assert.match(svg, /text-anchor="end"/);
  assert.match(svg, /dominant-baseline="middle"/);
  const context = createMockCanvasContext();
  render(p, context);
  const text = findCanvasCalls(context, "fillText").filter(c => rows.some(r => r.category === c.args[0]));
  assert.equal(text.length, 3);
  assert.ok(text.every(c => c.textAlign === "right" && c.textBaseline === "middle"));
  const png = await renderToPNGBuffer(p);
  const pdf = await renderToPDFBuffer(p);
  assert.deepEqual([png.width, png.height, pdf.width, pdf.height], [800, 800, 800, 800]);
  assert.equal(png.buffer.subarray(1, 4).toString(), "PNG");
  assert.equal(Buffer.from(pdf.buffer).subarray(0, 4).toString(), "%PDF");
  assert.equal(JSON.stringify(p), before);
});
