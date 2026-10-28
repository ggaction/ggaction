import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { chart, prepareFontResource, prepareTextMetrics, prepareFontRendering, render } from "../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { renderToPNGBuffer } from "../../../src/renderers/png.js";
import { prepareTextGlyphMask } from "../../../src/renderers/textGlyphMask.js";
import { nativeFontRegistrar } from "../../../src/renderers/nativeBackend.js";
import { createTransitionScene } from "../../../src/scene.js";

const bytes = new Uint8Array(readFileSync(new URL("../../fixtures/fonts/metric-fixture.ttf", import.meta.url)));
const expectedHash = createHash("sha256").update(bytes).digest("hex");
const identity = request => Object.fromEntries(["contentHash", "family", "style", "weight", "metricsProviderVersion"].map(key => [key, request[key]]));
const host = { requestToken: "current", load: () => ({ bytes, mimeType: "font/ttf" }), decode: identity,
  measure: ({ asset, queries }) => ({ contentHash: asset.contentHash, metricsProviderVersion: asset.metricsProviderVersion,
    widths: queries.map(({ text, fontSize }) => [...text].reduce((sum, value) => sum + ({ A: 600, B: 800 }[value] ?? 0), 0) * fontSize / 1000) }) };

async function fixture() {
  let program = chart().createCanvas({ width: 100, height: 80, margin: 0, background: "white" })
    .createData({ id: "labels", values: [{ x: 20, y: 30, text: "AB" }] })
    .createTextMark({ id: "letters", fontFamily: "ggaction Metric Fixture", fontSize: 20, fill: "red", align: "left", baseline: "alphabetic", outline: { color: "black", width: 4 }, opacity: .5 })
    .encodeX({ field: "x", scale: { domain: [0, 100] } }).encodeY({ field: "y", scale: { domain: [0, 80] } }).encodeText({ field: "text" })
    .createData({ id: "nodes", values: [{ id: "a" }, { id: "b" }] })
    .createData({ id: "edges", values: [{ from: "a", to: "b" }] })
    .createGraphData({ id: "network", nodes: "nodes", edges: "edges", nodeKey: "id", source: "from", target: "to" });
  const prepared = await prepareFontResource(program, { kind: "create", id: "font", uri: "fixture:font", expectedHash,
    mimeType: "font/ttf", family: "ggaction Metric Fixture", style: "normal", weight: 400, metricsProviderVersion: "fixture@1" }, host);
  program = program.createFontResource({ prepared, requestToken: "current" });
  const { load: _load, ...metricsHost } = host;
  return program.applyTextMetrics({ prepared: await prepareTextMetrics(program, { id: "exact", fonts: ["font"] }, metricsHost), requestToken: "current" });
}

test("exact font aliases and outlined native glyphs share one concrete source after graph restoration", async () => {
  const program = await fixture(), restored = deserializeProgram(serializeProgram(program));
  assert.deepEqual(restored.graphicSpec, program.graphicSpec);
  assert.deepEqual(restored.semanticSpec.resources.map(resource => resource.kind), ["graph", "font"]);
  const text = restored.graphicSpec.objects.letters.items[0];
  assert.equal(text.properties.font.contentHash, expectedHash);
  assert.equal(text.properties.outline.width, 4);
  const svg = renderToSVG(restored);
  assert.match(svg, /font-family="ggaction-font-/);
  assert.match(svg, /paint-order="stroke fill"/);
  const scene = createTransitionScene(restored);
  assert.match(scene.nodes.find(node => node.type === "text").svg, /paint-order="stroke fill"/);
  const fonts = await prepareFontRendering(restored, { register: nativeFontRegistrar(GlobalFonts) });
  try {
    const canvas = createCanvas(1, 1); render(restored, canvas.getContext("2d"), { fonts });
    assert.deepEqual([...canvas.getContext("2d").getImageData(23, 42, 1, 1).data], [255, 128, 128, 255]);
    assert.deepEqual([...canvas.getContext("2d").getImageData(20, 42, 1, 1).data], [128, 128, 128, 255]);
    assert.deepEqual((await renderToPNGBuffer(restored)).buffer, await canvas.encode("png"));
    const mask = prepareTextGlyphMask(restored, text, { left: 0, top: 0, width: 100, height: 80 }, { fonts, createCanvas });
    const pixel = (x, y) => [...mask.rgba.slice((y * 100 + x) * 4, (y * 100 + x) * 4 + 4)];
    assert.deepEqual(pixel(23, 42), [255, 0, 0, 255]);
    assert.deepEqual(pixel(20, 42), [0, 0, 0, 255]);
  } finally { fonts.dispose(); }
  const edited = restored.editTextMark({ target: "letters", outline: { color: "blue", width: 2 } });
  assert.equal(edited.graphicSpec.objects.letters.items[0].properties.font.contentHash, expectedHash);
  assert.equal(restored.graphicSpec.objects.letters.items[0].properties.outline.width, 4);
});
