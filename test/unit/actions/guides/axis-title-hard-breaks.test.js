import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";
import { render } from "../../../../src/renderers/canvas/index.js";
import { resolveConcreteGraphicBounds } from "../../../../src/grammar/schemas/graphicBounds.js";
import { createMockCanvasContext, findCanvasCalls } from "../../../support/canvas.js";

function base() {
  return chart().createCanvas({ width: 600, height: 500, margin: 110 })
    .createData({ values: [{ x: 0, y: 0, panel: "A" }, { x: 10, y: 10, panel: "B" }] })
    .createScatterPlot({ x: "x", y: "y", guides: false });
}
const title = (p, channel) => p.graphicSpec.objects[`${channel}AxisTitle`].properties;
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
const cases = [["x", "bottom"], ["x", "top"], ["y", "left"], ["y", "right"]];
for (const [channel, position] of cases) {
  const action = channel === "x" ? "createXAxisTitle" : "createYAxisTitle";
  const edit = channel === "x" ? "editXAxisTitle" : "editYAxisTitle";
  test(`${position} axis title stores centered hard lines and both renderers consume them`, () => {
    const p = base()[action]({ text: "Alpha\nBeta", position, fontSize: 10, offset: 50 });
    const props = title(p, channel);
    assert.equal(p.semanticSpec.guides.axis[channel].title, "Alpha\nBeta");
    assert.deepEqual(props.lines, [{ text: "Alpha", x: 0, y: -6 }, { text: "Beta", x: 0, y: 6 }]);
    const bounds = resolveConcreteGraphicBounds(p.graphicSpec, `${channel}AxisTitle`);
    close(channel === "x" ? bounds.bottom - bounds.top : bounds.right - bounds.left, 22);
    assert.match(renderToSVG(p), /<tspan[^>]*>Alpha<\/tspan><tspan[^>]*>Beta<\/tspan>/);
    const ctx = createMockCanvasContext(); render(p, ctx);
    const painted = findCanvasCalls(ctx, "fillText").map(c => c.args[0]);
    assert.ok(painted.includes("Alpha") && painted.includes("Beta"));
    assert.ok(!painted.includes("Alpha\nBeta"));
    assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
  });
  test(`${position} axis title edits drop stale lines and preserve single-line parity`, () => {
    const source = base(), options = { position, fontSize: 10, offset: 50 };
    const multiline = source[action]({ ...options, text: "Alpha\nBeta" });
    const before = serializeProgram(multiline), order = multiline.graphicSpec.order;
    const single = multiline[edit]({ text: "One" });
    assert.ok(!Object.hasOwn(title(single, channel), "lines"));
    assert.deepEqual(single.graphicSpec, source[action]({ ...options, text: "One" }).graphicSpec);
    assert.deepEqual(single.graphicSpec.order, order);
    assert.equal(serializeProgram(multiline), before);
    assert.deepEqual(single[edit]({ text: "Alpha\nBeta" }).graphicSpec, multiline.graphicSpec);
  });
}

test("hard-line spacing preserves CRLF, CR, blank lines and explicit rotation", () => {
  const p = base().createYAxisTitle({ text: "Alpha\r\n\rBeta\n", fontSize: 10,
    offset: 50, rotation: { value: 25, unit: "degrees" } });
  assert.deepEqual(title(p, "y").lines.map(l => l.text), ["Alpha", "", "Beta", ""]);
  assert.deepEqual(title(p, "y").lines.map(l => l.y), [-18, -6, 6, 18]);
  close(title(p, "y").rotation, 25 * Math.PI / 180);
  const edited = p.editYAxisTitle({ fontSize: 20 });
  assert.deepEqual(title(edited, "y").lines.map(l => l.y), [-36, -12, 12, 36]);
  close(title(edited, "y").rotation, title(p, "y").rotation);
  assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
});

test("Canvas and scale rematerialization preserve concrete line layout and converge", () => {
  const p = base().createXAxisTitle({ text: "Alpha\nBeta", offset: 50, fontSize: 10 });
  const resized = p.editCanvas({ width: 720, height: 600 });
  assert.deepEqual(title(resized, "x").lines, title(p, "x").lines);
  close(title(resized, "x").x - title(p, "x").x, 60);
  assert.deepEqual(resized.graphicSpec, deserializeProgram(serializeProgram(p)).editCanvas({ width: 720, height: 600 }).graphicSpec);
  const scaled = p.editXScale({ domain: [0, 20] });
  assert.deepEqual(title(scaled, "x").lines, title(p, "x").lines);
});

test("facet snapshots retain translated axis-title lines through persistence and resize", () => {
  const p = base().createXAxisTitle({ text: "Alpha\nBeta", offset: 50, fontSize: 10 })
    .createYAxisTitle({ text: "Gamma\nDelta", offset: 50, fontSize: 10 })
    .facet({ field: "panel", columns: 2 });
  const titles = Object.values(p.graphicSpec.objects).filter(o => o.type === "text" && o.properties?.lines);
  assert.ok(titles.length >= 2);
  for (const item of titles) {
    assert.equal(item.properties.lines.length, 2);
    assert.deepEqual(item.properties.lines.map(line => [line.x, line.y]), [[0, -6], [0, 6]]);
  }
  assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
  assert.doesNotThrow(() => renderToSVG(p));
  const changed = p.editCompositionLayout({ gap: 20 });
  assert.ok(Object.values(changed.graphicSpec.objects).some(o => o.properties?.lines?.length === 2));
});

test("a short multiline block fits where a falsely concatenated estimate would overflow", () => {
  const words = "A moderately long description";
  const p = chart().createCanvas({ width: 320, height: 300, margin: 45 })
    .createData({ values: [{ x: 0, y: 0 }, { x: 10, y: 10 }] })
    .createScatterPlot({ x: "x", y: "y", guides: false });
  assert.doesNotThrow(() => p.createYAxisTitle({ text: `${words}\n${words}`, fontSize: 11, offset: 30 }));
});

test("overflow and collision rejections leave earlier title state and trace atomic", () => {
  const p = base().createXAxisTitle({ text: "Alpha\nBeta", fontSize: 10, offset: 50 });
  const before = serializeProgram(p);
  assert.throws(() => p.editXAxisTitle({ text: Array(30).fill("Overflow").join("\n") }), /Canvas margin/);
  assert.throws(() => p.editCanvas({ height: 120 }), /Canvas|margin|positive/);
  assert.equal(serializeProgram(p), before);
  const axes = base().createXAxis({ ticksAndLabels: { values: [0, 5, 10] }, title: false });
  const original = serializeProgram(axes);
  assert.throws(() => axes.createXAxisTitle({ text: "Alpha\nBeta", fontSize: 14, offset: 8 }), /overlaps/);
  assert.equal(serializeProgram(axes), original);
});
