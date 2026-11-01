import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { startStaticServer } from "../support/static-server.js";
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence, saveBrowserEvidence } from "../support/browser.js";
const root = fileURLToPath(new URL("../../", import.meta.url)); let server, browser;
test.before(async () => { server = await startStaticServer(root, { dependencies: "repository" }); browser = await chromium.launch({ headless: true }); });
test.after(async () => { await closeBrowserWithEvidence(browser); await server?.close(); });
for (const ratio of [1, 2]) test(`route geography preserves browser Canvas/SVG and current hit at DPR ${ratio}`, async () => {
  const context = await browser.newContext({ deviceScaleFactor: ratio });
  try {
    const opened = await openBrowserPage(context, `${server.baseUrl}examples/browser-host/?chart=geographic-marks`, { waitFor: () => window.__ggactionExample !== undefined });
    const result = await opened.page.evaluate(async ratio => {
      const { chart, render } = await import("/src/index.js"), { renderToSVG } = await import("/src/renderers/svg.js"),
        { createInteractionSession } = await import("/src/interaction.js"), { getMarkItems } = await import("/src/inspection.js");
      const base = chart().createCanvas({ width: 240, height: 180, margin: 0, background: "white" })
        .createData({ id: "nodes", values: [{ k: "a" }, { k: "b" }] }).createData({ id: "edges", values: [{ k: "ab", s: "a", t: "b" }] })
        .createGraphData({ id: "graph", nodes: "nodes", edges: "edges", nodeKey: "k", edgeKey: "k", source: "s", target: "t" })
        .layoutGraph({ id: "layout", method: "fixed", options: { positions: [{ key: "a", x: 170, y: 10 }, { key: "b", x: -170, y: 10 }] } })
        .bundleGraphEdges({ id: "routes", method: "edge-path" }).createGeoRouteData({ id: "mapped", routes: "routes", coordinateKind: "geographic" })
        .createGeometryData({ id: "plain", format: "geojson", coordinateKind: "geographic", values: { type: "LineString", coordinates: [[170, 10], [-170, 10]] } })
        .createProjection({ id: "map", type: "equirectangular", scalePx: 30, translatePx: [120, 90] }).createCoordinate({ type: "geo" });
      const programs = ["mapped", "plain"].map(geometry => base.createGeoLineMark({ id: "lines", geometry, strokeWidth: 4, stroke: "#2563eb" })), backends = [];
      for (const backend of ["Canvas", "SVG"]) {
        const outputs = [];
        for (const p of programs) {
          const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d");
          if (backend === "Canvas") render(p, ctx, { pixelRatio: ratio });
          else { canvas.width = 240 * ratio; canvas.height = 180 * ratio; const image = new Image(); image.src = `data:image/svg+xml,${encodeURIComponent(renderToSVG(p))}`; await image.decode(); ctx.drawImage(image, 0, 0, canvas.width, canvas.height); }
          outputs.push(ctx.getImageData(0, 0, canvas.width, canvas.height).data);
        }
        backends.push({ backend, mismatches: outputs[0].reduce((n, value, i) => n + (value !== outputs[1][i]), 0), ink: outputs[0].filter((v, i) => i % 4 === 0 && v < 100).length });
      }
      const p = programs[0], path = p.graphicSpec.objects.lines.items[0].properties.commands;
      const s = createInteractionSession({ program: p }); s.dispatch({ type: "inspect", point: { x: (path[0].x + path[1].x) / 2, y: (path[0].y + path[1].y) / 2 }, slop: 0 });
      const hit = s.getState().hit.target, item = getMarkItems(p)[0]; s.destroy();
      return { backends, owner: hit.ownerId, exactKey: hit.itemKey === item.key, rows: item.rows.map(r => [r.data, r.index]), parts: p.graphicSpec.objects.lines.items.length };
    }, ratio);
    for (const backend of result.backends) { assert.equal(backend.mismatches, 0); assert.ok(backend.ink > 0); }
    assert.equal(result.owner, "lines"); assert.equal(result.exactKey, true); assert.equal(result.parts, 2); assert.deepEqual(result.rows, [["edges", 0]]);
    assertNoBrowserErrors(opened.errors, "Geographic routes"); await opened.page.close();
  } catch (error) { await saveBrowserEvidence(browser, error); throw error; } finally { await context.close(); }
});
