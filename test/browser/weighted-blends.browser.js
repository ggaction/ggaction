import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { chromium } from "playwright";
import { createCanvas } from "@napi-rs/canvas";
import { weightedBlendFixture } from "../support/weighted-blends.js";
import { startStaticServer } from "../support/static-server.js";
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence, saveBrowserEvidence } from "../support/browser.js";
const root = fileURLToPath(new URL("../../", import.meta.url));
let directory, server, browser;
test.before(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "ggaction-weighted-"));
  const bundle = await build({ stdin: { contents: `export {render} from './src/renderers/canvas/index.js'; export {renderToSVG} from './src/renderers/svg.js'; export {prepareFontRendering} from './src/renderers/fontRendering.js'; export {prepareImageRendering} from './src/renderers/imageRendering.js'; export {prepareShadowRendering} from './src/renderers/shadowRendering.js'; export {serializeGraphic,deserializeGraphic} from './src/persistence.js';`, resolveDir: root }, bundle: true, platform: "browser", format: "esm", write: false });
  await writeFile(path.join(directory, "render.js"), bundle.outputFiles[0].contents);
  await writeFile(path.join(directory, "index.html"), '<!doctype html><html lang="en"><title>Weighted blends</title><link rel="icon" href="data:,"><p id="status">Ready</p><canvas width="80" height="80" aria-label="Weighted primitive sources"></canvas></html>');
  server = await startStaticServer(directory);browser = await chromium.launch({ headless: true });
});
test.after(async () => { await closeBrowserWithEvidence(browser);await server?.close();if (directory) await rm(directory, { recursive: true, force: true }); });
for (const ratio of [1, 2]) test(`browser weighted source colors, topology and retained Text agree in Canvas and SVG at DPR ${ratio}`, async () => {
  const bytes = await readFile(new URL("../fixtures/fonts/metric-fixture.ttf", import.meta.url));
  const font = { contentHash: createHash("sha256").update(bytes).digest("hex"), mimeType: "font/ttf", byteLength: bytes.length,
    family: "ggaction Metric Fixture", style: "normal", weight: 400, metricsProviderVersion: "fixture@1", payload: { encoding: "base64", data: bytes.toString("base64") } };
  const fixtures = ["opaque", "translucent", "topology", "endpoint", "many", "unequal", "text"].map(kind => weightedBlendFixture(kind, font));
  const imageFixture = weightedBlendFixture("image"), c = createCanvas(2, 2);c.getContext("2d").fillStyle = "blue";c.getContext("2d").fillRect(0, 0, 2, 2);
  const imageBytes = await c.encode("png"), image = { contentHash: createHash("sha256").update(imageBytes).digest("hex"), mimeType: "image/png", byteLength: imageBytes.length,
    width: 2, height: 2, payload: { encoding: "base64", data: imageBytes.toString("base64") } };
  imageFixture.program.graphicSpec.objects.item.properties.sources[1] = { ...imageFixture.program.graphicSpec.objects.item.properties.sources[1], type: "image", properties: { image, x: 10, y: 10, width: 20, height: 20 } };
  fixtures.push(imageFixture);
  const context = await browser.newContext({ deviceScaleFactor: ratio });
  try {
    const opened = await openBrowserPage(context, server.baseUrl, { waitFor: () => document.querySelector("#status").textContent === "Ready" });
    const results = await opened.page.evaluate(async ({ fixtures, ratio }) => {
      const { render, renderToSVG, prepareFontRendering, prepareImageRendering, prepareShadowRendering, serializeGraphic, deserializeGraphic } = await import("/render.js");
      const createCanvas = (w, h) => { const c = document.createElement("canvas");c.width = w;c.height = h;return c; };
      const decode = async ({ bytes, mimeType }) => { const image = await createImageBitmap(new Blob([bytes], { type: mimeType }));return { image, width: image.width, height: image.height, originClean: true }; };
      const register = async request => {
        const face = new FontFace(request.family, request.bytes, { style: request.style, weight: String(request.weight) });await face.load();document.fonts.add(face);
        return { contentHash: request.contentHash, family: request.family, style: request.style, weight: request.weight, metricsProviderVersion: request.metricsProviderVersion, dispose() { document.fonts.delete(face); } };
      };
      const results = [];
      for (const { kind, program, checks } of fixtures) {
        const p = deserializeGraphic(serializeGraphic(program)), fonts = await prepareFontRendering(p, { register }), images = await prepareImageRendering(p, { decode }), shadows = await prepareShadowRendering(p, { createCanvas, decode, fonts, pixelRatio: ratio });
        try {
          const canvas = document.querySelector("canvas");render(p, canvas.getContext("2d"), { pixelRatio: ratio, fonts, images, shadows });
          const svg = renderToSVG(p, { shadows }), image = new Image();image.src = `data:image/svg+xml,${encodeURIComponent(svg)}`;await image.decode();
          const svgCanvas = createCanvas(80 * ratio, 80 * ratio);svgCanvas.getContext("2d").drawImage(image, 0, 0, svgCanvas.width, svgCanvas.height);
          const samples = c => checks.map(({ point: [x, y] }) => [...c.getContext("2d").getImageData(x * ratio + Math.floor(ratio / 2), y * ratio + Math.floor(ratio / 2), 1, 1).data]);
          results.push({ kind, canvas: samples(canvas), svg: samples(svgCanvas), physical: [canvas.width, canvas.height] });
        } finally { shadows.dispose();fonts.dispose(); }
      }
      document.querySelector("#status").textContent = "Complete";return results;
    }, { fixtures, ratio });
    for (let i = 0; i < results.length; i++) {
      assert.deepEqual(results[i].physical, [80 * ratio, 80 * ratio]);
      for (const backend of ["canvas", "svg"]) fixtures[i].checks.forEach(({ rgba, tolerance }, j) => {
        assert.ok(results[i][backend][j].every((value, channel) => Math.abs(value - rgba[channel]) <= tolerance), `${results[i].kind} ${backend}: ${results[i][backend][j]} vs ${rgba}`);
      });
    }
    assertNoBrowserErrors(opened.errors, "Weighted blends");assert.equal(await opened.page.locator("#status").textContent(), "Complete");await opened.page.close();
  } catch (error) { await saveBrowserEvidence(browser, error);throw error; }
  finally { await context.close(); }
});
