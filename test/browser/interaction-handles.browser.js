import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence, saveBrowserContextEvidence } from "../support/browser.js";
import { startStaticServer } from "../support/static-server.js";
let browser, server;
test.before(async () => { server = await startStaticServer(fileURLToPath(new URL("../../", import.meta.url)), { dependencies: "repository" }); browser = await chromium.launch({ headless: true }); });
test.after(async () => { await closeBrowserWithEvidence(browser); await server?.close(); });

for (const ratio of [1, 2]) for (const backend of ["canvas", "svg"]) test(`selection and category handles share mouse, touch and keyboard native edits in ${backend} at DPR ${ratio}`, async () => {
  const context = await browser.newContext({ deviceScaleFactor: ratio, hasTouch: true, viewport: { width: 1100, height: 1000 } });
  try {
    const { page, errors } = await openBrowserPage(context, new URL("examples/inspect-chart/", server.baseUrl).href,
      { waitFor: () => window.__handleSessions?.length === 4 });
    const view = page.locator(`.handle-view[data-kind="resize"][data-backend="${backend}"]`);
    await view.scrollIntoViewIfNeeded(); const box = await view.boundingBox();
    const read = () => page.evaluate(backend => {
      const session = window.__handleSessions.find(value => value.kind === "resize" && value.backend === backend).session, s = session.getState();
      return { range: s.program.semanticSpec.resources.find(r => r.id === "window").options.predicate.region.x.ranges[0], history: s.history.undoCount,
        handles: session.getSelectionHandles().handles, graphic: s.program.graphicSpec, preview: s.previewProgram !== null };
    }, backend);
    const initial = await read(), maximum = initial.handles.find(handle => handle.handle === "x-max").point;
    await page.mouse.move(box.x + maximum.x, box.y + maximum.y); await page.mouse.down();
    await page.mouse.move(box.x + 294, box.y + maximum.y, { steps: 6 }); await page.mouse.up();
    const mouse = await read(); assert.equal(mouse.range.max, 8); assert.equal(mouse.history, 1); assert.equal(mouse.preview, false);
    assert.equal(await view.locator('[data-handle="x-max"]').getAttribute("aria-valuenow"), "8");
    await page.evaluate(backend => window.__handleSessions.find(value => value.kind === "resize" && value.backend === backend).session.dispatch({ type: "undo" }), backend);
    await view.locator('[data-handle="x-max"]').focus(); await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowRight");
    assert.deepEqual((await read()).range, mouse.range); assert.deepEqual((await read()).graphic, mouse.graphic);
    await page.evaluate(backend => { const s = window.__handleSessions.find(value => value.kind === "resize" && value.backend === backend).session; s.dispatch({ type: "undo" }); s.dispatch({ type: "undo" }); }, backend);
    const cdp = await context.newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: box.x + maximum.x + 5, y: box.y + maximum.y, id: 1 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: box.x + 294, y: box.y + maximum.y, id: 1 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    assert.deepEqual((await read()).range, mouse.range); assert.deepEqual((await read()).graphic, mouse.graphic);
    const latest = (await read()).handles.find(handle => handle.handle === "x-max").point;
    await page.mouse.move(box.x + latest.x, box.y + latest.y); await page.mouse.down(); await page.mouse.move(box.x + 310, box.y + latest.y);
    await page.keyboard.press("Escape"); await page.mouse.up(); assert.deepEqual((await read()).graphic, mouse.graphic);
    const category = page.locator(`.handle-view[data-kind="reorder"][data-backend="${backend}"]`);
    await category.scrollIntoViewIfNeeded(); const categoryBox = await category.boundingBox();
    const label = await page.evaluate(backend => window.__handleSessions.find(value => value.kind === "reorder" && value.backend === backend).session.getState().program.graphicSpec.objects.xAxisLabels.items[0].properties, backend);
    await page.mouse.move(categoryBox.x + label.x, categoryBox.y + label.y); await page.mouse.down(); await page.mouse.move(categoryBox.x + 385, categoryBox.y + label.y, { steps: 6 }); await page.mouse.up();
    const order = () => page.evaluate(backend => window.__handleSessions.find(value => value.kind === "reorder" && value.backend === backend).session.getState().program.resolvedScales.x.domain, backend);
    assert.deepEqual(await order(), ["B", "C", "A"]);
    await page.evaluate(backend => window.__handleSessions.find(value => value.kind === "reorder" && value.backend === backend).session.dispatch({ type: "undo" }), backend);
    await category.locator("..").getByRole("button", { name: "Move category A; use left or right arrow", exact: true }).focus();
    await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowRight"); assert.deepEqual(await order(), ["B", "C", "A"]);
    await page.evaluate(() => window.__handleSessions.forEach(({ session }) => session.destroy()));
    assertNoBrowserErrors(errors, "selection handles"); await page.close();
  } catch (error) { await saveBrowserContextEvidence(context, error); throw error; }
  finally { await context.close(); }
});
