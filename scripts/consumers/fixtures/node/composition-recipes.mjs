import assert from "node:assert/strict";
import { createCanvas } from "@napi-rs/canvas";
import { render } from "ggaction";
import { getMarkItems } from "ggaction/inspection";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "ggaction/persistence";
import { renderToSVG } from "ggaction/svg";
import { renderToPNGBuffer } from "ggaction/png";
import { renderToPDFBuffer } from "ggaction/pdf";
import { createMarginal } from "./composition-recipes/marginal/program.js";
import { highlightMarginalBin } from "./composition-recipes/marginal/selection.js";
import { observations, targets } from "./composition-recipes/marginal/fixture.js";
import { createBullet } from "./composition-recipes/bullet/program.js";
import { createLinkedOverlay, rows } from "./composition-recipes/linked-overlay/program.js";
async function offline(p) {
  const restored = deserializeGraphic(serializeGraphic(p));
  assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
  assert.equal(renderToSVG(restored), renderToSVG(p));
  const png = (await renderToPNGBuffer(p)).buffer;
  assert.deepEqual((await renderToPNGBuffer(restored)).buffer, png);
  const canvas = createCanvas(1, 1); render(restored, canvas.getContext("2d"));
  assert.deepEqual(canvas.toBuffer("image/png"), png);
  const pdf = await renderToPDFBuffer(restored);
  assert.match(pdf.buffer.subarray(0, 8).toString(), /%PDF-/);
}
export const cases = [
  { id: "composition-recipes/marginal", async run() {
    assert.match(import.meta.resolve("ggaction"), /\/node_modules\/ggaction\//);
    const p = createMarginal(), before = serializeProgram(p);
    const linked = highlightMarginalBin(p, "x", 0);
    assert.deepEqual(getMarkItems(linked, { target: targets[1] }).filter(item => item.properties.fill === "#f97316").map(item => item.fields.id), ["a", "b"]);
    let q = linked;
    for (const target of targets) q = q.reviseData({ target: { childPath: target.childPath }, source: "observations", id: "next", values: [...observations].reverse() });
    q = highlightMarginalBin(q, "x", 0).editCanvas({ target: [{ childPath: ["x"] }, { childPath: ["lower", "center"] }], width: 420 });
    assert.deepEqual(q.children.x.resolvedScales.x, q.children.lower.children.center.resolvedScales.x);
    assert.deepEqual(getMarkItems(q, { target: targets[1] }).filter(item => item.properties.fill === "#f97316").map(item => item.fields.id), ["b", "a"]);
    assert.equal(serializeProgram(p), before);
    await offline(q);
  } },
  { id: "composition-recipes/bullet", async run() {
    const p = createBullet(), before = serializeProgram(p);
    assert.deepEqual(p.semanticSpec.layers.filter(layer => ["ranges", "measure", "target"].includes(layer.id)).map(layer => layer.encoding.x.scale), ["amount", "amount", "amount"]);
    const q = p.reviseData({ source: "observed", id: "next", values: [{ id: "revenue", metric: "Revenue", actual: 40, target: 90 }] }).editCanvas({ width: 460 });
    assert.equal(q.graphicSpec.objects.measure.items[0].properties.width, 160);
    assert.equal(q.graphicSpec.objects.target.items[0].properties.x1, 390);
    assert.equal(q.graphicSpec.objects["measure-label"].items[0].properties.text, "40");
    assert.equal(serializeProgram(p), before);
    await offline(q);
  } },
  { id: "composition-recipes/combo", async run() {
    const p = createLinkedOverlay(), before = serializeProgram(p), [bars, line] = p.semanticSpec.layers;
    assert.equal(bars.encoding.y.scale, line.encoding.y.scale);
    assert.equal(p.semanticSpec.scales.filter(scale => scale.id === bars.encoding.y.scale).length, 1);
    const q = p.reviseData({ source: "data", id: "next", values: rows.map(row => ({ ...row, sales: row.sales / 2 })) }).editCanvas({ plot: { width: 420, height: 240 } });
    assert.ok(q.graphicSpec.objects.trend.items[0].properties.commands.length >= 4);
    assert.equal(serializeProgram(p), before);
    await offline(q);
  } }
];
