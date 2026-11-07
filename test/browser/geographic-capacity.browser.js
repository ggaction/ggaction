import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { startStaticServer } from "../support/static-server.js";
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence, saveBrowserEvidence } from "../support/browser.js";
const root = fileURLToPath(new URL("../../", import.meta.url));
let server, browser, directory;
let installed = process.env.GGACTION_GEOGRAPHIC_PACKAGE_ROOT;
test.before(async () => {
  if (installed) {
    installed = await realpath(installed);
    directory = await mkdtemp(path.join(tmpdir(), "ggaction-geographic-capacity-"));
    const entries = { "index.js": ["chart", "render"], "renderers/svg.js": ["renderToSVG"],
      "scene.js": ["createTransitionScene", "renderTransitionScene"], "persistence.js": ["serializeGraphic", "deserializeGraphic"] };
    const contents = Object.entries(entries).map(([file, names]) => `export {${names.join(",")}} from ${JSON.stringify(path.join(installed, "src", file))};`).join("\n");
    const bundle = await build({ stdin: { contents, resolveDir: root }, bundle: true, minify: true, platform: "browser", format: "esm", write: false, metafile: true });
    const inputs = Object.keys(bundle.metafile.inputs).map(name => path.resolve(root, name));
    assert.ok(inputs.every(name => !name.startsWith(path.join(root, "src") + path.sep)));
    assert.ok(inputs.includes(path.join(installed, "src", "index.js")));
    assert.ok(inputs.every(name => !name.includes("/renderers/png") && !name.includes("/renderers/pdf")));
    await writeFile(path.join(directory, "frame.js"), bundle.outputFiles[0].contents);
    await writeFile(path.join(directory, "index.html"), '<!doctype html><html lang="en"><title>Geographic capacity</title><link rel="icon" href="data:,"><p id="status">Ready</p><canvas aria-label="Geographic capacity"></canvas></html>');
    server = await startStaticServer(directory);
  } else server = await startStaticServer(root, { dependencies: "repository" });
  browser = await chromium.launch({ headless: true });
});
test.after(async () => { await closeBrowserWithEvidence(browser); await server?.close(); if (directory) await rm(directory, { recursive: true, force: true }); });
for (const ratio of [1, 2]) test(`explicit geographic capacity preserves all 100000 vertices in browser Canvas and SVG at DPR ${ratio}`, { timeout: 180000 }, async () => {
  const context = await browser.newContext({ deviceScaleFactor: ratio });
  try {
    const opened = await openBrowserPage(context, installed ? server.baseUrl : `${server.baseUrl}examples/browser-host/?chart=geographic-marks`,
      { waitFor: installed ? () => document.querySelector("#status").textContent === "Ready" : () => window.__ggactionExample !== undefined });
    if (installed) { await opened.page.evaluate(async () => { globalThis.geographic = await import("/frame.js"); }); await context.setOffline(true); }
    const result = await opened.page.evaluate(async ({ ratio, installed }) => {
      const { chart, render } = installed ? globalThis.geographic : await import("/src/index.js");
      const { renderToSVG } = installed ? globalThis.geographic : await import("/src/renderers/svg.js");
      const { createTransitionScene, renderTransitionScene } = installed ? globalThis.geographic : await import("/src/scene.js");
      const { serializeGraphic, deserializeGraphic } = installed ? globalThis.geographic : await import("/src/persistence.js");
      let networkCalls = 0; if (installed) globalThis.fetch = () => { networkCalls++; throw Error("offline"); };
      const count = 100000, coordinates = Array.from({ length: count }, (_, i) => [-30 + 60 * i / (count - 1), (i % 2 ? 1 : -1) * 5]);
      const p = chart().createCanvas({ width: 400, height: 400, margin: 20, plotBorder: false })
        .createGeometryData({ id: "world", format: "geojson", coordinateKind: "geographic", values: { type: "FeatureCollection", features: [{ type: "Feature", id: "line", properties: {}, geometry: { type: "LineString", coordinates } }] } })
        .createProjection({ id: "map", type: "equirectangular", scalePx: 100, translatePx: [200, 200], precisionPx: .5 }).createCoordinate({ type: "geo" })
        .createGeoLineMark({ id: "coast", stroke: "#2563eb", strokeWidth: 2, capacity: { maxProjectedPoints: 200000, maxPathCommands: 200000 } });
      const commands = p.graphicSpec.objects.coast.items[0].properties.commands;
      let maxError = 0;
      for (let i = 0; i < commands.length; i++) {
        if (commands[i].op !== (i ? "L" : "M")) throw Error("Unexpected command topology");
        const longitude = -30 + 60 * (i / 2) / (count - 1), latitude = i % 2 ? 0 : ((i / 2) % 2 ? 5 : -5);
        maxError = Math.max(maxError, Math.abs(commands[i].x - (200 + 100 * longitude * Math.PI / 180)), Math.abs(commands[i].y - (200 - 100 * latitude * Math.PI / 180)));
      }
      const graphic = deserializeGraphic(serializeGraphic(p)), scene = createTransitionScene(graphic, { format: "canvas" });
      const native = document.createElement("canvas"), replay = document.createElement("canvas");
      render(p, native.getContext("2d"), { pixelRatio: ratio }); renderTransitionScene(scene, replay.getContext("2d"), { pixelRatio: ratio });
      const a = native.getContext("2d").getImageData(0, 0, native.width, native.height).data, b = replay.getContext("2d").getImageData(0, 0, replay.width, replay.height).data;
      let mismatches = 0, ink = 0;
      for (let i = 0; i < a.length; i++) { if (a[i] !== b[i]) mismatches++; if (i % 4 !== 3 && a[i] < 200) ink++; }
      const svg = renderToSVG(graphic), sameSVG = svg === renderToSVG(p), image = new Image();
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`; await image.decode();
      const svgCanvas = document.createElement("canvas"); svgCanvas.width = 400 * ratio; svgCanvas.height = 400 * ratio;
      const ctx = svgCanvas.getContext("2d"); ctx.drawImage(image, 0, 0, svgCanvas.width, svgCanvas.height);
      const pixels = ctx.getImageData(0, 0, svgCanvas.width, svgCanvas.height).data;
      let svgInk = 0; for (let i = 0; i < pixels.length; i++) if (i % 4 !== 3 && pixels[i] < 200) svgInk++;
      return { networkCalls, count, commands: commands.length, maxError, mismatches, ink, svgInk, sameSVG, width: native.width, height: native.height, sceneCommands: scene.nodes.find(n => n.type === "path").properties.commands.length };
    }, { ratio, installed: Boolean(installed) });
    assert.equal(result.networkCalls, 0);
    assert.equal(result.commands, 199999); assert.equal(result.sceneCommands, 199999); assert.ok(result.maxError < 1e-9);
    assert.equal(result.mismatches, 0); assert.equal(result.sameSVG, true); assert.ok(result.ink > 1000); assert.ok(result.svgInk > 1000);
    assert.equal(result.width, 400 * ratio); assert.equal(result.height, 400 * ratio);
    assertNoBrowserErrors(opened.errors, `Geographic capacity DPR ${ratio}`); await opened.page.close();
  } catch (error) { await saveBrowserEvidence(browser, error); throw error; }
  finally { await context.close(); }
});
