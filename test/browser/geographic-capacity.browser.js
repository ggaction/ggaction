import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { startStaticServer } from "../support/static-server.js";
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence, saveBrowserEvidence } from "../support/browser.js";
const root = fileURLToPath(new URL("../../", import.meta.url));
let server, browser;
test.before(async () => { server = await startStaticServer(root, { dependencies: "repository" }); browser = await chromium.launch({ headless: true }); });
test.after(async () => { await closeBrowserWithEvidence(browser); await server?.close(); });
for (const ratio of [1, 2]) test(`explicit geographic capacity preserves all 100000 vertices in browser Canvas and SVG at DPR ${ratio}`, { timeout: 180000 }, async () => {
  const context = await browser.newContext({ deviceScaleFactor: ratio });
  try {
    const opened = await openBrowserPage(context, `${server.baseUrl}examples/browser-host/?chart=geographic-marks`, { waitFor: () => window.__ggactionExample !== undefined });
    const result = await opened.page.evaluate(async ratio => {
      const { chart, render } = await import("/src/index.js"), { renderToSVG } = await import("/src/renderers/svg.js");
      const { createTransitionScene, renderTransitionScene } = await import("/src/scene.js");
      const { serializeGraphic, deserializeGraphic } = await import("/src/persistence.js");
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
      return { count, commands: commands.length, maxError, mismatches, ink, svgInk, sameSVG, width: native.width, height: native.height, sceneCommands: scene.nodes.find(n => n.type === "path").properties.commands.length };
    }, ratio);
    assert.equal(result.commands, 199999); assert.equal(result.sceneCommands, 199999); assert.ok(result.maxError < 1e-9);
    assert.equal(result.mismatches, 0); assert.equal(result.sameSVG, true); assert.ok(result.ink > 1000); assert.ok(result.svgInk > 1000);
    assert.equal(result.width, 400 * ratio); assert.equal(result.height, 400 * ratio);
    assertNoBrowserErrors(opened.errors, `Geographic capacity DPR ${ratio}`); await opened.page.close();
  } catch (error) { await saveBrowserEvidence(browser, error); throw error; }
  finally { await context.close(); }
});
