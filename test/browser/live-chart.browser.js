import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence } from "../support/browser.js";
import { startStaticServer } from "../support/static-server.js";

let browser, server;
test.before(async () => { server = await startStaticServer(fileURLToPath(new URL("../../", import.meta.url)), { dependencies: "repository" }); browser = await chromium.launch({ headless: true }); });
test.after(async () => { await closeBrowserWithEvidence(browser); await server?.close(); });

for (const ratio of [1, 2]) test(`live charts draw, tooltip, brush, zoom and animate with real input at DPR ${ratio}`, async () => {
  const context = await browser.newContext({ deviceScaleFactor: ratio, viewport: { width: 800, height: 600 } });
  try {
    const { page, errors } = await openBrowserPage(context, new URL("examples/inspect-chart/", server.baseUrl).href,
      { waitFor: () => window.__inspectionSessions?.length === 2 });
    await page.evaluate(async () => {
      window.__inspectionSessions.forEach(session => session.destroy());
      document.body.innerHTML = '<canvas id="live" style="touch-action:none"></canvas>';
      const { chart } = await import("/src/live.js");
      const rows = [{ id: "a", x: 1, y: 2 }, { id: "b", x: 3, y: 4 }, { id: "c", x: 5, y: 1 }];
      window.__selected = [];
      window.__live = chart().addCanvas(document.querySelector("#live"))
        .createCanvas({ width: 300, height: 200, margin: 20 })
        .createData({ id: "rows", keyField: "id", values: rows }).createPointMark({ id: "points" }).encodePointRadius({ value: 6 })
        .encodeX({ field: "x", scale: { id: "x", domain: [0, 6], nice: false } }).encodeY({ field: "y", scale: { id: "y", domain: [0, 5], nice: false } })
        .addTooltip({ fields: ["id", "x"] }).addBrush().addZoom();
      window.__live.on("select", event => window.__selected.push(event.selected.points?.map(fields => fields.id) ?? []));
    });
    const box = await page.locator("#live").boundingBox();
    assert.equal(Math.round(box.width), 300); assert.equal(Math.round(box.height), 200);
    const at = (x, y) => ({ x: box.x + 20 + x / 6 * 260, y: box.y + 180 - y / 5 * 160 });
    const pixel = await page.evaluate(ratio => {
      const canvas = document.querySelector("#live"), context = canvas.getContext("2d");
      return { width: canvas.width, painted: context.getImageData(0, 0, canvas.width, canvas.height).data.some((value, index) => index % 4 === 3 && value > 0) };
    }, ratio);
    assert.equal(pixel.width, 300 * ratio); assert.equal(pixel.painted, true);
    // Hover shows the item's fields as text.
    const b = at(3, 4); await page.mouse.move(b.x, b.y);
    await page.waitForFunction(() => document.querySelector('[role="tooltip"]')?.style.display === "block");
    assert.equal(await page.evaluate(() => document.querySelector('[role="tooltip"]').textContent), "id: b\nx: 3");
    // A real drag brushes a and b.
    const start = at(0.5, 4.5), end = at(3.5, 1.5);
    await page.mouse.move(start.x, start.y); await page.mouse.down(); await page.mouse.move(end.x, end.y, { steps: 6 }); await page.mouse.up();
    await page.waitForFunction(() => window.__selected.length > 0);
    assert.deepEqual(await page.evaluate(() => window.__selected.at(-1)), ["a", "b"]);
    // A wheel step zooms around the pointer.
    const center = at(3, 2.5); await page.mouse.move(center.x, center.y); await page.mouse.wheel(0, -100);
    const domain = await page.evaluate(() => window.__live.program.resolvedScales.x.domain);
    assert.ok(domain[1] - domain[0] < 6);
    // Data changes animate with real animation frames, then commit.
    await page.evaluate(() => window.__live.setData([{ id: "a", x: 2, y: 2 }, { id: "b", x: 4, y: 3 }], { duration: 120 }));
    assert.deepEqual(await page.evaluate(() => window.__live.program.semanticSpec.datasets.at(-1).values.map(row => row.x)), [2, 4]);
    assert.equal(await page.evaluate(() => window.__live.pendingError), null);
    await page.evaluate(() => window.__live.dispose());
    assertNoBrowserErrors(errors);
  } finally { await context.close(); }
});
