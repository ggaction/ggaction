import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";
import { renderToPNGBuffer } from "../../../../src/renderers/png.js";
import { renderToPDFBuffer } from "../../../../src/renderers/pdf.js";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "../../../../src/persistence.js";
import { decodeValue, encodeValue } from "../../../../src/persistence/codec.js";
import { resolveLinearGradientCoordinates } from "../../../../src/grammar/paint.js";
const paint = (from = { x: 0, y: 1 }, to = { x: 0, y: 0 }) => ({ type: "linear-gradient", from, to, stops: [{ offset: 0, color: "rgba(255,255,255,0.5)" }, { offset: 0.4, color: "orange" }, { offset: 1, color: "#fc6721" }] });
const rows = [{ x: 0, y: 1, low: 0, high: 2, g: "A" }, { x: 1, y: 3, low: 1, high: 4, g: "A" }, { x: 2, y: 2, low: 0.5, high: 3, g: "A" }, { x: 0, y: 2, low: 1, high: 3, g: "B" }, { x: 1, y: 1, low: 0, high: 2, g: "B" }, { x: 2, y: 4, low: 1, high: 5, g: "B" }];
const base = (values = rows) => chart().createCanvas({ width: 360, height: 260, margin: { left: 40, top: 30, right: 110, bottom: 30 } }).createData({ id: "rows", values });
const area = (options) => base().createAreaPlot({ x: "x", y: "y", guides: false, ...options });
const fills = (p) => p.graphicSpec.objects.areaPlot.items.map((i) => i.properties.fill);
test("area constructors, facades and focused edits converge for each gradient orientation", () => {
  for (const [from, to] of [[{ x: 0, y: 0 }, { x: 1, y: 0 }], [{ x: 0, y: 1 }, { x: 0, y: 0 }], [{ x: 0, y: 0 }, { x: 1, y: 1 }]]) {
    const fill = paint(from, to), facade = area({ area: { fill } }), edited = area().editAreaMark({ fill }), constructed = base().createAreaMark({ id: "areaPlot", fill }).encodeX({ field: "x" }).encodeYRange({ lower: "y", upper: { datum: 0 } }).layoutSeries({ mode: "overlay" });
    assert.deepEqual(facade.graphicSpec, edited.graphicSpec);
    assert.deepEqual(facade.graphicSpec, constructed.graphicSpec);
    assert.ok(fills(facade).every((f) => f.type === "linear-gradient"));
    assert.deepEqual(resolveLinearGradientCoordinates(fill, { left: 10, right: 110, top: 20, bottom: 220 }), { from: { x: 10 + 100 * from.x, y: 20 + 200 * from.y }, to: { x: 10 + 100 * to.x, y: 20 + 200 * to.y } });
  }
});
test("structured area paint is cloned, frozen and retained by every geometric rematerializer", () => {
  const input = paint(), before = area(), program = before.editAreaMark({ fill: input, opacity: 0.7 }), beforeState = serializeProgram(before);
  input.stops[0].color = "green";
  input.to.x = 1;
  assert.equal(Object.isFrozen(input), false);
  assert.ok(Object.isFrozen(program.markConfigs.areaPlot.fill.stops));
  assert.equal(program.markConfigs.areaPlot.fill.stops[0].color, "rgba(255,255,255,0.5)");
  for (const p of [program, program.editCanvas({ width: 420 }), program.editXScale({ domain: [0, 3] }), program.editYScale({ domain: [0, 8] }), program.editCoordinate({ target: "main", aspect: "auto" }), program.reviseData({ source: "rows", id: "revised", values: rows.map((r) => ({ ...r, y: r.y + 1 })) })]) {
    assert.ok(fills(p).every((fill) => fill.stops[1].offset === 0.4));
    assert.match(renderToSVG(p), /<linearGradient/);
    assert.match(renderToSVG(p), /stop-color="rgba\(255,255,255,0.5\)"/);
  }
  assert.equal(serializeProgram(before), beforeState);
  assert.ok(fills(before).every((fill) => fill === "#4c78a8"));
  assert.equal(before.markConfigs.areaPlot.opacity, 0.2);
});
test("ranged, horizontal, stacked, grouped and missing-break area paths keep per-item paint", () => {
  const fill = paint();
  for (const options of [{ y: { lower: "low", upper: "high" } }, { x: { lower: "low", upper: "high" }, y: "x", valueChannel: "x" }, { groupBy: "g", layout: "stack" }, { groupBy: "g", layout: "overlay" }]) {
    const p = area({ ...options, area: { fill } });
    assert.ok(fills(p).length >= 1);
    assert.ok(fills(p).every((f) => f.type === "linear-gradient"));
  }
  const broken = base([{ x: 0, y: 1 }, { x: 1, y: 2 }, { x: 2, y: null }, { x: 3, y: 2 }, { x: 4, y: 3 }]).createAreaPlot({ x: "x", y: "y", missing: "break", area: { fill }, guides: false });
  assert.equal(broken.graphicSpec.objects.areaPlot.items.length, 2);
  assert.ok(broken.graphicSpec.objects.areaPlot.items.every((i) => i.properties.fill.type === "linear-gradient"));
});
test("color encodings retain precedence and removal restores the stored gradient", () => {
  const gradient = area({ groupBy: "g", area: { fill: paint() } }), colored = gradient.encodeColor({ field: "g", fieldType: "nominal" });
  assert.ok(fills(colored).every((fill) => typeof fill === "string"));
  assert.equal(colored.markConfigs.areaPlot.fill.type, "linear-gradient");
  assert.throws(() => colored.editAreaMark({ fill: paint() }), /cannot be combined with a color encoding/);
  const restored = colored.removeEncoding({ target: "areaPlot", channel: "color" });
  assert.deepEqual(fills(restored), fills(gradient));
});
test("gradient fallback survives stroke legends and refreshes after a focused paint edit", () => {
  const p = area({ groupBy: "g", area: { fill: paint(), opacity: 0.7 } }).encodeStroke({ field: "g", fieldType: "nominal" }).createLegend({ channels: ["stroke"], title: false, labels: { fontSize: 10 } }), swatches = p.graphicSpec.objects.strokeLegendSymbols.items;
  assert.equal(swatches.length, 2);
  assert.ok(swatches.every((i) => i.properties.fill.type === "linear-gradient" && i.properties.opacity === 0.7));
  const next = p.editAreaMark({ fill: paint({ x: 0, y: 0 }, { x: 1, y: 0 }) });
  assert.ok(next.graphicSpec.objects.strokeLegendSymbols.items.every((i) => i.properties.fill.to.x === 1));
  assert.match(renderToSVG(next), /<linearGradient/);
  const colored = p.encodeColor({ field: "g", fieldType: "nominal" });
  assert.ok(colored.graphicSpec.objects.strokeLegendSymbols.items.every((item) =>
    typeof item.properties.fill === "string"));
  const colorLegend = colored.removeLegend().createLegend({ channels: ["color"],
    title: false, labels: { fontSize: 10 } });
  const plainLegend = area({ groupBy: "g" }).encodeColor({ field: "g", fieldType: "nominal" })
    .createLegend({ channels: ["color"], title: false, labels: { fontSize: 10 } });
  assert.deepEqual(colorLegend.graphicSpec.objects.colorLegendSymbols,
    plainLegend.graphicSpec.objects.colorLegendSymbols);
  const saved = serializeProgram(p);
  assert.throws(() => p.editLegend({ symbol: { type: "point", radius: 4 } }));
  assert.equal(serializeProgram(p), saved);
});
test("solid stroke-from-fill behavior remains and gradient incompatibility is atomic", () => {
  const plain = area(), solid = plain.configureAreaStrokeFromFill({ id: "areaPlot", strokeWidth: 2 }), before = serializeProgram(solid);
  assert.throws(() => solid.editAreaMark({ fill: paint() }), /stroke-from-fill requires a solid fill/);
  assert.equal(serializeProgram(solid), before);
  const gradient = plain.editAreaMark({ fill: paint() }), saved = serializeProgram(gradient);
  assert.throws(() => gradient.configureAreaStrokeFromFill({ id: "areaPlot" }), /stroke-from-fill requires a solid fill/);
  assert.equal(serializeProgram(gradient), saved);
  const explicit = solid.editAreaMark({ fill: paint(), stroke: "black" });
  assert.equal(explicit.markConfigs.areaPlot.strokeFromFill, void 0);
  assert.ok(explicit.graphicSpec.objects.areaPlot.items.every((i) => i.properties.stroke === "black"));
});
test("invalid area paint and imported incompatible private state reject atomically", () => {
  const p = area(), saved = serializeProgram(p);
  for (const fill of [{}, [], { ...paint(), to: { x: 0, y: 1 } }, { ...paint(), from: { x: -1, y: 0 } }, { ...paint(), stops: [{ offset: 1, color: "red" }, { offset: 0, color: "blue" }] }, { ...paint(), extra: true }]) {
    assert.throws(() => p.editAreaMark({ fill }));
    assert.equal(serializeProgram(p), saved);
  }
  const envelope = JSON.parse(serializeProgram(p.editAreaMark({ fill: paint() }))), state = decodeValue(envelope.payload);
  state.materializationConfigs.marks.areaPlot.strokeFromFill = true;
  envelope.payload = encodeValue(state);
  assert.throws(() => deserializeProgram(JSON.stringify(envelope)), /stroke-from-fill requires a solid fill/);
});
test("area gradient persistence, highlights and backend-neutral graphic export retain the full paint", () => {
  const p = area({ groupBy: "g", area: { fill: paint(), opacity: 0.7 } }), restored = deserializeProgram(serializeProgram(p));
  assert.deepEqual(restored.graphicSpec, p.graphicSpec);
  assert.equal(renderToSVG(deserializeGraphic(serializeGraphic(p))), renderToSVG(p));
  const highlighted = p.selectMarks({ id: "chosen", target: "areaPlot", field: "g", op: "eq", value: "A" }).highlightMarks({ selection: "chosen", color: "red", dimOthers: false });
  assert.deepEqual(highlighted.removeMarkHighlight({ selection: "chosen" }).graphicSpec, p.graphicSpec);
  assert.deepEqual(highlighted.editCanvas({ width: 400 }).removeMarkHighlight({ selection: "chosen" }).graphicSpec, p.editCanvas({ width: 400 }).graphicSpec);
});
test("density, violin and interval-band fill owners share the same gradient contract", () => {
  const fill = paint(), density = base().createDensityPlot({ field: "y", bandwidth: 0.5, steps: 8, area: { fill }, guides: false }), violin = base().createViolinPlot({ x: "g", y: "y", density: { bandwidth: 0.5, steps: 8 }, area: { fill, stroke: "black", strokeWidth: 1 }, guides: false }), band = base().createErrorBand({ x: { field: "x" }, y: { center: "y", lower: "low", upper: "high" }, groupBy: "g", fill });
  for (const [p, id] of [[density, "densityPlot"], [violin, "violinPlot"], [band, "errorBand"]]) assert.ok(p.graphicSpec.objects[id].items.every((i) => i.properties.fill.type === "linear-gradient"));
  assert.ok(band.editErrorBand({ fill: paint({ x: 0, y: 0 }, { x: 1, y: 1 }) }).graphicSpec.objects.errorBand.items.every((i) => i.properties.fill.to.x === 1));
  assert.throws(() => base().createViolinPlot({ x: "g", y: "y", area: { fill, strokeWidth: 1 }, guides: false }), /stroke-from-fill requires a solid fill/);
});
test("SVG, native Canvas/PNG and PDF consume identical materialized area paint", async () => {
  const p = area({ area: { fill: paint(), opacity: 0.7 } }), graphic = deserializeGraphic(serializeGraphic(p));
  assert.equal(renderToSVG(p), renderToSVG(graphic));
  const [a, b] = await Promise.all([renderToPNGBuffer(p), renderToPNGBuffer(graphic)]);
  assert.deepEqual(a.buffer, b.buffer);
  assert.ok(a.bytes > 100);
  const pdf = await renderToPDFBuffer(p);
  assert.match(pdf.buffer.subarray(0, 5).toString(), /%PDF-/);
});
