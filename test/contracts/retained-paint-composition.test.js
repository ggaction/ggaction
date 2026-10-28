import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { chart, render, prepareImageResource, prepareImageRendering } from "../../src/index.js";
import { getMarkItems } from "../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { renderToPNGBuffer } from "../../src/renderers/png.js";
import { renderToPDFBuffer } from "../../src/renderers/pdf.js";
import { createTransitionScene, renderTransitionScene } from "../../src/scene.js";

const rows = [{ id: "root", parent: null, value: 10, x: 30, y: 130 },
  { id: "a", parent: "root", value: 6, x: 60, y: 130 },
  { id: "b", parent: "root", value: 4, x: 90, y: 130 }];
const bytes = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10"><rect width="20" height="10" fill="#ff0000"/></svg>');
const source = { uri: "fixture:retained-logo", expectedHash: createHash("sha256").update(bytes).digest("hex"), mimeType: "image/svg+xml" };
const decode = async ({ bytes }) => { const image = await loadImage(bytes); return { image, width: image.width, height: image.height, originClean: true }; };
async function program(method) {
  const base = chart().createCanvas({ width: 260, height: 200, margin: 0 })
    .createData({ id: "rows", values: rows, keyField: "id" })
    .createHierarchyData({ id: "h", key: "id", parent: "parent", value: "value" })
    .layoutHierarchy({ id: "layout", method, options: method === "tree" ?
      { nodeSize: [24, 10], siblingGap: 30, depthGap: 40, orientation: "vertical" } :
      { size: [160, 90], padding: 5, method: "squarify" } });
  const tree = method === "tree" ? base.createTreePlot({ id: "plot", labels: {} }) : base.createTreemapPlot({ id: "plot", labels: {} });
  const p = tree.createPointMark({ id: "dots", data: "rows", outline: { color: "white", width: 8 }, fill: "blue" })
    .encodeX({ target: "dots", field: "x", scale: { domain: [0, 260], range: [0, 260] } })
    .encodeY({ target: "dots", field: "y", scale: { domain: [0, 200], range: [0, 200] } });
  const prepared = await prepareImageResource(p, { kind: "create", id: "logo", ...source }, {
    requestToken: "now", load: () => ({ bytes, mimeType: source.mimeType }), decode: () => ({ width: 20, height: 10, originClean: true })
  });
  return p.createImageResource({ prepared, requestToken: "now" })
    .createImageMark({ id: "logoMark", image: "logo", viewport: { x: 220, y: 160, width: 20, height: 10 }, fit: "fill", alt: "Red logo" });
}
for (const method of ["tree", "treemap"]) test(`${method}, retained image and outline share revision, codec and graphic-only renderers`, async () => {
  const p = await program(method), before = serializeProgram(p), originalItems = getMarkItems(p, { target: "dots" });
  const images = await prepareImageRendering(p, { decode });
  const revised = p.reviseData({ source: "rows", id: "next", values: rows.map(row => ({ ...row, value: row.value * 2, x: row.x + 5 })) });
  assert.equal(revised.semanticSpec.resources.find(resource => resource.kind === "hierarchy").revision, 1);
  assert.equal(revised.semanticSpec.resources.find(resource => resource.kind === "layout").revision, 1);
  assert.equal(revised.semanticSpec.resources.find(resource => resource.kind === "image").revision, 0);
  const revisedItems = getMarkItems(revised, { target: "dots" });
  assert.deepEqual(revisedItems.map(item => item.key), originalItems.map(item => item.key));
  assert.deepEqual(revisedItems.map(item => item.rows.map(row => row.rowKey)), originalItems.map(item => item.rows.map(row => row.rowKey)));
  assert.ok(revisedItems.every(item => item.rows.every(row => row.data === "next" && row.revision === 1)));
  assert.ok(revised.graphicSpec.objects.dots.items.every(item => item.properties.outline.width === 8));
  const untouched = createCanvas(3, 4);
  assert.throws(() => render(revised, untouched.getContext("2d"), { images }), error => error.assetCode === "stale-result");
  assert.deepEqual([untouched.width, untouched.height], [3, 4]);
  const restored = deserializeProgram(serializeProgram(revised)), svg = renderToSVG(restored);
  assert.equal(svg, renderToSVG(revised));
  assert.match(svg, /paint-order="stroke fill"/); assert.match(svg, /data:image\/svg\+xml;base64,/);
  const actual = createCanvas(1, 1); render(restored, actual.getContext("2d"), { images: await prepareImageRendering(restored, { decode }) });
  assert.deepEqual([...actual.getContext("2d").getImageData(230, 165, 1, 1).data], [255, 0, 0, 255]);
  const scene = createTransitionScene(restored, { format: "canvas" }), sceneCanvas = createCanvas(1, 1);
  renderTransitionScene(scene, sceneCanvas.getContext("2d"), { images: await prepareImageRendering(scene, { decode }) });
  assert.deepEqual(sceneCanvas.toBuffer("image/png"), actual.toBuffer("image/png"));
  assert.deepEqual((await renderToPNGBuffer(restored)).buffer, actual.toBuffer("image/png"));
  assert.equal((await renderToPDFBuffer(restored)).buffer.subarray(0, 4).toString(), "%PDF");
  const removed = restored.removeResource({ kind: "image", id: "logo", cascade: true });
  assert.equal(removed.graphicSpec.objects.logoMark, undefined);
  assert.deepEqual(removed.graphicSpec.objects.dots, restored.graphicSpec.objects.dots);
  assert.deepEqual(removed.graphicSpec.objects.plot, restored.graphicSpec.objects.plot);
  assert.equal(serializeProgram(p), before);
});
