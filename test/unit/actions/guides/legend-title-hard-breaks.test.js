import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";
import { resolveConcreteGraphicBounds } from "../../../../src/grammar/schemas/graphicBounds.js";
import { render } from "../../../../src/renderers/canvas/index.js";
import { createMockCanvasContext, findCanvasCalls } from "../../../support/canvas.js";

const values = [{ x: 1, y: 2, group: "A", amount: 1 },
  { x: 2, y: 3, group: "B", amount: 4 }];
function source(kind) {
  const base = chart().createCanvas({ width: 1400, height: 1200, margin: 350 }).createData({ values });
  if (kind === "strokeWidth") return base.createLinePlot({ x: "x", y: "y", groupBy: "group", guides: false }).encodeStrokeWidth({ field: "amount" });
  let p = base.createScatterPlot({ x: "x", y: "y", guides: false });
  if (kind === "series") return p.encodeShape({ field: "group" });
  if (kind === "size") return p.encodeSize({ field: "amount" });
  if (kind === "opacity") return p.encodeOpacity({ field: "amount" });
  if (kind === "stroke" || kind === "strokeGradient" || kind === "strokeInterval")
    return p.encodeStroke({ field: kind === "stroke" ? "group" : "amount",
      fieldType: kind === "stroke" ? "nominal" : "quantitative",
      ...(kind === "strokeInterval" ? { scale: { type: "quantize", range: ["red", "blue"] } } : {}) });
  p = p.encodeColor({ field: kind === "color" || kind === "combined" ? "group" : "amount",
    fieldType: kind === "color" || kind === "combined" ? "nominal" : "quantitative",
    ...(kind === "interval" ? { scale: { type: "quantize", range: ["red", "blue"] } } : {}) });
  return kind === "combined" ? p.encodeSize({ field: "amount" }) : p;
}
const kinds = ["color", "series", "size", "combined", "gradient", "interval",
  "stroke", "strokeGradient", "strokeInterval", "opacity", "strokeWidth"];
const titleObject = p => Object.entries(p.graphicSpec.objects).find(([, o]) => o.properties?.text === "Alpha\nBeta");

test("every legend family materializes ordered hard title lines on every edge", () => {
  for (const kind of kinds) for (const position of ["top", "right", "bottom", "left"]) {
    const base = source(kind), p = base.createLegend({ position, title: "Alpha\nBeta", border: true });
    const [id, graphic] = titleObject(p);
    assert.deepEqual(graphic.properties.lines.map(l => l.text), ["Alpha", "Beta"], `${kind}/${position}`);
    assert.equal(graphic.properties.lines[1].y - graphic.properties.lines[0].y, graphic.properties.fontSize * 1.2);
    assert.ok(resolveConcreteGraphicBounds(p.graphicSpec, id).bottom - resolveConcreteGraphicBounds(p.graphicSpec, id).top > graphic.properties.fontSize);
    assert.match(renderToSVG(p), /<tspan[^>]*>Alpha<\/tspan><tspan[^>]*>Beta<\/tspan>/);
    assert.deepEqual(base.createLegend({ position, border: true }).editLegend({ title: "Alpha\nBeta" }).graphicSpec, p.graphicSpec);
    assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
  }
});

test("single-line edits remove stale lines, retain drawing order and converge with fresh creation", () => {
  for (const kind of kinds) {
    const base = source(kind), p = base.createLegend({ title: "Alpha\nBeta" });
    const before = serializeProgram(p), single = p.editLegend({ title: "One" });
    assert.deepEqual(single.graphicSpec, base.createLegend({ title: "One" }).graphicSpec, kind);
    assert.equal(serializeProgram(p), before);
    assert.deepEqual(p.editCanvas({ width: 1500 }).graphicSpec,
      deserializeProgram(serializeProgram(p)).editCanvas({ width: 1500 }).graphicSpec);
  }
});

test("hard lines keep blank rows and remeasure after font and block edits", () => {
  for (const kind of ["color", "gradient", "opacity", "size"]) {
    const base = source(kind), p = base.createLegend({ title: "Alpha\r\n\rBeta" });
    const title = Object.values(p.graphicSpec.objects).find(o => o.properties?.text === "Alpha\r\n\rBeta");
    assert.deepEqual(title.properties.lines.map(l => l.text), ["Alpha", "", "Beta"]);
    const changed = p.editLegend({ titleStyle: { fontSize: 16 } });
    const updated = Object.values(changed.graphicSpec.objects).find(o => o.properties?.text === "Alpha\r\n\rBeta");
    assert.equal(updated.properties.lines[2].y - updated.properties.lines[0].y, 38.4);
  }
  const p = source("color").createLegend();
  const block = p.editLegendBlock({ target: "scatterPlot", channel: "color", title: "Alpha\nBeta" });
  assert.deepEqual(titleObject(block)[1].properties.lines.map(l => l.text), ["Alpha", "Beta"]);
});

test("a multiline in-plot overflow fails atomically", () => {
  const base = chart().createCanvas({ width: 300, height: 200, margin: 60 }).createData({ values })
    .createScatterPlot({ x: "x", y: "y", color: "group", guides: false });
  const before = serializeProgram(base);
  assert.throws(() => base.createLegend({ position: "top-right", title: "Alpha\n".repeat(20) }), /fit|space|Canvas/);
  assert.equal(serializeProgram(base), before);
});

test("Canvas draws resolved title lines instead of interpreting newline text", () => {
  const p = source("color").createLegend({ title: "Alpha\nBeta" });
  const context = createMockCanvasContext();
  render(p, context);
  const calls = findCanvasCalls(context, "fillText").filter(c => ["Alpha", "Beta"].includes(c.args[0]));
  assert.deepEqual(calls.map(c => c.args[0]), ["Alpha", "Beta"]);
  assert.ok(calls[1].args[2] > calls[0].args[2]);
  assert.ok(findCanvasCalls(context, "fillText").every(c => !String(c.args[0]).includes("\n")));
});
